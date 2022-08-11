import fs from "fs";
import util from "util";
import dotenv from 'dotenv'
dotenv.config()

import { dataProvider, erc20, lendingPool } from "./web3.js";
import addresses from "./contract-addresses.js";
import { fetchAllUsers } from "./subgraph-queries.js";

let blockTarget = (process.env.BLOCK !== 'latest') ? Number(process.env.BLOCK) : process.env.BLOCK

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

let stream = fs.createWriteStream("user-lending-info.json", { flags: "a" });

async function write_userInfo() {
    const users = await fetchAllUsers();
    console.log(users.length, ' users');
    await getUsersAccountData(users);
}

let userInfo = [];

async function getUsersAccountData(users) {
    const finished = await iterativeWeb3Query(users);
    if (finished) {
        return userInfo;
    }
}

let lines = 0;

async function getUserAccountData(user) {
    let multipleAccountData = {};

    let getUserReserveData = async reserve => {
        while (true) {
            try {
                return await dataProvider.getUserReserveData(reserve, user, { blockTag: blockTarget });
            }
            catch (e) {
                console.log(e.message);
                await sleep(200);
            }
        }
    }
    let getUserAccountData = async () => {
        while (true) {
            try {
                return await lendingPool.getUserAccountData(user, { blockTag: blockTarget });
            }
            catch (e) {
                console.log(e.message);
                await sleep(200);
            }
        }
    }
    let userAccountData = getUserAccountData();
    async function tokenLoop(token) {
        let reserveData = getUserReserveData(addresses.tokens[token].reserve);   
        let incomplete = true;
        while (incomplete) {
            try {
                if (!util.inspect(reserveData).includes("pending")) {
                    reserveData.then(x => {
                        multipleAccountData[`ag${token}Balance`] = x[0].toString()
                        multipleAccountData[`stable${token}Debt`] = x[1].toString()
                        multipleAccountData[`variable${token}Debt`] = x[2].toString()
                        multipleAccountData[`principalStable${token}Debt`] = x[3].toString()
                        multipleAccountData[`scaledVariable${token}Debt`] = x[4].toString()
                        multipleAccountData[`stableBorrowRate${token}`] = x[5].toString()
                        multipleAccountData[`liquidityRate${token}`] = x[6].toString()
                        multipleAccountData[`stableRateLastUpdated${token}`] = x[7].toString()
                        multipleAccountData[`usageAsCollateralEnabled${token}`] = x[8].toString()
                    })
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
    let incomplete = true;
    while (incomplete) {
        try {
            if (!util.inspect(userAccountData).includes("pending") && Object.keys(multipleAccountData).length === Object.keys(addresses.tokens).length * 9) {
                userAccountData.then(x =>{
                multipleAccountData[`totalCollateralETH`] = x[0].toString()
                multipleAccountData[`totalDebtETH`] = x[1].toString()
                multipleAccountData[`availableBorrowsETH`] = x[2].toString()
                multipleAccountData[`currentLiquidationThreshold`] = x[3].toString()
                multipleAccountData[`ltv`] = x[4].toString()
                multipleAccountData[`healthFactor`] = x[5].toString()
            })
                incomplete = false
            }
            throw 'not yet'
        }
        catch (e) {
            await sleep(200);
        }
    }
    return multipleAccountData;
}

async function iterativeWeb3Query(users) {
    let i = 0;
    for (const userData of users) {
        const user = userData.id;
      //  console.time('perUser');
        let multipleAccountData = await getUserAccountData(user);
        console.log(i++, " <> ", user);
       // console.timeEnd('perUser')
        stream.write(
            JSON.stringify({
                user: user,
                data: multipleAccountData,
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
    write_userInfo();
} catch (err) {
    console.log(err);
}