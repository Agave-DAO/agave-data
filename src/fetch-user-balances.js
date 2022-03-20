import fetch from "node-fetch";
import fs from "fs";
import { erc20, IncentivesContract } from "./web3.js";
import addresses from "./contract-addresses.js";
import BigNumber from "ethers";
import { fetchAllUsers } from "./subgraph-queries.js";

function sleep(delay) {
  var start = new Date().getTime();
  while (new Date().getTime() < start + delay);
}

let stream = fs.createWriteStream("user-balances.json", { flags: "a" });

async function write_userBalances(data) {
  const users = await fetchAllUsers();
  console.log(users.length);
  await getUserBalances(users);
}

let userBalances = [];

async function getUserBalances(users) {
  const finished = await recursiveWeb3Query(users, 0);
  if (finished) {
    return userBalances;
  }
}

let lines = 0;

async function recursiveWeb3Query(users, i) {
  let user = users[i].id;
  let multipleBalances = {};
  for (let token in addresses.tokens) {
    let agToken = erc20(addresses.tokens[token].agToken);
    let varToken = erc20(addresses.tokens[token].varDebt);
    let stbToken = erc20(addresses.tokens[token].stbDebt);
    let agTokenBalance = await agToken.balanceOf(user);
    let varTokenBalance = await varToken.balanceOf(user);
    let stbTokenBalance = await stbToken.balanceOf(user);
    multipleBalances[`ag${token}`] = agTokenBalance.toString();
    multipleBalances[`var${token}`] = varTokenBalance.toString();
    multipleBalances[`stb${token}`] = stbTokenBalance.toString();
  }
  console.log(i, " <> ", user, " <> ", lines);
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
  if (users.length === lines) stream.end();
  sleep(500);
  recursiveWeb3Query(users, i + 1);
}

try {
  write_userBalances();
} catch (err) {
  console.log(err);
}
