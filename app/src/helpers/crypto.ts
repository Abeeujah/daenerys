import { PaymentSecret } from "../types";

/** Starknet field prime (2^251 + 17 * 2^192 + 1) */
const STARKNET_PRIME = BigInt(
  "0x800000000000011000000000000000000000000000000000000000000000001",
);

/**
 * Generate a cryptographically secure random field element.
 * Uses 31 bytes to ensure the value fits within the BN254 field.
 */
export function generateRandomField(): string {
  const randomBytes = new Uint8Array(31);
  crypto.getRandomValues(randomBytes);
  let hex = "0x";
  for (const byte of randomBytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return BigInt(hex).toString();
}

/**
 * Convert a BN254 field element to Starknet felt252.
 * Takes modulo of the Starknet prime to ensure value is in valid range.
 */
export function toFelt252(value: string): string {
  const bigValue = BigInt(value);
  return "0x" + (bigValue % STARKNET_PRIME).toString(16);
}

/**
 * Encode payment secret as base64 string for sharing.
 */
export function encodePaymentSecret(secret: PaymentSecret): string {
  return btoa(JSON.stringify(secret));
}

/**
 * Decode payment secret from base64 string.
 */
export function decodePaymentSecret(encoded: string): PaymentSecret {
  return JSON.parse(atob(encoded));
}

/**
 * Format wei amount to ETH string with 4 decimal places.
 */
export function formatAmount(amount: string): string {
  try {
    const num = BigInt(amount);
    const divisor = BigInt(10 ** 18);
    const intPart = num / divisor;
    const fracPart = num % divisor;
    const fracStr = fracPart.toString().padStart(18, "0").slice(0, 4);
    return `${intPart}.${fracStr}`;
  } catch {
    return amount;
  }
}

/**
 * Parse ETH amount string to wei (18 decimals).
 */
export function parseAmount(amount: string): string {
  try {
    const parts = amount.split(".");
    const intPart = parts[0] || "0";
    let fracPart = parts[1] || "0";
    fracPart = fracPart.padEnd(18, "0").slice(0, 18);
    return (BigInt(intPart) * BigInt(10 ** 18) + BigInt(fracPart)).toString();
  } catch {
    return "0";
  }
}
