import catalog from "./commercial-terms.json";
// Keep user-portal/src/modules/procurement/data/commercial-terms.json identical to this catalog.

export type CommercialTerm = {
  short: string;
  label: string;
  inco?: boolean;
};

export const PAYMENT_TERMS: CommercialTerm[] = catalog.paymentTerms;
export const DELIVERY_TERMS: CommercialTerm[] = catalog.deliveryTerms;

export const QUOTATION_DELIVERY_TERM_OPTIONS = DELIVERY_TERMS.map((term) => term.label);
export const QUOTATION_PAYMENT_TERM_OPTIONS = PAYMENT_TERMS.map((term) => term.label);

export function optionsIncludingCurrent(terms: readonly CommercialTerm[], current?: string | null): CommercialTerm[] {
  const value = current?.trim() ?? "";
  if (!value || terms.some((term) => term.label === value)) return [...terms];
  return [...terms, { short: value, label: value }];
}

export function termOptionText(term: CommercialTerm): string {
  if (!term.short || term.short === term.label || term.label.includes(`(${term.short})`)) return term.label;
  return `${term.label} (${term.short})`;
}
