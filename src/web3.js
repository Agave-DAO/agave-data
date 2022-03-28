
import ethers from "ethers";
import IncentivesController from "./abi/incentivesController.js";
import LendingPool from "./abi/lendingPool.js";
import ERC20 from "./abi/ERC20.js";
import addresses from "./contract-addresses.js";
import 'dotenv/config';

// Read-Only; By connecting to a Provider, allows:
// - Any constant function
// - Querying Filters
// - Populating Unsigned Transactions for non-constant methods
// - Estimating Gas for non-constant (as an anonymous sender)
// - Static Calling non-constant methods (as anonymous sender)

const provider = new ethers.providers.JsonRpcProvider(
    {
        url: process.env.RPC_URL,
        user: process.env.RPC_USER,
        password: process.env.RPC_PASSWORD
    })

export const IncentivesContract = new ethers.Contract(addresses.incentivesController, IncentivesController, provider);

export const lendingPool = new ethers.Contract(addresses.lendingpool, LendingPool, provider);

export function erc20(tokenAddy) {
    return new ethers.Contract(tokenAddy, ERC20, provider);
}
