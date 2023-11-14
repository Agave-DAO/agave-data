import ethers from "ethers";
import "@ethersproject/shims";
import IncentivesController from "./abi/incentivesController.js";
import {LendingPool } from "./abi/lendingPool.js";
import DataProvider from "./abi/dataProvider.js";
import UiPoolDataProvider from "./abi/UiPoolDataProvider.js";
import ERC20 from "./abi/ERC20.js";
import addresses from "./contract-addresses.js";
import { gnosis, gnosisChiado } from "viem/chains";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

// config.js
import dotenv from "dotenv";
dotenv.config();

// Read-Only; By connecting to a Provider, allows:
// - Any constant function
// - Querying Filters
// - Populating Unsigned Transactions for non-constant methods
// - Estimating Gas for non-constant (as an anonymous sender)
// - Static Calling non-constant methods (as anonymous sender)

const provider = new ethers.providers.JsonRpcProvider({
  url: process.env.RPC_URL,
  // user: process.env.RPC_USER,
  //  password: process.env.RPC_PASSWORD
});
export const IncentivesContract = new ethers.Contract(
  addresses.incentivesController,
  IncentivesController,
  provider
);

export const lendingPool = new ethers.Contract(
  addresses.lendingPool,
  LendingPool,
  provider
);

export const dataProvider = new ethers.Contract(
  addresses.dataProvider,
  DataProvider,
  provider
);

export const UiProvider = new ethers.Contract(
  addresses.UiPoolDataProvider,
  UiPoolDataProvider,
  provider
);

export function erc20(tokenAddy) {
  return new ethers.Contract(tokenAddy, ERC20, provider);
}

const account = process.env.PRIVATE_KEY
  ? privateKeyToAccount(process.env.PRIVATE_KEY)
  : mnemonicToAccount(process.env.MNEMONIC);

const transport = http(process.env.RPC_GNOSIS);

export const client = createPublicClient({
  chain: gnosis,
  transport: http(),
});

export const wallet = createWalletClient({
  account,
  chain: gnosis,
  transport,
});

export const [address] = await wallet.getAddresses();

//let nonceValue  = 59;

// This can be an address or an ENS name
const lendingPoolAddress = "0x5E15d5E33d318dCEd84Bfe3F4EACe07909bE6d9c";

const priorityFee = 1011000000n;
const gasFee = 10901000000n;

export async function getBatchAccountData(usersAddress) {
  let contractCalls = [];
  let output = [];
  for (let k in usersAddress) {
    contractCalls.push({
      address: lendingPoolAddress,
      abi: LendingPool,
      functionName: "getUserAccountData",
      args: [usersAddress[k].id],
    });
  }
  output = await client.multicall({
    contracts: contractCalls,
  });
  return output;
}
export async function getBatchReservesData(usersAddress) {
  let contractCalls = [];
  let output = [];
  for (let k in usersAddress) {
    contractCalls.push({
      address: addresses.UiPoolDataProvider,
      abi: UiPoolDataProvider,
      functionName: "getUserReservesData",
      args: [usersAddress[k].id],
    });
  }
  output = await client.multicall({
    contracts: contractCalls,
  });
  return output;
}

export function getUserAccountData(userAddress) {
  return client.readContract({
    address: lendingPoolAddress,
    abi: LendingPool,
    functionName: "getUserAccountData",
    args: [userAddress],
  });
}

export function getUserReservesData(userAddress) {
  return client.readContract({
    address: addresses.UiPoolDataProvider,
    abi: UiPoolDataProvider,
    functionName: "getReservesData",
    args: [userAddress],
  });
}

export async function liquidate(
  collateralAsset,
  debtAsset,
  userAddress,
  debtToCover
) {
  console.log(collateralAsset, debtAsset, userAddress, debtToCover, nonceValue);
  await wallet.writeContract({
    address: lendingPoolAddress,
    abi: lendingPool,
    functionName: "liquidationCallUsingAgToken",
    args: [collateralAsset, debtAsset, userAddress, debtToCover, true],
    // nonce: nonceValue,
    gas: 700_000n,
  });
  // nonceValue = nonceValue + 1;
}
