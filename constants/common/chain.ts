import { ethers } from "ethers";
import { Connection } from "@solana/web3.js";

export const chains = {
  Avalanche: 43114,
  Arbitrum: 42161,
  Ethereum: 1,
  Solana: 1399811149
};

export const chainConfig = {
  [chains.Ethereum]: {
    rpcUrls: ["https://ethereum-rpc.publicnode.com"],
    explorerUrl: "https://etherscan.io",
    chainId: 1,
    name: "ETHEREUM",
    symbol: "ETH",
    nativeToken: {
      name: "WETH",
      decimals: 18,
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    imageUrl: `https://etherscan.io/images/svg/brands/ethereum-original.svg`,
    isPerpetual: true,
    isActive: true,
  },
  [chains.Avalanche]: {
    rpcUrls: [
      "https://api.avax.network/ext/bc/C/rpc",
      "https://avalanche-c-chain-rpc.publicnode.com",
    ],
    explorerUrl: "https://snowscan.xyz",
    chainId: 43114,
    name: "AVALANCHE",
    symbol: "AVAX",
    nativeToken: {
      name: "WAVAX",
      decimals: 18,
      address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
    },
    imageUrl: `https://snowscan.xyz/assets/avax/images/svg/logos/token-light.svg?v=25.10.4.0`,
    isPerpetual: false,
    isActive: true,
  },
  [chains.Arbitrum]: {
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum-one-rpc.publicnode.com",
    ],
    explorerUrl: "https://arbiscan.io/",
    chainId: 42161,
    name: "ARBITRUM",
    symbol: "ETH",
    nativeToken: {
      name: "WETH",
      decimals: 18,
      address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    },
    imageUrl: `https://arbitrum.io/arb_logo_color.svg`,
    isPerpetual: false,
    isActive: true,
  },
  [chains.Solana]: {
    rpcUrls: [
      "https://solana.drpc.org",
      //"https://solana-api.projectserum.com",
      //"https://rpc.ankr.com/solana"
    ],
    explorerUrl: "https://explorer.solana.com/",
    chainId: 1399811149,
    name: "SOLANA",
    symbol: "SOL",
    nativeToken: {
      name: 'WSOL',
      decimals: 9,
      address: "So11111111111111111111111111111111111111112",
    },
    imageUrl: `https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg`,
    isPerpetual: false,
    isActive: true,
  },
};

export const isValidChain = (chainId:Number)=>{
  return chainConfig[chainId as number].isActive === true
}

export const gtValidNetworkIdentifiers = [
  'avax',
  'arbitrum',
  'eth',
  'solana'
]



// ------------------------------------------------------------------
// Connection provider cache
// ------------------------------------------------------------------

const connectionCache = new Map<string, Connection | ethers.JsonRpcProvider>();

export const getConnectionProvider = (
  chainId: number
): Connection | ethers.JsonRpcProvider => {
  if (!isValidChain(chainId)) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }

  const cacheKey = `chain_${chainId}`;
  const cached = connectionCache.get(cacheKey);
  if (cached) return cached;

  const rpcUrls = chainConfig[chainId].rpcUrls;
  if (!rpcUrls.length) {
    throw new Error(`No RPC URLs available for chain ID: ${chainId}`);
  }

  let connection: Connection | ethers.JsonRpcProvider | undefined;
  let lastError: unknown;
  // shuffle for load balancing
  const shuffled = [...rpcUrls].sort(() => Math.random() - 0.5);

  if (chainId === chains.Solana) {
    for (const url of shuffled) {
      try {
        const conn = new Connection(url, "confirmed");
        // fire-and-forget validation; will throw on first actual use if broken
        void conn.getVersion().catch(() => {});
        connection = conn;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Failed to connect to Solana RPC ${url}:`, err);
      }
    }
  } else {
    for (const url of shuffled) {
      try {
        const prov = new ethers.JsonRpcProvider(url);
        // fire-and-forget validation
        void prov.getNetwork().catch(() => {});
        connection = prov;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Failed to connect to RPC ${url}:`, err);
      }
    }
  }

  if (!connection) {
    throw new Error(
      `Failed to connect to any RPC for chain ID: ${chainId} (${lastError})`
    );
  }

  connectionCache.set(cacheKey, connection);
  return connection;
};
