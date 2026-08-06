export const BUSINESS_NAME = "SOURCERSBIZ";
export const ADDRESS =
  "1st Floor, No.17, Sri Venkateshwara Tower, FCI Rd, opposite Fire Station & Rescue station, Gandhimaa Nagar, Peelamedu, Coimbatore, Tamil Nadu - 641004";
export const GST_NO = "33AFPFS2192K1ZI";
export const CONTACT = "86681 91780";

export const BANK = {
  name: "SOURCERSBIZ",
  bank: "HDFC Bank",
  acc: "50200112480147",
  ifsc: "HDFC0001068",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "Rs.",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
};

export const CURRENCY_NAMES: Record<string, string> = {
  INR: "Rupees",
  USD: "Dollars",
  EUR: "Euros",
  GBP: "Pounds",
  AED: "Dirhams",
};

export function amountInWords(amount: number, currency = "INR"): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function below100(n: number): string {
    return n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function below1000(n: number): string {
    return n < 100 ? below100(n) : ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below100(n % 100) : "");
  }

  const intAmt = Math.floor(amount);
  const paise = Math.round((amount - intAmt) * 100);
  if (intAmt === 0 && paise === 0) return "Zero Only";

  let result = "";
  const crore = Math.floor(intAmt / 10000000);
  const lakh = Math.floor((intAmt % 10000000) / 100000);
  const thousand = Math.floor((intAmt % 100000) / 1000);
  const rest = intAmt % 1000;

  if (crore) result += below1000(crore) + " Crore ";
  if (lakh) result += below100(lakh) + " Lakh ";
  if (thousand) result += below1000(thousand) + " Thousand ";
  if (rest) result += below1000(rest);

  const currName = CURRENCY_NAMES[currency] ?? "Rupees";
  result = result.trim() + " " + currName;
  if (paise) result += " and " + below100(paise) + " Paise";
  result += " Only";
  return result;
}
