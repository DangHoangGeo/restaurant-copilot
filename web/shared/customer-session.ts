export const CUSTOMER_SESSION_CODE_LENGTH = 8;
export const CUSTOMER_SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CUSTOMER_SESSION_CODE_PATTERN = new RegExp(
  `^[${CUSTOMER_SESSION_CODE_ALPHABET}]{${CUSTOMER_SESSION_CODE_LENGTH}}$`,
);

export function sanitizeCustomerSessionCodeInput(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .filter((char) => CUSTOMER_SESSION_CODE_ALPHABET.includes(char))
    .join("")
    .slice(0, CUSTOMER_SESSION_CODE_LENGTH);
}
