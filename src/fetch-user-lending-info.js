import fs from "fs";
import util from "util";
import dotenv from "dotenv";
dotenv.config();

import { dataProvider, erc20, lendingPool, UiProvider } from "./web3.js";
import addresses from "./contract-addresses.js";
import { fetchAllUsers } from "./subgraph-queries.js";

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

async function write_userInfo() {
  const users = await fetchAllUsers();
  console.log(users.length, " users");
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
  let skipFlag = false;

  let getUserReservesData = async () => {
    while (true) {
      try {
        return await UiProvider.getReservesData(user, {
          blockTag: blockTarget,
        });
      } catch (e) {
        console.log(e.message);
        await sleep(200);
      }
    }
  };
  let getUserAccountData = async () => {
    while (true) {
      try {
        return await lendingPool.getUserAccountData(user, {
          blockTag: blockTarget, 
        });
      } catch (e) {
        console.log(e.message);
        await sleep(200);
      }
    }
  };
  await getUserAccountData().then((x) => {
    if (
      x[5].toString() ===
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    ) {
      skipFlag = true;
    } else {
      multipleAccountData[`totalCollateralETH`] = x[0].toString();
      multipleAccountData[`totalDebtETH`] = x[1].toString();
      multipleAccountData[`availableBorrowsETH`] = x[2].toString();
      multipleAccountData[`currentLiquidationThreshold`] = x[3].toString();
      multipleAccountData[`ltv`] = x[4].toString();
      multipleAccountData[`healthFactor`] = x[5].toString();
      if (x[5] < 1e18 && x[1] >5e16){
        console.log(user, " | healthFactor >",x[5].toString(), " | totalDebt >", x[1]/1e18);
      }
    }
  });
  if (skipFlag) {
    return false;
  }
  /*
  struct UserReserveData {
  0  address underlyingAsset;
  1  uint256 scaledATokenBalance;
  2  bool usageAsCollateralEnabledOnUser;
  3  uint256 stableBorrowRate;
  4  uint256 scaledVariableDebt;
  5  uint256 principalStableDebt;
  6  uint256 stableBorrowLastUpdateTimestamp;
  }*/

  await getUserReservesData().then((x) => {
    for (let i = 0; i < x[0].length; i++) {
      let token = x[0][i][2].toString().slice(2);
      multipleAccountData[`${token}:usageAsCollateralEnabled`] =
        x[1][i][2].toString();
      multipleAccountData[`${token}:agBalance`] = x[1][i][1].toString();
      multipleAccountData[`${token}:scaledVariableDebt`] =
        x[1][i][4].toString();
      multipleAccountData[`${token}:principalStableDebt`] =
        x[1][i][5].toString();
      multipleAccountData[`${token}:stableBorrowRate`] = x[1][i][3].toString();
    }
    // console.log("tokenData: ", user);
  });
  let incomplete = true;
  while (incomplete) {
    try {
      if (
        Object.keys(multipleAccountData).length ===
        Object.keys(addresses.tokens).length * 5 + 6
      ) {
        incomplete = false;
      }
      throw "not yet";
    } catch (e) {
      await sleep(50);
    }
  }
  return multipleAccountData;
}

 async function iterativeWeb3Query(users) {
  let data = 0;
  stream.write("[\n", function (error) {});
  while (users[data]) {
    const user = users[data].id;
    data++;
    await getUserAccountData(user).then(x => {
      if (!x) return;
      let text = JSON.stringify({
        user: user,
        ...x,
      });
      if (users.length > data) {
        text = text + ",\n";
      }
      handleUserData(text);
    });
    if(data % 1000 === 0)
      console.log(data , " / ", users.length)
  }
  stream.write("\n]", function (error) {});
  console.log(lines, " users with debt");
  return true;
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
  write_userInfo();
} catch (err) {
  console.log(err);
}
