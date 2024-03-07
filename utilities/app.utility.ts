export const parseAndFetchRateLimit = (
  envValue: string | undefined,
  fallBackValue: number = 100
): number => {
  try {
    return Number(envValue);
  } catch {
    return fallBackValue;
  }
};
