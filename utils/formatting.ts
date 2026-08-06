export function fmtCompactCurrency(n: number, symbol = "₹"): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) {
    return sign + symbol + (abs / 10000000).toFixed(2) + " Cr";
  }
  if (abs >= 100000) {
    return sign + symbol + (abs / 100000).toFixed(2) + " L";
  }
  return sign + symbol + Math.round(abs).toLocaleString("en-IN");
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}
