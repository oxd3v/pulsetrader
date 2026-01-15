
import {  CollateralTokens, userDeafultTokens } from "@/constants/common/tokens";
//components
import TokenCard from "@/components/Token/TokenCard";


export default function RenderWalletTokenList ({userTokens, walletAddress, chainId, user}: {userTokens:string[], walletAddress: string, chainId: number, user:any}){
    const tokenSet = new Set();
    const collateralTokens = Object.values(CollateralTokens[chainId]).filter((t:any)=>!t.isNative).forEach((t:any)=>tokenSet.add(t.address));
    const defaultTokensList = userDeafultTokens.filter((t:any)=> Number(t.split(':')[1]) == chainId).forEach((t:any)=>tokenSet.add(t.split(':')[0]));
    const userAddedTokens = userTokens.filter((t:any)=> Number(t.split(':')[1]) == chainId).forEach((t:any)=>tokenSet.add(t.split(':')[0]));
    const tokensList = Array.from(tokenSet) as string[];
    return (
        <div className='p-1 lg:p-2 h-full overflow-y-auto scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:bg-indigo-600 [&::-webkit-scrollbar-thumb]:rounded-full space-y-1'>
            {
              tokensList.length > 0 && tokensList.map((tokenAddress:string, index:number)=>(
                <TokenCard key={`${index}-${tokenAddress}`} tokenAddress={tokenAddress} walletAddress={walletAddress} chainId={chainId} user={user}/>
              ))
            }
        </div>
    )
}