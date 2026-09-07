// lib/readExport.ts
import fs from "fs";
import path from "path";
import { slotSlug } from "./slug";

const exportDir = path.join(process.cwd(), "data-export");

export type IndexEntry = {
  product: string;
  lot: string;
  slot: string;
  total: number;
  pass: number;
  yieldPct: number;
};

export type TestItem = {
  name: string;
  lower: number | null;
  upper: number | null;
  unit: string;
};

export type SpecCheckRow = {
  name: string;
  unit: string;
  lower: number | null;
  upper: number | null;
  min: number;
  max: number;
  count: number;
  outOfSpec: number;
};

export type ExportedSlot = {
  product: string;
  lot: string;
  slot: string;
  total: number;
  pass: number;
  yieldPct: number;
  items: TestItem[];
  itemAverages: number[];
  specRows: SpecCheckRow[];
  xs: number[];
  ys: number[];
  bins: number[];
  vals: number[][];
};

export function getIndex(): IndexEntry[] {
  const file = path.join(exportDir, "index.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function getExportedSlot(
  product: string,
  lot: string,
  slot: string
): ExportedSlot | null {
  const slug = slotSlug(product, lot, slot);
  const file = path.join(exportDir, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function getProductSlots(product: string): ExportedSlot[] {
  const index = getIndex().filter((e) => e.product === product);
  const result: ExportedSlot[] = [];
  for (const e of index) {
    const s = getExportedSlot(e.product, e.lot, e.slot);
    if (s) result.push(s);
  }
  return result;
}
