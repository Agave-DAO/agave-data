import fs from "fs";
import { erc20, IncentivesContract } from "./web3.js";
import addresses from "./contract-addresses.js";
import { fetchAllUsers } from "./subgraph-queries.js";
import dotenv from "dotenv";
dotenv.config();

function sleep(ms) {
  return new Promise( res => setTimeout(res, ms));
}

let stream = fs.createWriteStream("user-balances.json", { flags: "a" });

async function write_userBalances(data) {
  const users = await fetchAllUsers();
  console.log(users.length);
  await getUserBalances(users);
}

let userBalances = [];

async function getUserBalances(users) {
  const finished = await iterativeWeb3Query(users);
  if (finished) {
    return userBalances;
  }
}

let lines = 0;

async function getUserBalance(user) {
  let multipleBalances = {};

  let getBalanceForToken = async t => {
    while (true) {
      try {
        return await t.balanceOf(user,{blockTag:process.env.BLOCK});
      }
      catch (e) {
        console.log(e.message);
        await sleep(2000);
      }
    }
  }
  for (let token in addresses.tokens) {
    let agToken = erc20(addresses.tokens[token].agToken);
    let varToken = erc20(addresses.tokens[token].varDebt);
    let stbToken = erc20(addresses.tokens[token].stbDebt);
    let agTokenBalance = await getBalanceForToken(agToken);
    let varTokenBalance = await getBalanceForToken(varToken);
    let stbTokenBalance = await getBalanceForToken(stbToken);
    multipleBalances[`ag${token}`] = agTokenBalance.toString();
    multipleBalances[`var${token}`] = varTokenBalance.toString();
    multipleBalances[`stb${token}`] = stbTokenBalance.toString();
  }
  return multipleBalances;
}

async function iterativeWeb3Query(users) {
  let i = 0;
  for (const userData of users) {
    const user = userData.id;
    let multipleBalances = await getUserBalance(user);
    console.log(i++, " <> ", user, " <> ", lines);
    stream.write(
      JSON.stringify({
        user: user,
        balances: multipleBalances,
      }) + ",\n",
      function (error) {
        if (!error) {
          // If the string was appended successfully:
          lines++; // Report back there was no error
        }
      }
    );

    await sleep(100);
  }

  return true;
}

try {
  write_userBalances();
} catch (err) {
  console.log(err);
}