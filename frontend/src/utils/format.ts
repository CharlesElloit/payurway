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

export function ordinalSuffix(day: number): string {
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats a Date as "Mon 23rd Feb 2026, 3:17:45 PM" — for receipt/transaction timestamps. */
export function formatReceiptTimestamp(date: Date): string {
  const day = date.getDate();
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${DAY_NAMES[date.getDay()]} ${day}${ordinalSuffix(day)} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}, ${hours12}:${mm}:${ss} ${ampm}`;
}

const ONES_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS_WORDS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitsToWords(n: number): string {
  let result = '';
  if (n >= 100) {
    result += `${ONES_WORDS[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n > 0) result += ' ';
  }
  if (n >= 20) {
    result += TENS_WORDS[Math.floor(n / 10)];
    if (n % 10 > 0) result += ` ${ONES_WORDS[n % 10]}`;
  } else if (n > 0) {
    result += ONES_WORDS[n];
  }
  return result;
}

/** Converts a whole number into English words, e.g. 1200000 -> "One Million Two Hundred Thousand". */
export function numberToWords(value: number): string {
  const n = Math.floor(value);
  if (n === 0) return 'Zero';

  const UNIT_LABELS = ['', 'Thousand', 'Million', 'Billion'];
  const parts: string[] = [];
  let remaining = n;
  let unitIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWords = threeDigitsToWords(chunk);
      const unitLabel = UNIT_LABELS[unitIndex];
      parts.unshift(unitLabel ? `${chunkWords} ${unitLabel}` : chunkWords);
    }
    remaining = Math.floor(remaining / 1000);
    unitIndex += 1;
  }

  return parts.join(' ');
}
