import CryptoJS from "crypto-js";
import { encodeBase64, decodeBase64, toUtf8Bytes, toUtf8String } from "ethers";

// Use NEXT_PUBLIC_ for frontend access (be aware this is NOT secure)
const AUTH_TOKEN_SECURITY_PASSWORD =
  process.env.NEXT_PUBLIC_AUTH_TOKEN_SECURITY_PASSWORD;

export function encrypt(text: string, password: string) {
  // CryptoJS works in the browser environment
  return CryptoJS.AES.encrypt(text, password).toString();
}

export function decrypt(encryptedText: string, password: string) {
  const bytes = CryptoJS.AES.decrypt(encryptedText, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// ... the rest of your ethers helper functions ...

export const encodeText = (text: string) => {
  return encodeBase64(toUtf8Bytes(text));
};

export const decodeText = (signature: string) => {
  return toUtf8String(decodeBase64(signature));
};

export const encryptAuthToken = (text: string) => {
  if (AUTH_TOKEN_SECURITY_PASSWORD) {
    return encrypt(text, AUTH_TOKEN_SECURITY_PASSWORD);
  }
};

export const decryptAuthToken = (encryptedText: string) => {
  if (AUTH_TOKEN_SECURITY_PASSWORD) {
    return decrypt(encryptedText, AUTH_TOKEN_SECURITY_PASSWORD);
  }
};

export const  decodeInvitationCode =  (invitationCode: string) => {
  const codeDetails = JSON.parse(decodeText(invitationCode));
  const to = codeDetails.to;
  const expireTimestamp = codeDetails.expireAt;
  console.log(expireTimestamp)
  const isExpired = expireTimestamp < Date.now() ? true : false;
  const status = codeDetails.status;
  const link = `http://192.168.0.101:3000/connect/invite?invitation=${invitationCode}`;
  return {to, expireTimestamp,  link, isExpired, status}
};
