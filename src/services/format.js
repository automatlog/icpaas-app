// src/services/format.js
//
// Locale-aware formatting helpers. Centralised here so swapping the default
// currency or locale (e.g. for an upcoming international rollout) is a
// single-file change instead of grep-and-replace across screens.
//
// Hermes (RN 0.71+ via Expo SDK 50+) ships Intl.NumberFormat with full
// currency support; no polyfill needed.

const DEFAULT_LOCALE = 'en-IN';
const DEFAULT_CURRENCY = 'INR';

// Cache formatters — Intl.NumberFormat construction is comparatively
// expensive and these are called from render paths.
const formatterCache = new Map();

const getFormatter = (locale, currency, fractionDigits) => {
  const key = `${locale}|${currency}|${fractionDigits}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatterCache.set(key, f);
  }
  return f;
};

// Format a number as currency. Falls back to a hand-rolled `₹X,XXX.XX`
// shape if Intl.NumberFormat is unavailable (e.g. Hermes Intl disabled).
export const formatCurrency = (
  amount,
  { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY, fractionDigits = 2 } = {},
) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return getFormatter(locale, currency, fractionDigits).format(n);
  } catch {
    // Defensive — Intl.NumberFormat with `style: currency` was unsupported
    // on older Hermes builds. Render the digits with a basic locale-string
    // fallback so the user still sees a number rather than a crash.
    return `${n.toLocaleString(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
  }
};

// Compact thousands grouping without a currency symbol.
export const formatNumber = (
  amount,
  { locale = DEFAULT_LOCALE, fractionDigits = 0 } = {},
) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};
