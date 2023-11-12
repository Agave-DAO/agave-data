import ethers from "ethers";
import { lendingPool } from "./abis/lendingPool.js";
import { ERC20 } from "./abis/ERC20.js";
import { gnosis, gnosisChiado } from "viem/chains";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

// config.js
import dotenv from "dotenv";
dotenv.config();

//const account = mnemonicToAccount(process.env.MNEMONIC);
const account  = privateKeyToAccount(process.env.PRIVATE_KEY);

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



export function getUserAccountData(userAddress) {
   return client.readContract({
    address: lendingPoolAddress,
    abi: lendingPool,
    functionName: "getUserAccountData",
    args: [userAddress],
  });
}

export function myBalance(tokenAddy) {
  return client.readContract({
   address: tokenAddy,
   abi: ERC20,
   functionName: "balanceOf",
   args: [account.address],
 });
}

export async function approve(tokenAddy) {
  return await wallet.writeContract({
   address: tokenAddy,
   abi: ERC20,
   functionName: "approve",
   args: ["0x5E15d5E33d318dCEd84Bfe3F4EACe07909bE6d9c", "1000000000000000000000"],
   gas: 100_000n,
 });
}

export async function liquidate(collateralAsset,debtAsset, userAddress, debtToCover) {
  return await wallet.writeContract({
    address: lendingPoolAddress,
    abi: lendingPool,
    functionName: "liquidationCallUsingAgToken",
    args: [collateralAsset, debtAsset, userAddress, debtToCover, true],
 //   nonce: nonceValue,
    gas: 700_000n,
  });
//  nonceValue = nonceValue + 1;
}


export async function liquidateDefault(collateralAsset,debtAsset, userAddress, debtToCover) {
  await wallet.writeContract({
    address: lendingPoolAddress,
    abi: lendingPool,
    functionName: "liquidationCall",
    args: [collateralAsset, debtAsset, userAddress, debtToCover, true],
 //   nonce: nonceValue,
    gas: 700_000n,
  });
//  nonceValue = nonceValue + 1;
}
