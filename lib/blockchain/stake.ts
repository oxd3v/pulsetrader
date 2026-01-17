import StakeAbi from '@/constants/abis/stake.js';
import { Contract, formatUnits } from 'ethers';
let GladiatorContract = '0x9d2B270361f2bD35aC39E8dA230a1fd54de6BE8E';
import { getConnectionProvider } from '@/constants/common/chain';

export const getGladiatorStakeAmount = async (walletAddress:string)=>{
   let provider = getConnectionProvider(43114);
   let stakeContract = new Contract (GladiatorContract, StakeAbi, provider as any);
   let stakeAmount = await stakeContract.stacked(walletAddress);
   return formatUnits(stakeAmount, 18);
}