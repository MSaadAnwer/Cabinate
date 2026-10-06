export function stockQuantity(quantity: number, unit: string, packSize = 1, contentsUnit = "pcs") {
  const normalized = unit.trim().toLowerCase();
  const dozen = ["dozen", "dozens", "dz"].includes(normalized);
  const pack = ["pack", "packs", "box", "boxes", "bag", "bags"].includes(normalized);
  const amount = quantity * (dozen ? 12 : pack ? packSize : 1);
  if (!Number.isFinite(amount) || amount <= 0 || (pack && (!Number.isFinite(packSize) || packSize <= 0)))
    throw new Error("Use positive quantities and pack sizes.");
  return { quantity: Number(amount.toFixed(6)), unit: dozen ? "pcs" : pack ? contentsUnit.trim() : unit.trim() };
}

export function remainingStock(quantity: number, used: number) {
  if (!Number.isFinite(used) || used <= 0 || used > quantity)
    throw new Error("Enter an amount greater than zero and no more than you have.");
  return Number((quantity - used).toFixed(6));
}

export function restockedQuantity(quantity: number, added: number) {
  const total = Number((quantity + added).toFixed(6));
  if (!Number.isFinite(added) || added <= 0 || !Number.isFinite(total) || total <= quantity)
    throw new Error("Enter a positive amount to add.");
  return total;
}

export function usageStep(unit: string, quantity: number) {
  const fractional = /^(gallons?|gal|liters?|litres?|l|kg|lb|lbs|oz|cups?)$/i.test(unit.trim());
  return Math.min(fractional ? 0.25 : 1, quantity);
}

export function adjustUsage(amount: number, direction: -1 | 1, step: number, quantity: number) {
  return Number(Math.max(Math.min(step, quantity), Math.min(quantity, amount + direction * step)).toFixed(6));
}
