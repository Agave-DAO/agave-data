import fs from "fs";
import util from "util";
import { erc20 } from "./web3.js";
import addresses from "./contract-addresses.js";
import { fetchAllUsers } from "./subgraph-queries.js";
import 'dotenv/config';

let blockTarget = (process.env.BLOCK !== 'latest') ? Number(process.env.BLOCK) : process.env.BLOCK

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
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
                return await t.balanceOf(user, { blockTag: blockTarget });
            }
            catch (e) {
                console.log(e.message);
                await sleep(300);
            }
        }
    }

    async function tokenLoop(token) {
        let agToken = erc20(addresses.tokens[token].agToken);
        let agTokenBalance = getBalanceForToken(agToken);
        let varToken = erc20(addresses.tokens[token].varDebt);
        let varTokenBalance = getBalanceForToken(varToken);
        let stbToken = erc20(addresses.tokens[token].stbDebt);
        let stbTokenBalance = getBalanceForToken(stbToken);
        let incomplete = true ;
        while (incomplete) {
            try {         
                if (!util.inspect(agTokenBalance).includes("pending") && !util.inspect(varTokenBalance).includes("pending") &&  !util.inspect(stbTokenBalance).includes("pending")) {
                    agTokenBalance.then(x => multipleBalances[`ag${token}`] =  x.toString())  
                    varTokenBalance.then(x => multipleBalances[`var${token}`] =  x.toString())
                    stbTokenBalance.then(x => multipleBalances[`stb${token}`] =  x.toString())                  
                    incomplete = false
                }
                throw 'not yet'
            }
            catch (e) {
                await sleep(100);
            }
        }   
    }

    for (let token in addresses.tokens) {
        tokenLoop(token)  
    }   
    console.time('up');
    let incomplete = true ;
        while (incomplete) {
            try {         
                if (Object.keys(multipleBalances).length ===  Object.keys(addresses.tokens).length*3) {        
                    incomplete = false
                }
                throw 'not yet'
            }
            catch (e) {
                await sleep(200);
            }
        }   
        console.timeEnd('up');
    return multipleBalances;
}

async function iterativeWeb3Query(users) {
    let i = 0;
    for (const userData of users) {
        const user = userData.id;
        let multipleBalances = await getUserBalance(user);
        console.log(i++, " <> ", user);
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