// Type shim for src/services/format.js
export interface FormatCurrencyOptions {
  /** BCP 47 locale tag — defaults to 'en-IN'. */
  locale?: string;
  /** ISO 4217 currency code — defaults to 'INR'. */
  currency?: string;
  /** Fixed digits after the decimal — defaults to 2. */
  fractionDigits?: number;
}

export interface FormatNumberOptions {
  locale?: string;
  fractionDigits?: number;
}

export function formatCurrency(amount: number | string | null | undefined, opts?: FormatCurrencyOptions): string;
export function formatNumber(amount: number | string | null | undefined, opts?: FormatNumberOptions): string;
