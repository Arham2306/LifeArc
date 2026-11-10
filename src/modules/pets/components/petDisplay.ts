export function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export function spendableCash(cash: number): number {
  return Number.isFinite(cash) && cash > 0 ? cash : 0;
}

export function petYears(age: number): string {
  return age === 1 ? '1 year old' : `${age} years old`;
}
