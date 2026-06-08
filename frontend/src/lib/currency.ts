"use client";

import { Document } from "@/lib/types";

export type SupportedCurrency = "EUR" | "USD" | "CNY" | "GBP" | "CHF";

const EUR_REFERENCE_RATES: Record<SupportedCurrency, number> = {
  EUR: 1,
  USD: 1.1525,
  CNY: 7.9495,
  GBP: 0.87253,
  CHF: 0.9213,
};

const SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: "€",
  USD: "$",
  CNY: "¥",
  GBP: "£",
  CHF: "CHF",
};

const SYMBOL_TO_CODE: Record<string, SupportedCurrency> = {
  "€": "EUR",
  "$": "USD",
  "¥": "CNY",
  "£": "GBP",
  CHF: "CHF",
};

export const DEFAULT_TARGET_CURRENCY: SupportedCurrency = "EUR";

export function normalizeCurrencyCode(input?: unknown): SupportedCurrency {
  if (typeof input !== "string" || !input.trim()) return DEFAULT_TARGET_CURRENCY;
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  if (upper in EUR_REFERENCE_RATES) return upper as SupportedCurrency;
  if (trimmed in SYMBOL_TO_CODE) return SYMBOL_TO_CODE[trimmed];
  return DEFAULT_TARGET_CURRENCY;
}

export function getCurrencySymbol(code: SupportedCurrency): string {
  return SYMBOLS[code];
}

function getDocumentSourceAmount(doc: Document): { amount: number; currency: SupportedCurrency } | null {
  const d = doc as Record<string, unknown>;

  if (typeof d.original_cost === "number" && d.original_cost > 0) {
    return {
      amount: d.original_cost,
      currency: normalizeCurrencyCode(d.original_currency),
    };
  }

  if (typeof d.cost === "number" && d.cost > 0) {
    return {
      amount: d.cost,
      currency: normalizeCurrencyCode(d.currency),
    };
  }

  return null;
}

export function getDocumentCostInEur(doc: Document): number {
  const source = getDocumentSourceAmount(doc);
  if (!source) return 0;
  return source.amount / EUR_REFERENCE_RATES[source.currency];
}

export function convertEurToTarget(amountEur: number, targetCurrency: SupportedCurrency): number {
  return amountEur * EUR_REFERENCE_RATES[targetCurrency];
}

export function getDocumentDisplayCost(doc: Document, targetCurrency: SupportedCurrency): number {
  const amountEur = getDocumentCostInEur(doc);
  if (amountEur <= 0) return 0;
  return convertEurToTarget(amountEur, targetCurrency);
}

export function sumDocumentsCost(
  docs: Document[],
  targetCurrency: SupportedCurrency,
  options?: { prorateMultiDay?: boolean },
): number {
  let total = 0;

  for (const doc of docs) {
    let value = getDocumentDisplayCost(doc, targetCurrency);
    if (value <= 0) continue;

    if (options?.prorateMultiDay) {
      const d = doc as Record<string, unknown>;
      if (typeof d.start_date === "string" && typeof d.end_date === "string" && d.start_date !== d.end_date) {
        const start = new Date(`${d.start_date}T12:00:00`);
        const end = new Date(`${d.end_date}T12:00:00`);
        const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
        value /= nights;
      }
    }

    total += value;
  }

  return Math.round(total * 100) / 100;
}
