export type AsterExchangeFilter = {
  filterType?: string;
  minQty?: string | number;
  maxQty?: string | number;
  notional?: string | number;
};

export type AsterExchangeSymbol = {
  symbol?: string;
  baseAsset?: string;
  quoteAsset?: string;
  status?: string;
  contractType?: string;
  requiredMarginPercent?: string | number;
  maintMarginPercent?: string | number;
  filters?: AsterExchangeFilter[];
};

export type AsterTradingLimits = {
  maxLeverage: number;
  requiredMarginPercent: number;
  maintMarginPercent: number;
  minOrderQty: number;
  maxOrderQty: number;
  minNotionalUsd: number;
  minPositionSizeUsd: number;
  maxPositionSizeUsd: number;
  minMarginUsd: number;
  maxMarginUsd: number;
};

const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getFilter = (
  filters: AsterExchangeFilter[] | undefined,
  filterType: string,
): AsterExchangeFilter | null => {
  return (
    filters?.find(
      (filter) => (filter.filterType ?? "").toUpperCase() === filterType,
    ) ?? null
  );
};

export const getAsterMaxLeverage = (requiredMarginPercent: unknown) => {
  const marginPercent = toFiniteNumber(requiredMarginPercent);
  if (marginPercent <= 0) return 1;

  return Math.max(1, Number((100 / marginPercent).toFixed(2)));
};

export const getAsterMarginLimits = ({
  referencePrice,
  minOrderQty,
  maxOrderQty,
  minNotionalUsd,
  maxLeverage,
  leverage,
}: {
  referencePrice: number;
  minOrderQty: number;
  maxOrderQty: number;
  minNotionalUsd: number;
  maxLeverage: number;
  leverage?: number;
}) => {
  const safeReferencePrice = Math.max(0, toFiniteNumber(referencePrice));
  const safeMaxLeverage = Math.max(1, toFiniteNumber(maxLeverage));
  const effectiveLeverage = Math.min(
    safeMaxLeverage,
    Math.max(1, toFiniteNumber(leverage) || safeMaxLeverage),
  );

  const minQtyNotionalUsd =
    safeReferencePrice > 0 && minOrderQty > 0
      ? minOrderQty * safeReferencePrice
      : 0;
  const maxQtyNotionalUsd =
    safeReferencePrice > 0 && maxOrderQty > 0
      ? maxOrderQty * safeReferencePrice
      : 0;

  const minPositionSizeUsd = Math.max(toFiniteNumber(minNotionalUsd), minQtyNotionalUsd);
  const maxPositionSizeUsd = Math.max(0, maxQtyNotionalUsd);

  return {
    minPositionSizeUsd,
    maxPositionSizeUsd,
    minMarginUsd:
      minPositionSizeUsd > 0 ? minPositionSizeUsd / effectiveLeverage : 0,
    maxMarginUsd:
      maxPositionSizeUsd > 0 ? maxPositionSizeUsd / effectiveLeverage : 0,
  };
};

export const getAsterSymbolTradingLimits = (
  symbolInfo: AsterExchangeSymbol | null | undefined,
  referencePrice: number,
  leverage?: number,
): AsterTradingLimits => {
  if (!symbolInfo) {
    return {
      maxLeverage: 1,
      requiredMarginPercent: 0,
      maintMarginPercent: 0,
      minOrderQty: 0,
      maxOrderQty: 0,
      minNotionalUsd: 0,
      minPositionSizeUsd: 0,
      maxPositionSizeUsd: 0,
      minMarginUsd: 0,
      maxMarginUsd: 0,
    };
  }

  const lotSizeFilter = getFilter(symbolInfo.filters, "LOT_SIZE");
  const marketLotSizeFilter = getFilter(symbolInfo.filters, "MARKET_LOT_SIZE");
  const minNotionalFilter = getFilter(symbolInfo.filters, "MIN_NOTIONAL");

  const requiredMarginPercent = toFiniteNumber(symbolInfo.requiredMarginPercent);
  const maintMarginPercent = toFiniteNumber(symbolInfo.maintMarginPercent);
  const maxLeverage = getAsterMaxLeverage(requiredMarginPercent);
  const minOrderQty = toFiniteNumber(
    lotSizeFilter?.minQty ?? marketLotSizeFilter?.minQty,
  );
  const maxOrderQty = toFiniteNumber(
    marketLotSizeFilter?.maxQty ?? lotSizeFilter?.maxQty,
  );
  const minNotionalUsd = toFiniteNumber(minNotionalFilter?.notional);
  const marginLimits = getAsterMarginLimits({
    referencePrice,
    minOrderQty,
    maxOrderQty,
    minNotionalUsd,
    maxLeverage,
    leverage,
  });

  return {
    maxLeverage,
    requiredMarginPercent,
    maintMarginPercent,
    minOrderQty,
    maxOrderQty,
    minNotionalUsd,
    ...marginLimits,
  };
};
