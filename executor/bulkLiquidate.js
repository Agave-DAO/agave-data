import dotenv from "dotenv";
import { users } from "../user-lending-info.js";
import {
  client,
  address,
  liquidate,
  liquidateDefault,
  getUserAccountData,
  myBalance,
  approve,
} from "./web3.js";

dotenv.config();

const assets = {
  "USDC": {
    reserve: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
    agtoken: "0x291B5957c9CBe9Ca6f0b98281594b4eB495F4ec1",
    vardebt: "0xa728C8f1CF7fC4d8c6d5195945C3760c87532724",
  },
  "WXDAI": {
    reserve: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
    agtoken: "0xd4e420bBf00b0F409188b338c5D87Df761d6C894",
    vardebt: "0xec72De30C3084023F7908002A2252a606CCe0B2c",
  },
  "LINK": {
    reserve: "0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2",
    agtoken: "0xa286Ce70FB3a6269676c8d99BD9860DE212252Ef",
    vardebt: "0x5b0568531322759EAB69269a86448b39B47e2AE8",
  },
  "GNO": {
    reserve: "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
    agtoken: "0xA26783eAd6C1f4744685c14079950622674ae8A8",
    vardebt: "0x99272C6E2Baa601cEA8212b8fBAA7920A9f916F0",
  },
  "WETH": {
    reserve: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
    agtoken: "0x44932e3b1E662AdDE2F7bac6D5081C5adab908c6",
    vardebt: "0x73Ada33D706085d6B93350B5e6aED6178905Fb8A",
  },
  "WBTC": {
    reserve: "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252",
    agtoken: "0x4863cfaF3392F20531aa72CE19E5783f489817d6",
    vardebt: "0x110C5A1494F0AB6C851abB72AA2efa3dA738aB72",
  },
  "FOX": {
    reserve: "0x21a42669643f45Bc0e086b8Fc2ed70c23D67509d",
    agtoken: "0xA916A4891D80494c6cB0B49b11FD68238AAaF617",
    vardebt: "0x7388cbdeb284902E1e07be616F92Adb3660Ed3a4",
  },
  "USDT": {
    reserve: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
    agtoken: "0x5b4Ef67c63d091083EC4d30CFc4ac685ef051046",
    vardebt: "0x474f83d77150bDDC6a6F34eEe4F5574EAfD05938",
  },
  "EURe": {
    reserve: "0xcB444e90D8198415266c6a2724b7900fb12FC56E",
    agtoken: "0xEB20B07a9abE765252E6b45e8292b12CB553CcA6",
    vardebt: "0xA4a45B550897dD5d8a44c68DBD245C5934EbAcd9",

  },
  "wstETH": {
    reserve: "0x6C76971f98945AE98dD7d4DFcA8711ebea946eA6",
    agtoken: "0x606B2689ba4A9F798f449fa6495186021486dD9f",
    vardebt: "0xd0b168FD6a4e220f1a8FA99De97F8f428587e178",
  },
  "sDAI": {
    reserve: "0xaf204776c7245bF4147c2612BF6e5972Ee483701",
    agtoken: "0xe1cF0d5A56c993c3C2a0442dd645386aEFF1fC9a",
    vardebt: "0xAd15FeC0026e28DFB10588FA35a383B07014e0c6",
  }
}

const assetSymbols = ["WBTC","EURe", "WETH","GNO", "sDAI", "USDC", "USDT", "WXDAI","LINK","wstETH","FOX"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loopUsersWithDebt() {
  let count=0;
  for (let j = 0; j < users.length; j++) {
    if(users[j].healthFactor < 106e16)
      count++;
    if (users[j].healthFactor < 106e16 && users[j].totalDebtETH > 6e16) {
      const data = await getUserAccountData(users[j].user);
      await sleep(100);
      if (data[5] < 1000000000000000000n && data[5] > 80000000000000000n && data[1] > 10e16) {
        const debt = findUserDebts(users[j]);
        const collateral = findUserCollaterals(users[j],debt);
        console.log(users[j].user, users[j][`${collateral}:agBalance`],collateral, users[j][`${debt}:scaledVariableDebt`] + users[j][`${debt}:principalStableDebt`], data[5], debt);
        if (debt === "LINK" || debt === "FOX") {
          if (users[j][`${debt}:scaledVariableDebt`] + users[j][`${debt}:principalStableDebt`] > 10n && users[j][`${collateral}:agBalance`] > 10n) {
            const liquidateMax = await myBalance(assets[debt].reserve);           
            if (liquidateMax > 1e4) {
              await liquidateDefault(assets[collateral].reserve, assets[debt].reserve, users[j].user, liquidateMax);
              console.log("liquidated: ", debt, "> in exchange for >", collateral);
              count--;
            }
            else {
              console.log(debt, " has no liquidity!!");
            }
          }
        }
        else {
          if (users[j][`${debt}:scaledVariableDebt`] + users[j][`${debt}:principalStableDebt`] > 10n && users[j][`${collateral}:agBalance`] > 10n) {
            const liquidateMax = await myBalance(assets[debt].agtoken);
            if (liquidateMax > 0n) {
              await liquidate(assets[collateral].reserve, assets[debt].reserve, users[j].user, liquidateMax);
              console.log("liquidated: ", debt, "> in exchange for >", collateral);            
              count--;
            }
            else {
              console.log(debt, " has no liquidity!!");
            }
          }
        }
        sleep(500);
      }
    }
  }
  console.log(count, " positions to liquidate");
}

function findUserDebts(userData) {
  for (let i = 0; i < assetSymbols.length; i++) {
    if (userData[`${assetSymbols[i]}:scaledVariableDebt`] > 10n || userData[`${assetSymbols[i]}:principalStableDebt`] > 10n){
      return assetSymbols[i];
    }
  }
}

function findUserCollaterals(userData, debtAsset) {
  for (let i = 0; i < assetSymbols.length; i++) {
    if (assetSymbols[i] === debtAsset) i++;
    if (userData[`${assetSymbols[i]}:agBalance`] > 10n){
      return assetSymbols[i];
    }
  }
}

async function approveAll() {
  for (let asset in assets) {
    console.log(asset);
    await approve(assets[asset].reserve);
    await sleep(2500);
    await approve(assets[asset].agtoken);
    await sleep(2500);
  }
}

async function loopAssetMulticall() {
  for (let j = 0; j < assets.length; j++) {
    let tempUsers = [];
    let assetUsers = await getUsersWithAsset(assets[j]);
    for (let i = 0; i < assetUsers.length; i++) {
      tempUsers.push(assetUsers[i]);
      if (tempUsers.length >= 150 || i + 1 === assetUsers.length) {
        await liquidate([assets[j]], tempUsers);
        await sleep(35000);
        let x = [];
        tempUsers = x;
      }
    }
  }
}
loopUsersWithDebt();