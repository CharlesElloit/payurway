export function formatCurrency(value: number, withDecimals = true): string {
  const parts = value.toFixed(withDecimals ? 2 : 0).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withDecimals ? parts.join('.') : parts[0];
}
