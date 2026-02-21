export const USER_LEVEL_REQUIREMENTS_ASSET: Record<string, any> = {
  ['GLADIATOR']: {
    id: 'Gladiator',
    category: 'crypto',
    type: 'ERC-20',
    paymentType: 'Stake',
    chain: 'AVALANCHE',
    chainId: 43114,
    imageUrl: 'https://arenaburn.vercel.app/_next/static/media/Untitled%20design%20(8).e2164208.png',
    contractAddress: '0x9d2B270361f2bD35aC39E8dA230a1fd54de6BE8E'
  },
}

export const USER_LEVEL: Record<string, any> = {
  ['IRON']: {
    id: "iron",
    name: "Iron X (Free)",
    benefits: {
      maxOrder: 2,
      maxWallets: 2,
      maxEVMWallets: 1,
      maxSVMWallets:1,
      maxAccessAsset: 2,
      supportTrading: ["spot"],
      supportStrategy: ["limit", "scalp"],
    },
    color: "bg-neutral-600 text-black",
    requireMents: {
      
    }
  },
  ['SILVER']: {
    id: "silver",
    name: "Silver Access",
    benefits: {
      maxOrder: 20,
      maxWallets: 5,
      maxEVMWallets: 3,
      maxSVMWallets:2,
      maxAccessAsset: 5,
      supportTrading: ["spot"],
      supportStrategy: ["limit", "scalp"],
    },
    color: "bg-silver-600 text-black",
    requireMents: {
      ['GLADIATOR']: {
        quantity: "10000000",
      }
    }
  },
  ['GOLD']: {
    id: "gold",
    name: "Gold Circle",
    benefits: {
      maxOrder: 50,
      maxWallets: 7,
      maxEVMWallets: 4,
      maxSVMWallets:3,
      maxAccessAsset: 10,
      supportTrading: ["spot", "perpetual"],
      supportStrategy: ["limit", "scalp", "grid", "dca"],
    },
    color: "bg-yellow-300 text-gray-500",
    requireMents: {
      ['GLADIATOR']: {
        quantity: "50000000",
      }
    }
  },
  ['PLATINUM']: {
    id: "platinum",
    name: "Platinum Elite",
    benefits: {
      maxOrder: 100,
      maxWallets: 10,
      maxEVMWallets: 6,
      maxSVMWallets:4,
      maxAccessAsset: 50,
      supportTrading: ["spot", "perpetual"],
      supportStrategy: ["limit", "scalp", "grid", "dca", "sellToken"],
    },
    color: "bg-sky-400 text-black",
    requireMents: {
      ['GLADIATOR']: {
        quantity: "100000000",
      }
    }
  },
  ['DIAMOND']: {
    id: "diamond",
    name: "Diamond Prestige",
    benefits: {
      maxOrder: "Unlimited",
      maxWallets: 20,
      maxEVMWallets: 12,
      maxSVMWallets:8,
      maxAccessAsset: 100,
      supportTrading: ["spot", "perpetual"],
      supportStrategy: ["limit", "scalp", "grid", "dca", "sellToken", "algo"],
    },
    color: "bg-stone-400 text-black",
    requireMents: {
      ['GLADIATOR']: {
        quantity: "500000000",
      }
    }
  },
};

export const USER_LEVEL_IDS = {
  ['SILVER']: 'silver',
  ['GOLD']: 'gold',
  ['PLATINUM']: 'platinum',
  ['DIAMOND']: 'diamond',
  ['ADMIN']: 'admin'
}

export const getStatus = (amount: number, assetId: string) => {
  if(!USER_LEVEL_REQUIREMENTS_ASSET[assetId]) {
    return null;
  }
  
  // Check diamond first (highest requirement)
  if (amount >= Number(USER_LEVEL.DIAMOND.requireMents[assetId].quantity)) {
    return USER_LEVEL_IDS.DIAMOND;
  }
  if (amount >= Number(USER_LEVEL.PLATINUM.requireMents[assetId].quantity)) {
    return USER_LEVEL_IDS.PLATINUM;
  }
  if (amount >= Number(USER_LEVEL.GOLD.requireMents[assetId].quantity)) {
    return USER_LEVEL_IDS.GOLD;
  }
  if (amount >= Number(USER_LEVEL.SILVER.requireMents[assetId].quantity)) {
    return USER_LEVEL_IDS.SILVER;
  }
  return null;
};

