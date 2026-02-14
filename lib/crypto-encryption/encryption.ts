import CryptoJS from "crypto-js";
import {
  encodeBase64,
  decodeBase64,
  toUtf8Bytes,
  toUtf8String,
  scrypt,
  getBytes,
  hexlify,
} from "ethers";
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

export async function decryptFromServer(
  encryptedData: string,
  password: string,
) {
  try {
    const [saltHex, ivHex, encryptedHex] = encryptedData.split(".");

    if (!saltHex || !ivHex || !encryptedHex) {
      throw new Error("Invalid encrypted format from server");
    }

    // 1. Derive key using scrypt (Matching Node.js default parameters)
    // N=16384, r=8, p=1, keyLen=32
    const saltBytes = getBytes("0x" + saltHex);
    const passwordBytes = toUtf8Bytes(password);
    const derivedKey = await scrypt(passwordBytes, saltBytes, 16384, 8, 1, 32);

    // 2. Prepare CryptoJS word arrays
    const key = CryptoJS.enc.Hex.parse(hexlify(derivedKey).replace("0x", ""));
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedHex);

    // 3. Decrypt using AES-CBC (Node's default mode)
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Backend-style decryption failed:", error);
    return null;
  }
}

export const decodeInvitationCode = (invitationCode: string) => {
  const codeDetails = JSON.parse(decodeText(invitationCode));
  const to = codeDetails.to;
  const expireTimestamp = codeDetails.expireAt;
  const isExpired = expireTimestamp < Date.now() ? true : false;
  const status = codeDetails.status;
  const link = `${PROTOCOL_URL}connect/invite?invitation=${invitationCode}`;
  return { to, expireTimestamp, link, isExpired, status };
};
