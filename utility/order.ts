/**
 * Calculates Order Size using BigInt for 30-decimal precision.
 * @param {bigint} initialOrderSize - Initial order size (e.g., 1n * 10n**6n)
 * @param {number} multiplier - Multiplier (e.g., 2)
 * @param {number} n - Entry index (1, 2, 3...)
 * @returns {bigint} The Order Size for the nth entry
 */
export function getGridMultiplierNthValue({
  initialValue,
  multiplier,
  n,
}: {
  initialValue: bigint;
  multiplier: number;
  n: number;
}) {
  if (n === 1) return initialValue;

  // To handle 2.1 with BigInt, we use 210 and divide by 100 later
  // Scale m to an integer (e.g., 2.1 becomes 210n)
  const multiplierBase = BigInt(Math.round(multiplier * 100));
  const divisor = BigInt(100);

  // We calculate (multiplierBase / divisor)^(n-1)
  // Formula: s1 * (multiplierBase^(n-1)) / (divisor^(n-1))
  const power = BigInt(n - 1);
  const numerator = multiplierBase ** power;
  const denominator = divisor ** power;

  // Multiply first to maintain that 30-decimal precision
  return (initialValue * numerator) / denominator;
}

/**
 * Calculates Vn where z is BigInt and x, y, n are regular numbers.
 * @param {bigint} entryPrice - The initial BigInt (e.g., 10000n)
 * @param {number} gridDistance - The initial percentage drop (e.g., 30)
 * @param {number} gridMultiplier - The multiplier (e.g., 2)
 * @param {number} n - The index (e.g., 1, 2, 3...)
 * @param {number} decrement - boolean for inc or dec
 * @returns {bigint} The resulting Vn as a BigInt
 */
export function getGridNthPrice({
  entryPrice,
  gridDistance,
  gridMultiplier,
  n,
  decrement = true,
}: {
  entryPrice: bigint;
  gridDistance: number;
  gridMultiplier: number;
  n: number;
  decrement: boolean;
}) {
  // 1. Convert inputs to BigInt to avoid "Cannot mix BigInt and other types"
  const bigX = BigInt(Math.round(gridDistance));
  const bigY = BigInt(Math.round(gridMultiplier));
  const bigN = BigInt(n);

  // 2. Handle the first index (no change to z)
  if (n === 1) return entryPrice;

  // 3. Calculate rotationFactor: (y^(n-1) - 1)
  // Both y and (n-1) must be BigInt for the ** operator
  const rotationFactor = bigY ** (bigN - BigInt(1)) - BigInt(1);

  // 4. Calculate total percentage drop
  const totalDropPercent = bigX * rotationFactor;

  // 5. Final Calculation: z - (z * drop / 100)
  // We multiply z by totalDropPercent FIRST to preserve the 30-decimal precision
  const percentagePrice = (entryPrice * totalDropPercent) / BigInt(100);
  const Price = decrement
    ? entryPrice - percentagePrice
    : entryPrice + percentagePrice;

  return Price;
}
