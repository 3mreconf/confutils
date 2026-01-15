export const maskToken = (token: string): string => {
  const trimmed = token.trim();
  if (trimmed.length <= 10) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
};
