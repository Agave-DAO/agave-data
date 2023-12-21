import fs from "fs";
import util from "util";
import dotenv from "dotenv";
dotenv.config();

import { getBatchStkAGVE_rewards } from "./web3.js";
import { holders } from "./helpers/stkAGVE-holders.js";

let blockTarget =
  process.env.BLOCK !== "latest"
    ? Number(process.env.BLOCK)
    : process.env.BLOCK;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}


fs.truncate("user-stkAGVE-info.json", 0, function () {
  console.log("cleared-file");
});

let stream = fs.createWriteStream("user-stkAGVE-info.json", { flags: "a" });

let lines = 0;

const multicallSize = 500;

let totalUsers = 0;
let totalUnclaimed = 0n;
async function fetchUsers() {
  totalUsers = holders.length;
  await loopAssetMulticall(holders);
}

async function fetchMulticallData(users) {
  let userInfo = [];
  const accountData = await getBatchStkAGVE_rewards(users);
  for (let n = 0; n < users.length; n++) {
    let multipleAccountData = {};
    const x = accountData[n].result;
    multipleAccountData['user'] = users[n];
    multipleAccountData[`unclaimedRewards`] = x.toString();
    totalUnclaimed += x;
    userInfo.push(multipleAccountData);
  }
  return userInfo;
}

async function loopAssetMulticall(users) {
  let tempUsers = [];
  stream.write("[\n", function (error) { });
  for (let i = 0; i < users.length; i++) {
    tempUsers.push(users[i][0]);
    if (tempUsers.length >= multicallSize || i + 1 === users.length) {
      await fetchMulticallData(tempUsers).then((info) => {
        writeData(info);
      });
      let x = [];
      tempUsers = x;
    }
    if (i % multicallSize === 0) console.log(i, " / ", users.length);
  }
  console.log("totalUsers", totalUsers, "\ntotalUnclaimed", totalUnclaimed);
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

880589441463954258966n