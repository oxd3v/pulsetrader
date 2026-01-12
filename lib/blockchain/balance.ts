import { chains } from "@/constants/common/chain";
import { ethers, Contract } from "ethers";
import { getConnectionProvider } from "@/constants/common/chain";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  AccountLayout,
} from "@solana/spl-token";
import ERC20Abi from "@/constants/abis/ERC20";

export const getWalletBalance = async ({
  walletAddress,
  chainId,
}: {
  walletAddress: any;
  chainId: number;
}) => {
  let connectionProvider = getConnectionProvider(chainId);
  let balance = await connectionProvider.getBalance(walletAddress);
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
  let connectionProvider = getConnectionProvider(chainId);

  if (chainId == chains.Solana) {
    const walletPublicKey =
      typeof walletAddress === "string"
        ? new PublicKey(walletAddress)
        : walletAddress;

    const mintPublicKey =
      typeof tokenAddress === "string"
        ? new PublicKey(tokenAddress)
        : tokenAddress;
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey
    );

    // Get mint info for decimals
    const mintInfo = await getMint(connectionProvider as any, mintPublicKey);
    const tokenAccount = await getAccount(
      connectionProvider as any,
      associatedTokenAddress
    );
    const rawBalance = tokenAccount.amount.toString();
    return rawBalance;
  } else {
    let tokenContract = new Contract(
      tokenAddress,
      ERC20Abi,
      connectionProvider as any
    );
    let balance = await tokenContract.balanceOf(walletAddress);
    return balance;
  }
};
