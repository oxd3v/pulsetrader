import { encodeBase64, decodeBase64, toUtf8Bytes, toUtf8String } from "ethers";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

export const encodeText = (text: string) => {
  return encodeBase64(toUtf8Bytes(text));
};

export const decodeText = (signature: string) => {
  return toUtf8String(decodeBase64(signature));
};

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const AUTH_TOKEN_SECURITY_PASSWORD = process.env.NEXT_PUBLIC_AUTH_TOKEN_SECURITY_PASSWORD;

/**
 * Encrypt text with password
 */
export function encrypt(text: string, password:string) {
  // Generate salt (random bytes)
  const salt = randomBytes(16);
    // Derive key from password using salt
    const key = scryptSync(password, salt, 32);

    // Generate random initialization vector
    const iv = randomBytes(16);

    // Create cipher
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Combine salt + iv + encrypted text
    // Format: salt.iv.encrypted
    return `${salt.toString("hex")}.${iv.toString("hex")}.${encrypted}`;
}

/**
 * Decrypt text with password
 */
export function decrypt(encryptedText: string, password:string) {
  // Split the encrypted string into parts
  const parts = encryptedText.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  // Extract components
  const salt = Buffer.from(parts[0], "hex");
  const iv = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
    // Derive key from password using salt
    const key = scryptSync(password, salt, 32);

    // Create decipher
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);

    // Decrypt the text
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}


export const encryptAuthToken = (text:string)=>{
   if(AUTH_TOKEN_SECURITY_PASSWORD){
    return encrypt(text, AUTH_TOKEN_SECURITY_PASSWORD)
   }
}

export const decryptAuthToken = (encryptedText:string)=>{
   if(AUTH_TOKEN_SECURITY_PASSWORD){
    return decrypt(encryptedText, AUTH_TOKEN_SECURITY_PASSWORD)
   }
}
