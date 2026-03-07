import GmxMain from "@/components/perp/gmx/main";
import { normalizeGmxSymbol } from "@/lib/oracle/gmx";

export default async function PerpMain({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const normalizedSymbol = normalizeGmxSymbol(
    decodeURIComponent(symbol ?? "").trim(),
  );

  return <GmxMain key={normalizedSymbol} tokenSymbol={normalizedSymbol} />;
}
