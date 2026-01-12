import { formateNumberInUnit } from "./handy";

export const priceDisplay = (price: number) => {
  const expStr = price.toExponential();
  const exponent = parseInt(expStr.split("e")[1], 10);
  if (exponent < 0) {
    let zeroCount = 0;
    zeroCount = Math.abs(exponent) - 1;
    let numberAfterZero = zeroCount + 2;

    const fixedDecimal = price.toFixed(20).replace(/\.?0+$/, "");

    if (zeroCount > 4) {
      return (
        <div>
          {fixedDecimal.slice(0, 3)}
          <sub className="text-xs">{zeroCount}</sub>
          {fixedDecimal.slice(numberAfterZero, numberAfterZero + 3)}
        </div>
      );
    } else {
      return <div>{price.toFixed(7).replace(/\.?0+$/, "")}</div>;
    }
  } else {
    <div>{formateNumberInUnit(price, 2)}</div>
  }
};

export const displayNumber = (price: number) => {
  const expStr = price.toExponential();
  const exponent = parseInt(expStr.split("e")[1], 10);
  if (exponent < 0) {
    const zeroCount = Math.abs(exponent) - 1;
    const numberAfterZero = zeroCount + 2;

    const fixedDecimal = price.toFixed(20).replace(/\.?0+$/, "");
    if (zeroCount > 4) {
      return (
        <div className="inline-flex items-baseline">
          {fixedDecimal.slice(0, 3)}
          <sub className="text-xs font-bold">{zeroCount}</sub>
          {fixedDecimal.slice(numberAfterZero, numberAfterZero + 3)}
        </div>
      );
    }
    const formatted = formateNumberInUnit(price, 6);
    return <div>{formatted}</div>;
  }
  const formatted = formateNumberInUnit(price, 2);
  return <div>{formatted}</div>;
};

export const VeryLowDecimalPriceDisplay = (price:number) => {
  // Handle invalid input
  if (!price && price !== 0) return <div>-</div>;
  
  // Convert to exponential notation and get exponent
  const expStr = price.toExponential();
  const [mantissa, exp] = expStr.split('e');
  const exponent = parseInt(exp, 10);

  // Handle small numbers (negative exponent)
  if (exponent < 0) {
    const zeroCount = Math.abs(exponent) - 1;
    
    // For very small numbers, use special formatting
    if (zeroCount > 4) {
      const fixedDecimal = price.toFixed(20).replace(/\.?0+$/, '');
      const numberAfterZero = zeroCount + 2;
      
      return (
        <div>
          {fixedDecimal.slice(0, 3)}
          <sub className="text-xs">{zeroCount}</sub>
          {fixedDecimal.slice(numberAfterZero, numberAfterZero + 3)}
        </div>
      );
    }
    
    // For moderately small numbers, show 7 decimals
    return <div>{price.toFixed(7).replace(/\.?0+$/, '')}</div>;
  }

  // Handle regular and large numbers
  return <div>
    {price.toString().includes('.') ? price.toFixed(2) : price}
  </div>;
};
