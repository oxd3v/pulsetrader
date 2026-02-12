export const TOKEN_EXPIRY_DATE = 86400000 * 7; // 7 days
export const TOKEN_STORAGE_KEY = "token";
export const SIGNATURE_STORAGE_KEY = 'signature';
export const ACCOUNT_STORAGE_KEY = "account";
export const PROTOCOL_URL = "https://pulsetrader-five.vercel.app/";
export const PULSETRADER_URL = "pulsetrader.net";

export const SIGN_MESSAGE = `${PULSETRADER_URL} wants you to sign in. 
Connect your wallet to PulseTrader and start trading.

URI: https://${PROTOCOL_URL}
Version: 1`;
