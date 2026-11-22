const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function twoDigits(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o > 0 ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let res = "";
  if (hundred > 0) {
    res += ONES[hundred] + " Hundred";
    if (remainder > 0) res += " and ";
  }
  if (remainder > 0) {
    res += twoDigits(remainder);
  }
  return res;
}

/**
 * Converts a positive number to Indian Rupee Words representation.
 * Follows the Indian numbering system: Crore (1,00,00,000), Lakh (1,00,000), Thousand (1,000).
 * Example: 154200.50 => "Rupees One Lakh Fifty Four Thousand Two Hundred and Fifty Paise Only"
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return "Rupees Zero Only";
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let remaining = rupees;
  const parts: string[] = [];

  // Crores (>= 1,00,00,000)
  const crore = Math.floor(remaining / 10000000);
  if (crore > 0) {
    parts.push(twoDigits(crore) + " Crore");
    remaining %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  const lakh = Math.floor(remaining / 100000);
  if (lakh > 0) {
    parts.push(twoDigits(lakh) + " Lakh");
    remaining %= 100000;
  }

  // Thousands (>= 1,000)
  const thousand = Math.floor(remaining / 1000);
  if (thousand > 0) {
    parts.push(twoDigits(thousand) + " Thousand");
    remaining %= 1000;
  }

  // Hundreds & Tens
  if (remaining > 0) {
    parts.push(threeDigits(remaining));
  }

  let words = (isNegative ? "Minus " : "") + "Rupees " + (parts.length > 0 ? parts.join(" ") : "Zero");

  if (paise > 0) {
    words += " and " + twoDigits(paise) + " Paise";
  }

  words += " Only";
  return words;
}

/**
 * Formats a number to Indian currency format (e.g. ₹ 1,50,000.00)
 */
export function formatINR(amount: number, symbol: string = "₹"): string {
  if (isNaN(amount)) return `${symbol} 0.00`;
  const parts = Number(amount).toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNeg = integerPart.startsWith("-");
  if (isNeg) integerPart = integerPart.substring(1);

  // Indian comma formatting: last 3 digits, then groups of 2
  const lastThree = integerPart.slice(-3);
  const otherNumbers = integerPart.slice(0, -3);
  let formatted = lastThree;

  if (otherNumbers !== "") {
    formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  return `${isNeg ? "-" : ""}${symbol} ${formatted}.${decimalPart}`;
}
