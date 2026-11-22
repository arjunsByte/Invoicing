/**
 * Returns the Indian Financial Year string (e.g. "2024-2025" and short form "24-25")
 * In India, FY starts on April 1 and ends on March 31.
 */
export function getFinancialYear(date: Date = new Date(), startMonth: number = 4): { full: string; short: string } {
  const month = date.getMonth() + 1; // 1 to 12
  const year = date.getFullYear();

  let startYear = year;
  let endYear = year + 1;

  if (month < startMonth) {
    startYear = year - 1;
    endYear = year;
  }

  const shortStart = String(startYear).slice(-2);
  const shortEnd = String(endYear).slice(-2);

  return {
    full: `${startYear}-${endYear}`,
    short: `${shortStart}-${shortEnd}`,
  };
}

export function generateNextDocumentNumber(
  prefix: string,
  sequenceNumber: number,
  fy: { full: string; short: string }
): string {
  // Replace {FY} or {fy} in prefix if present
  let resolvedPrefix = prefix
    .replace("{FY}", fy.short)
    .replace("{fy}", fy.short)
    .replace("{YEAR}", fy.full);

  // If prefix doesn't have FY, we append FY if it ends with /
  if (!resolvedPrefix.includes(fy.short) && !resolvedPrefix.includes(fy.full)) {
    if (resolvedPrefix.endsWith("/")) {
      resolvedPrefix = `${resolvedPrefix}${fy.short}/`;
    }
  }

  const paddedSeq = String(sequenceNumber).padStart(3, "0");
  return `${resolvedPrefix}${paddedSeq}`;
}

export const INDIAN_STATES = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" }
];
