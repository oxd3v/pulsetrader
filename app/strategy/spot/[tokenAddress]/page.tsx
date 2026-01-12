
import DefinedSpotMain from "@/components/spot/defined/main";

export default async function SpotMain({
  params,
}: {
  params: Promise<{ tokenAddress: string }>;
}) {
  const { tokenAddress } = await params;
  
  return (
    <DefinedSpotMain tokenAddress={tokenAddress}/>
  )
}
