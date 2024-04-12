import fs from "fs";
import util from "util";
import dotenv from "dotenv";
dotenv.config();

import { getBatchAccountData, getBatchReservesData } from "./web3.js";
import { fetchAllUsers } from "./subgraph-queries.js";
import { skaleEuropa } from "viem/chains";

let blockTarget =
  process.env.BLOCK !== "latest"
    ? Number(process.env.BLOCK)
    : process.env.BLOCK;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}


fs.truncate("user-lending-info.json", 0, function () {
  console.log("done");
});

let stream = fs.createWriteStream("user-lending-info.json", { flags: "a" });

let lines = 0;

const multicallSize = 500;

const assetSymbols = [
  "USDC",
  "WXDAI",
  "LINK",
  "GNO",
  "WBTC",
  "WETH",
  "FOX",
  "USDT",
  "EURe",
  "wstETH",
  "sDAI",
];

let totalUsers = 0;
async function fetchUsers() {
  const users = await fetchAllUsers();
  totalUsers = users.length;
  await loopAssetMulticall(users);
}

async function fetchMulticallData(users) {
  let userInfo = [];
  let accountData = await getBatchAccountData(users);
  let reservesData = await getBatchReservesData(users);
  if (!reservesData){
    await sleep(2500)
    reservesData = await getBatchReservesData(users);
  }
  if (!accountData && false){
    await sleep(2500)
    accountData = await getBatchAccountData(users)
  }
  await sleep(1200)
    for (let n = 0; n < users.length; n++) {
      let multipleAccountData = {};
      const x = accountData[n].result;
      const res = reservesData[n].result;
      multipleAccountData['user'] = users[n].id;
      multipleAccountData[`totalCollateralETH`] = Number(x? x[0] : 0)
      multipleAccountData[`totalDebtETH`] = Number(x? x[1] : 0)
      multipleAccountData[`availableBorrowsETH`] = Number(x? x[2] : 0)
      multipleAccountData[`currentLiquidationThreshold`] = Number(x? x[3] : 0)
      multipleAccountData[`ltv`] = Number(x? x[4] : 0) ;
      multipleAccountData[`healthFactor`] = Number(x? x[5] : 2);
      

      for (let i = 0; i < res.length; i++) {
        let token = assetSymbols[i];
        multipleAccountData[`${token}:usageAsCollateralEnabled`] =
          res[i].usageAsCollateralEnabled;
        multipleAccountData[`${token}:agBalance`] =
          Number(res[i].scaledATokenBalance);
        multipleAccountData[`${token}:scaledVariableDebt`] =
          Number(res[i].scaledVariableDebt);
        multipleAccountData[`${token}:principalStableDebt`] =
          Number(res[i].principalStableDebt);
      }

      if (multipleAccountData[`healthFactor`] < 1e18 && multipleAccountData[`totalDebtETH`] > 10e16) {
        console.log(
          users[n].id,
          " | healthFactor >",
          multipleAccountData[`healthFactor`],
          " | totalDebt >",
          multipleAccountData[`totalDebtETH`] / 1e18,
          " | isCollateralized:",
          (multipleAccountData[`totalDebtETH`] < multipleAccountData[`totalCollateralETH`] )
        );
      }
      userInfo.push(multipleAccountData);
    }
  return userInfo;
}

async function loopAssetMulticall(users) {
  let tempUsers = [];
  stream.write("[\n", function (error) { });
  for (let i = 0; i < users.length; i++) {
    tempUsers.push(users[i]);
    if (tempUsers.length >= multicallSize || i + 1 === users.length) {
      await fetchMulticallData(tempUsers).then((info) => {
        writeData(info);
      });
      let x = [];
      tempUsers = x;
    }
    if (i % 500 === 0) console.log(i, " / ", users.length);
  }
  stream.write("\n]", function (error) { });
}

async function writeData(userInfo) {
  let data = 0;
  while (userInfo[data]) {
    let text = JSON.stringify({
      ...userInfo[data],
    });
    data++;
    if (totalUsers > lines + data) {
      text = text + ",\n";
    }
    handleUserData(text);
  }
}

function handleUserData(text) {
  stream.write(text, function (error) {
    if (!error) {
      // If the string was appended successfully:
      lines++; // Report back there was no error
    }
  });
}

try {
  fetchUsers();
} catch (err) {
  console.log(err);
}
