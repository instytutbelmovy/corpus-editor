export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Невядомая памылка';
