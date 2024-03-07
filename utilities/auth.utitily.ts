import bcrypt from "bcrypt";

/**
 * Hashes a plaintext password.
 * Uses bcrypt to securely hash passwords before storing them in the database.
 *
 * @param {string} plainTextPassword - The plaintext password to hash.
 * @param {number} saltRound - The number of rounds of salting. Defaults to 10.
 * @returns {Promise<string | null>} A promise that resolves with the hashed password or null in case of error.
 */
export const hashPassword = async (
  plainTextPassword: string,
  saltRound: number = 10
): Promise<string | null> => {
  try {
    return await bcrypt.hash(plainTextPassword, saltRound);
  } catch {
    return null;
  }
};

/**
 * Compares a plaintext password with a hashed password.
 *
 * Uses bcrypt to securely compare a user's plaintext password attempt with the
 * stored hashed password.
 *
 * @param {string} plainTextPassword - The plaintext password to compare.
 * @param {string} hashedPassword - The hashed password to compare against.
 * @returns {Promise<boolean>} A promise that resolves to true if the passwords match, false otherwise.
 */
export const matchPassword = async (
  plainTextPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainTextPassword, hashedPassword);
  } catch {
    return false;
  }
};
