export type WalletConfig = {
    _id: string,
    address: string,
    network: 'SVM' | 'EVM'
}

export type User = {
    _id: string,
    account: string,
    wallets: any,
    executionSpeed: string,
    status: string,
    invitationCodes: string[],
    inviter?: string,
    isBlock:boolean,
    blockReason: string
}

export type ACTIVITY_TYPE = {
    _id: string,
    status: string,
    user: object,
    order?: any | undefined,
    wallet: WalletConfig,
    type: string,
    chainId: number,
    receiveToken:{
        address: string,
        decimals: number,
        symbol: string,
        amount: string,
        amountInUsd: string,
        parsedPrice: string
    },
    payToken?: {
        address: string,
        decimals: number,
        symbol: string,
        amount: string,
        amountInUsd: string,
        parsedPrice: string
    },
    feeToken?: {
        address: string,
        decimals: number,
        symbol: string,
        amount: string,
        amountInUsd: string,
        parsedPrice: string
    },
    nativeFee: {
        amount: string,
        amountInUsd: string
    },
    info:any,
    txHash: string,
    indexToken: string,
    createdAt: Date,
    updatedAt: Date, 
}