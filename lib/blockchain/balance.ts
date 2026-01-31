"use server";
import { chains } from "@/constants/common/chain";
import { ethers, Contract } from "ethers";
import { getConnectionProvider } from "@/constants/common/chain";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountLayout,
  unpackAccount,
} from "@solana/spl-token";
import ERC20Abi from "@/constants/abis/ERC20";

export const getWalletBalance = async ({
  walletAddress,
  chainId,
}: {
  walletAddress: any;
  chainId: number;
}) => {
  let balance;
  if (chainId == chains.Solana) {
    balance = await getSolanaBalance(walletAddress);
  } else {
    balance = getEvmBalance({ walletAddress, chainId });
  }
  return balance;
};

export const getEvmBalance = async ({
  walletAddress,
  chainId,
}: {
  walletAddress: string;
  chainId: number;
}) => {
  let provider: any = getConnectionProvider(chainId);
  let balance = await provider.getBalance(walletAddress);
  return balance;
};

export const getSolanaBalance = async (walletAddress: string) => {
  const connection = new Connection("https://solana-rpc.publicnode.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 30000, // 30 seconds
    wsEndpoint: undefined, // Disable WebSocket for simple RPC calls
  });
  let parsedWalletPublicKey = new PublicKey(walletAddress);
  let balance = await connection.getBalance(parsedWalletPublicKey);
  return balance;
};

export const getWalletTokenBalance = async ({
  walletAddress,
  tokenAddress,
  chainId,
}: {
  walletAddress: any;
  tokenAddress: string;
  chainId: number;
}) => {
  let balance;
  if (chainId == chains.Solana) {
    balance = await getSolanaTokenBalance({ walletAddress, tokenAddress });
  } else {
    balance = await getEvmWalletTokenBalance({
      walletAddress,
      tokenAddress,
      chainId,
    });
  }
  return balance;
};

export const getSolanaTokenBalance = async ({
  walletAddress,
  tokenAddress,
}: {
  walletAddress: string;
  tokenAddress: string;
}) => {
  const walletPublicKey = new PublicKey(walletAddress);
  const mintPublicKey = new PublicKey(tokenAddress);

  const associatedTokenAddress = getAssociatedTokenAddressSync(
    mintPublicKey,
    walletPublicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Use ONLY mainnet RPC
  const solanaConnection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );

  const accountInfo = await solanaConnection.getAccountInfo(
    associatedTokenAddress
  );

  if (!accountInfo) {
    return BigInt(0); // or 0n
  }

  const accountData = AccountLayout.decode(accountInfo.data);
  return BigInt(accountData.amount.toString());
};

export const getEvmWalletTokenBalance = async ({
  walletAddress,
  tokenAddress,
  chainId,
}: {
  walletAddress: any;
  tokenAddress: string;
  chainId: number;
}) => {
  const connectionProvider = getConnectionProvider(chainId);
  const tokenContract = new Contract(
    tokenAddress,
    ERC20Abi,
    connectionProvider as any
  );
  const balance = await tokenContract.balanceOf(walletAddress);
  return balance;
};

// In your balance.ts file, update the getWalletTokenBalance function:

// export const getWalletTokenBalance = async ({
//   walletAddress,
//   tokenAddress,
//   chainId,
// }: {
//   walletAddress: any;
//   tokenAddress: string;
//   chainId: number;
// }) => {
//   let connectionProvider = getConnectionProvider(chainId);

//   if (chainId == chains.Solana) {
//     try {
//       const walletPublicKey =
//         typeof walletAddress === "string"
//           ? new PublicKey(walletAddress)
//           : walletAddress;
//       const mintPublicKey =
//         typeof tokenAddress === "string"
//           ? new PublicKey(tokenAddress)
//           : tokenAddress;

//       const associatedTokenAddress = getAssociatedTokenAddressSync(
//         mintPublicKey,
//         walletPublicKey,
//         false,
//         TOKEN_PROGRAM_ID,
//         ASSOCIATED_TOKEN_PROGRAM_ID
//       );

//       // Get mint info for decimals
//       //const mintInfo = await getMint(connectionProvider as any, mintPublicKey);
//       const tokenAccount: any = await (
//         connectionProvider as Connection
//       ).getAccountInfo(associatedTokenAddress);
//       const accountData = AccountLayout.decode(tokenAccount.data);
//       return accountData.amount.toString();
//     } catch (err) {
//       console.log(err);
//     }
//   } else {
//     let tokenContract = new Contract(
//       tokenAddress,
//       ERC20Abi,
//       connectionProvider as any
//     );
//     let balance = await tokenContract.balanceOf(walletAddress);
//     return balance;
//   }
// };
