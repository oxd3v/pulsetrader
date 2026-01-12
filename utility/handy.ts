import toast from "react-hot-toast";

export const getCopied = (textToCopy:string, label:string)=>{
   navigator.clipboard.writeText(textToCopy);
   toast(`${label} copied!`)
}
export const getRandomByRange = (min:number, max:number) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}




import { formatUnits, parseUnits } from "ethers";


export const formatCustomizeTime = (timeInMongodb:any) => {
    if (!timeInMongodb) return "";
    const now = new Date().getTime();
    const diff = now - new Date(timeInMongodb).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timeInMongodb).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

export const formatTimestamp = (timestamp: number): string => {
  // Convert current time to seconds and ensure clean decimal
  const current = Math.floor(Date.now() / 1000);
  const interval = current - timestamp;

  // Time constants in seconds
  const MINUTE = 60;
  const HOUR = MINUTE * 60;
  const DAY = HOUR * 24;
  const MONTH = DAY * 30;
  const YEAR = MONTH * 12;

  // Format time differences with proper rounding
  if (interval < MINUTE) {
    return `${Math.floor(interval)}s ago`;
  } else if (interval < HOUR) {
    return `${Math.floor(interval / MINUTE)}m ago`;
  } else if (interval < DAY) {
    return `${Math.floor(interval / HOUR)}h ago`;
  } else if (interval < MONTH) {
    return `${Math.floor(interval / DAY)}d ago`;
  } else if (interval < YEAR) {
    return `${Math.floor(interval / MONTH)}mo ago`;
  } else {
    // For timestamps older than a year, show the full date
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
}

export const formateAmountWithFixedDecimals = (
  value:any,
  decimals:number,
  maxDecimalToShow:number
) => {
  // Format the number with commas and two decimal places
  let rounded = parseFloat(
    Number(formatUnits(value, decimals)).toFixed(maxDecimalToShow)
  );

  // Convert to string and remove trailing zeros after decimal
  const [intPart, decPart] = rounded.toString().split(".");

  if (!decPart || maxDecimalToShow === 0) return intPart;

  // Trim trailing zeros but keep up to decimalPlaces
  const trimmedDec = decPart.replace(/0+$/, "");

  return trimmedDec ? `${intPart}.${trimmedDec}` : intPart;
};

export const formateNumber = (number: number, decimalToShow: number) => {
  // Convert to string and remove trailing zeros after decimal
  const [intPart, decPart] = number.toFixed(decimalToShow).split(".");

  if (!decPart || decimalToShow === 0 || intPart.length > 5) return intPart;

  // Trim trailing zeros but keep up to decimalPlaces
  const trimmedDec = decPart.replace(/0+$/, "");

  return trimmedDec ? `${intPart}.${trimmedDec}` : intPart;
}

export const formateNumberInUnit = (number: number, decimalToShow:number) => {
  const billion = 1000000000;
  const million = 1000000;
  const thousand = 1000;

  if (number >= billion) {
    return `${Number(formateNumber(number/million, decimalToShow)).toFixed(2)}B`;
  } else if (number >= million) {
    return `${Number(formateNumber(number/million, decimalToShow)).toFixed(2)}M`;
  } else if (number >= thousand) {
    return `${Number(formateNumber(number/thousand, decimalToShow)).toFixed(2)}K`;
  }
  return formateNumber(number, decimalToShow);
}

// Wallet address validation
export const isValidWalletAddress = (address: string): boolean => {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Check if it's a valid Ethereum address format
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethereumAddressRegex.test(address);
};

// Token validation (basic format check)
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== "string") {
    return false;
  }

  // Basic check for base64 encoded string
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(token) && token.length > 10;
};

// Invitation code validation
export const isValidInvitationCode = (code: string): boolean => {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Remove whitespace and check length
  const trimmedCode = code.trim();
  
  return trimmedCode.length >= 6 && trimmedCode.length <= 160;
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface PasswordValidationResult {
  isValid: boolean;
  message: string;
}

// Password strength validation
export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required" };
  }

  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long`,
    };
  }

  if (!hasUpperCase) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!hasLowerCase) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!hasNumbers) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  if (!hasSpecialChar) {
    return {
      isValid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { isValid: true, message: "Password is strong" };
};

// Number validation
export const isValidNumber = (value: number | string, min: number | null = null, max: number | null = null): boolean => {
  const num = parseFloat(value as string);

  if (isNaN(num)) {
    return false;
  }

  if (min !== null && num < min) {
    return false;
  }

  if (max !== null && num > max) {
    return false;
  }

  return true;
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Phone number validation (basic)
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== "string") {
    return false;
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // Check if it has 10-15 digits (international format)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

// Trim and validate input
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== "string") {
    return "";
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

interface ValidationRule {
  required?: boolean;
  type?: 'email' | 'wallet' | 'token' | 'number';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  custom?: (value: any, data: Record<string, any>) => boolean | string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Validate form data
// export const validateFormData = (data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult => {
//   const errors: Record<string, string> = {};

//   Object.keys(rules).forEach((field) => {
//     const value = data[field];
//     const fieldRules = rules[field];

//     // Required check
//     if (fieldRules.required && (!value || value.trim() === "")) {
//       errors[field] = `${field} is required`;
//       return;
//     }

//     // Skip other validations if field is empty and not required
//     if (!value || value.trim() === "") {
//       return;
//     }

//     // Type-specific validations
//     if (fieldRules.type === "email" && !isValidEmail(value)) {
//       errors[field] = "Invalid email format";
//     } else if (fieldRules.type === "wallet" && !isValidWalletAddress(value)) {
//       errors[field] = "Invalid wallet address format";
//     } else if (fieldRules.type === "token" && !isValidTokenFormat(value)) {
//       errors[field] = "Invalid token format";
//     } else if (fieldRules.type === "number") {
//       const num = parseFloat(value);
//       if (isNaN(num)) {
//         errors[field] = "Must be a valid number";
//       } else if (fieldRules.min !== undefined && num < fieldRules.min) {
//         errors[field] = `Minimum value is ${fieldRules.min}`;
//       } else if (fieldRules.max !== undefined && num > fieldRules.max) {
//         errors[field] = `Maximum value is ${fieldRules.max}`;
//       }
//     }

//     // Length validations
//     if (fieldRules.minLength && value.length < fieldRules.minLength) {
//       errors[field] = `Minimum length is ${fieldRules.minLength} characters`;
//     }

//     if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
//       errors[field] = `Maximum length is ${fieldRules.maxLength} characters`;
//     }

//     // Custom validation
//     if (fieldRules.custom) {
//       const customResult = fieldRules.custom(value, data);
//       if (customResult !== true) {
//         errors[field] = customResult;
//       }
//     }
//   });

//   return {
//     isValid: Object.keys(errors).length === 0,
//     errors,
//   };
// };

export const validateNumberInput = (value: string): boolean => {
  // Allow empty string, positive numbers, and one decimal point
  // No negative numbers allowed
  return /^\d*\.?\d*$/.test(value);
};

export const amountWithDecimalsDisplay = (
  value: string | number,
  decimals: number,
  maxDecimalToShow: number
): number => {
  // Format the number with commas and two decimal places
  return parseFloat(
    Number(formatUnits(value, decimals)).toFixed(maxDecimalToShow)
  );
};


const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const safeParseUnits = (valueInput:string, decimals:number) => {
    // Convert to string and trim
    let value = String(valueInput).trim();

    // Basic validation: check if it's a valid number (optionally scientific)
    if (!/^-?\d*\.?\d+(?:e[+-]?\d+)?$/i.test(value)) {
        throw new Error(`Invalid number format: ${value}`);
    }

    // Handle scientific notation by normalizing to standard decimal (simple case; for complex, use library)
    if (value.toLowerCase().includes('e')) {
        value = parseFloat(value).toFixed(decimals + 1); // Use toFixed for approx, then round below; note: limited precision for huge nums
    }

    // Handle sign
    let sign = '';
    if (value.startsWith('-')) {
        sign = '-';
        value = value.slice(1);
    }

    // Split into integer and fractional parts
    let [intPart, fracPart = ''] = value.split('.');
    intPart = intPart || '0';

    // If no need for rounding, proceed
    if (fracPart.length <= decimals) {
        let safeStr = sign + intPart + (fracPart ? '.' + fracPart : '');
        if (safeStr.startsWith('.')) safeStr = sign + '0' + safeStr;
        return parseUnits(safeStr, decimals);
    }

    // Rounding needed: take up to decimals + 1 for round digit
    const keepFrac = fracPart.slice(0, decimals);
    const roundDigit = parseInt(fracPart[decimals] || '0', 10);
    let newFrac = keepFrac;

    if (roundDigit >= 5) {
        // Round up: increment the fractional part (handle carry)
        let fracArr = newFrac.split('').map(Number);
        let carry = 1;
        for (let i = fracArr.length - 1; i >= 0; i--) {
            const sum = fracArr[i] + carry;
            fracArr[i] = sum % 10;
            carry = Math.floor(sum / 10);
            if (carry === 0) break;
        }
        newFrac = fracArr.join('');
        if (carry > 0) {
            // Carry over to integer part
            let intArr = intPart.split('').map(Number);
            for (let i = intArr.length - 1; i >= 0; i--) {
                const sum = intArr[i] + carry;
                intArr[i] = sum % 10;
                carry = Math.floor(sum / 10);
                if (carry === 0) break;
            }
            if (carry > 0) {
                intArr.unshift(carry); // Add new digit if carry remains
            }
            intPart = intArr.join('');
        }
        //console.warn(`Value ${valueInput} rounded up due to excess decimals.`);
    } else {
        //console.warn(`Value ${valueInput} truncated due to excess decimals.`);
    }

    // Reconstruct
    let safeStr = sign + intPart + (newFrac ? '.' + newFrac : '');
    if (safeStr.startsWith('.')) safeStr = sign + '0' + safeStr;

    // Parse
    try {
        return parseUnits(safeStr, decimals);
    } catch (error:any) {
        throw new Error(`Failed to parse units for value: ${safeStr} - ${error.message}`);
    }
};


export const safeFormatNumber = (
    rawValue:string,
    totalPrecision:number,
    displayDecimals: number
): string => {
    // 1. Basic input validation and normalization
    let value = String(rawValue).trim();
    if (value === '') return '0';
    if (!/^-?\d+$/.test(value)) {
        throw new Error(`Invalid scaled integer format: ${rawValue}`);
    }

    // --- 2. String Manipulation to insert the decimal point (Shift right by totalPrecision) ---
    
    // Handle sign
    let sign = '';
    if (value.startsWith('-')) {
        sign = '-';
        value = value.slice(1);
    }

    // Determine position of decimal point
    const len = value.length;
    let decimalIndex = len - totalPrecision;
    let decimalString;

    if (decimalIndex > 0) {
        // Case A: Integer part exists (e.g., rawValue="12345", precision=2 -> "123.45")
        const intPart = value.slice(0, decimalIndex);
        const fracPart = value.slice(decimalIndex);
        decimalString = `${intPart}.${fracPart}`;
    } else {
        // Case B: Only fractional part (e.g., rawValue="123", precision=5 -> "0.00123")
        // Number of leading zeros needed: totalPrecision - len
        const leadingZeros = '0'.repeat(totalPrecision - len);
        decimalString = `0.${leadingZeros}${value}`;
    }

    // --- 3. Rounding/Truncation to displayDecimals ---
    
    // Find the current fractional part after the shift
    let [, currentFracPart] = decimalString.split('.');
    
    if (currentFracPart && currentFracPart.length > displayDecimals) {
        // We only care about up to (displayDecimals + 1) for rounding.
        const truncFrac = currentFracPart.slice(0, displayDecimals + 1);

        // Check the rounding digit (the digit at position displayDecimals)
        const roundDigit = parseInt(truncFrac.slice(-1), 10);
        
        // Final fractional part is the truncated part (up to displayDecimals)
        let finalFrac = truncFrac.slice(0, displayDecimals);
        let finalInt = decimalString.split('.')[0] || '0';

        if (roundDigit >= 5) {
            // Round up: since we are working with BigInt scale, use BigInt arithmetic 
            // for the rounding carry.
            
            // Re-scale the number to the desired display precision (e.g., to 10^6)
            // This is the safest way to perform high-precision rounding with BigInt
            
            // Calculate the power to re-scale for rounding: totalPrecision - displayDecimals
            const powerToScale = totalPrecision - displayDecimals;
            const roundDivisor = BigInt(10) ** BigInt(powerToScale);
            
            // Scale raw value down to the new precision
            // Add half the divisor for rounding effect (i.e., +0.5 before truncating)
            const roundedBigInt = (BigInt(rawValue) + roundDivisor / BigInt(2)) / roundDivisor;

            // Re-convert to decimal string at the new, lower precision
            const roundedString = String(roundedBigInt);
            
            // Re-apply the decimal point at displayDecimals position
            if (roundedString.length <= displayDecimals) {
                const zeroPad = '0'.repeat(displayDecimals - roundedString.length + 1);
                decimalString = `0.${zeroPad}${roundedString}`;
            } else {
                const newDecimalIndex = roundedString.length - displayDecimals;
                const newIntPart = roundedString.slice(0, newDecimalIndex);
                const newFracPart = roundedString.slice(newDecimalIndex);
                decimalString = `${newIntPart}.${newFracPart}`;
            }
        } else {
            // Truncation (round down)
            const [intPart, fracPart] = decimalString.split('.');
            decimalString = `${intPart}.${finalFrac}`;
        }
    }
    
    // Final cleanup: remove trailing zeros from fractional part
    if (decimalString.includes('.')) {
        decimalString = decimalString.replace(/\.?0+$/, '');
    }
    
    // Re-apply sign and return
    return sign + decimalString;
};
