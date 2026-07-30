export function formatCurrency(value: number, withDecimals = true): string {
  const parts = value.toFixed(withDecimals ? 2 : 0).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withDecimals ? parts.join('.') : parts[0];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function ordinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** Formats a Date as "July 27th 2026". */
export function formatDateOrdinal(date: Date): string {
  const day = date.getDate();
  return `${MONTH_NAMES[date.getMonth()]} ${day}${ordinalSuffix(day)} ${date.getFullYear()}`;
}
