/**
 * One purchase or confirmed sale per open modal selection.
 * A successful call stays consumed until the caller resets for a new selection.
 * A failure clears the mark so the player can retry on purpose.
 */
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
