'use server';
import { encrypt, decrypt } from "./encryption";

const AUTH_TOKEN_SECURITY_PASSWORD =
  process.env.AUTH_TOKEN_SECURITY_PASSWORD;

export const encryptAuthToken = async (text: string) => {
  if (AUTH_TOKEN_SECURITY_PASSWORD) {
    return encrypt(text, AUTH_TOKEN_SECURITY_PASSWORD);
  }
};

export const decryptAuthToken = async (encryptedText: string) => {
  if (AUTH_TOKEN_SECURITY_PASSWORD) {
    return decrypt(encryptedText, AUTH_TOKEN_SECURITY_PASSWORD);
  }
};