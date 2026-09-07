// lib/slug.ts
export function slotSlug(product: string, lot: string, slot: string): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9가-힣._-]/g, "_");
  return `${clean(product)}__${clean(lot)}__${clean(slot)}`;
}
