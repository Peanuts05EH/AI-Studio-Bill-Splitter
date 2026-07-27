export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rateToUSD: number; // exchange rate relative to 1 USD
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", rateToUSD: 1.0 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬", rateToUSD: 1.34 },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", rateToUSD: 0.92 },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧", rateToUSD: 0.78 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", rateToUSD: 155.0 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺", rateToUSD: 1.52 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦", rateToUSD: 1.37 },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", flag: "🇲🇾", rateToUSD: 4.65 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳", rateToUSD: 7.25 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳", rateToUSD: 83.5 },
  { code: "KRW", symbol: "₩", name: "South Korean Won", flag: "🇰🇷", rateToUSD: 1380.0 },
  { code: "CHF", symbol: "Fr.", name: "Swiss Franc", flag: "🇨🇭", rateToUSD: 0.89 },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", flag: "🇭🇰", rateToUSD: 7.82 },
  { code: "THB", symbol: "฿", name: "Thai Baht", flag: "🇹🇭", rateToUSD: 36.2 },
];

export const DEFAULT_CURRENCY = CURRENCIES[0]; // USD ($)

export function formatPrice(amount: number, currency: CurrencyInfo): string {
  if (currency.code === "JPY" || currency.code === "KRW") {
    return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${currency.symbol}${amount.toFixed(2)}`;
}

export function convertAmount(amount: number, fromCurrency: CurrencyInfo, toCurrency: CurrencyInfo): number {
  if (fromCurrency.code === toCurrency.code) return amount;
  // Convert from source currency to USD, then USD to target currency
  const usdAmount = amount / fromCurrency.rateToUSD;
  const converted = usdAmount * toCurrency.rateToUSD;
  return parseFloat(converted.toFixed(2));
}
