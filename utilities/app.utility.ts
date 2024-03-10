import { customAlphabet } from "nanoid";

/**
 * Parse a string rate-limit value and returns its corresponding number
 *
 */
export const parseAndFetchRateLimit = (
  envValue: string | undefined,
  fallBackValue: number = 100
): number => {
  try {
    // Ensure envValue is defined and is a number; otherwise, return fallBackValue.
    const rateLimit = Number(envValue);
    return isNaN(rateLimit) ? fallBackValue : rateLimit;
  } catch {
    return fallBackValue;
  }
};

/**
 * Adds the given array of environment value names to an existing array of names, and returns it
 *
 * @param {Array<string>} additionalRequiredEnv - Array of additonal environment variable names.
 * @returns {Array<string>} Array of environment names
 */
export const constructRequiredEnv = (
  additionalRequiredEnv: Array<string> = []
): Array<string> => {
  const requiredEnv = [
    "DBUSER",
    "DBPASSWORD",
    "DBHOST",
    "DBNAME",
    "JWT_SECRET",
    "COOKIE_SECRET",
    "APP_ENV",
    "GLOBAL_RATE_LIMIT",
    "AUTH_RATE_LIMIT",
    "TOKEN_RATE_LIMIT",
    "EMAIL_SERVICE",
    "GMAIL_APP_USER",
    "GMAIL_APP_PASSWORD",
    "TOKEN_EXPIRY_MINUTES",
  ];
  try {
    return [...requiredEnv, ...additionalRequiredEnv];
  } catch {
    return requiredEnv;
  }
};

/**
 * Validates the presence of required environment variables.
 *
 * @param {Array<string>} requiredEnv - Array of required environment variable names.
 * @throws {Error} If any required environment variables are missing.
 */
export const validateEnv = (requiredEnv: Array<string>): void => {
  const missingEnv = requiredEnv.filter((envName) => !process.env[envName]);
  if (missingEnv.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnv.join(", ")}`
    );
  }
};

/**
 * Generate a short id for tracking a request for logging purpose
 *
 * @param {number} length - length of the id
 */
export const generateShortId = (length: number = 6): string => {
  const alphabets = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nanoid = customAlphabet(alphabets, length);
  const id = nanoid();
  return id;
};
