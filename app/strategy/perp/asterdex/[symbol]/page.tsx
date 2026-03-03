import DefinedPerpMain from "@/components/perp/aster/main";

export default async function PerpMain({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const normalizedSymbol = decodeURIComponent(symbol ?? "").trim().toUpperCase();
  
  return (
    <DefinedPerpMain key={normalizedSymbol} tokenSymbol={normalizedSymbol}/>
  )
}
