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
