export interface TransactionGuard {
  isConsumed(): boolean;
  begin(): boolean;
  succeed(): void;
  fail(): void;
  reset(): void;
}

export function createTransactionGuard(): TransactionGuard {
  let consumed = false;
  return {
    isConsumed: () => consumed,
    begin: () => {
      if (consumed) return false;
      consumed = true;
      return true;
    },
    succeed: () => {
      consumed = true;
    },
    fail: () => {
      consumed = false;
    },
    reset: () => {
      consumed = false;
    },
  };
}
