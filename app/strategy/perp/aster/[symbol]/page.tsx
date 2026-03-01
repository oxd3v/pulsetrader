import DefinedSpotMain from "@/components/perp/aster/NewChartBox";

export default async function SpotMain({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  
  return (
    <DefinedSpotMain tokenSymbol={symbol}/>
  )
}
