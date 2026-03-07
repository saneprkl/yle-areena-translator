export const sleep = (ms: number): Promise<void> => {
  return new Promise((r) => setTimeout(r, ms));
};

export const normalize = (s: string): string => {
  return s.replace(/\s+/g, " ").trim();
};
