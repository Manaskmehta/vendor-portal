export function calcLineGstAmount(taxable: number, gstPercent: number): number {
  if (!Number.isFinite(taxable) || !Number.isFinite(gstPercent) || taxable <= 0 || gstPercent <= 0) {
    return 0;
  }
  return Number(((taxable * gstPercent) / 100).toFixed(2));
}

export function calcLineTotalInclGst(taxable: number, gstPercent: number): number {
  return Number((taxable + calcLineGstAmount(taxable, gstPercent)).toFixed(2));
}
