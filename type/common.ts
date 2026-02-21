export type WalletConfig = {
    _id: string,
    address: string,
    network: 'SVM' | 'EVM'
}

export type User = {
    _id: string,
    account: string,
    wallets?: any,
    status: string,
    invitationCodes: string[],
    inviter?: string,
    invites?: [],
    isBlock?:boolean,
    blockReason?: string
}

export type ACTIVITY_TYPE = {
    _id: string,
    status: string,
    walletAddress: string,
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
    txFee: {
     feeAmount: string,
     feeInUsd: string
    }
    info:any,
    txHash: string,
    indexToken: string,
    createdAt: Date,
    updatedAt: Date, 
}