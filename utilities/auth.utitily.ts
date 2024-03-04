import bcrypt from "bcrypt";

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
