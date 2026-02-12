import CryptoJS from "crypto-js";
import { encodeBase64, decodeBase64, toUtf8Bytes, toUtf8String } from "ethers";
import { PROTOCOL_URL } from "@/constants/config/enviroments";


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



export const  decodeInvitationCode =  (invitationCode: string) => {
  const codeDetails = JSON.parse(decodeText(invitationCode));
  const to = codeDetails.to;
  const expireTimestamp = codeDetails.expireAt;
  const isExpired = expireTimestamp < Date.now() ? true : false;
  const status = codeDetails.status;
  const link = `${PROTOCOL_URL}connect/invite?invitation=${invitationCode}`;
  return {to, expireTimestamp,  link, isExpired, status}
};
