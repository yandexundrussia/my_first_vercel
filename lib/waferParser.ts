// lib/waferParser.ts
import fs from "fs";
import path from "path";

export type Chip = {
  site: number;
  serial: number;
  bin: number;
  x: number;
  y: number;
  vals: number[]; // items 배열과 같은 순서의 테스트 측정값
};

export type TestItem = {
  name: string;
  lower: number | null;
  upper: number | null;
  unit: string;
};

export type ParsedWafer = {
  fileName: string;
  lotNumber: string;
  items: TestItem[];
  chips: Chip[];
};

export type SlotEntry = {
  product: string; // data/ 바로 아래 폴더명
  lot: string; // 그 아래 폴더명
  slot: string; // '#' 뒤의 문자열
  slotFolderName: string; // 원본 폴더명 (# 포함)
  pttFiles: string[]; // 이 슬랏 폴더 아래에서 발견된 PTT*.csv 전체 경로들 (재귀 검색)
};

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

export function parsePTTCsv(text: string, fileName: string): ParsedWafer {
  const lines = text.split(/\r?\n/);
  const rows = lines.map((l) => (l.length ? splitCSVLine(l) : []));

  let lotNumber = "";
  let testNameRow: string[] | null = null;
  let lowerRow: string[] | null = null;
  let upperRow: string[] | null = null;
  let unitRow: string[] | null = null;
  let headerRowIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.length) continue;
    const first = (row[0] || "").trim();

    if (first.startsWith("Datalog for Lot Number")) {
      lotNumber = row[1] || "";
    }
    if (first === "Test Name") testNameRow = row;
    if (first === "Lower Limit") lowerRow = row;
    if (first === "Upper Limit") upperRow = row;
    if (first === "Units") unitRow = row;
    if (first.startsWith("Site #")) {
      headerRowIdx = i;
      break;
    }
  }

  const items: TestItem[] = [];
  if (testNameRow) {
    for (let c = 5; c < testNameRow.length; c++) {
      const name = testNameRow[c];
      if (!name) continue;
      items.push({
        name: name.replace(/"/g, ""),
        lower: lowerRow ? parseFloat(lowerRow[c]) : null,
        upper: upperRow ? parseFloat(upperRow[c]) : null,
        unit: unitRow ? (unitRow[c] || "").replace(/"/g, "") : "",
      });
    }
  }

  const chips: Chip[] = [];
  if (headerRowIdx >= 0) {
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.length || !row[0]) continue;
      const site = parseInt(row[0], 10);
      const serial = parseInt(row[1], 10);
      const bin = parseInt(row[2], 10);
      const x = parseInt(row[3], 10);
      const y = parseInt(row[4], 10);
      if (isNaN(site) || isNaN(bin) || isNaN(x) || isNaN(y)) continue;
      const vals: number[] = [];
      for (let c = 5; c < 5 + items.length; c++) {
        const v = parseFloat(row[c]);
        vals.push(isNaN(v) ? NaN : v);
      }
      chips.push({ site, serial, bin, x, y, vals });
    }
  }

  return { fileName, lotNumber, items, chips };
}

export function computeYield(chips: Chip[]) {
  const total = chips.length;
  let pass = 0;
  const binCounts: Record<number, number> = {};
  for (const c of chips) {
    if (c.bin === 1) pass++;
    binCounts[c.bin] = (binCounts[c.bin] || 0) + 1;
  }
  return {
    total,
    pass,
    fail: total - pass,
    yieldPct: total ? (pass / total) * 100 : 0,
    binCounts,
  };
}

// 폴더 하나 아래를 재귀적으로 훑어서 PTT*.csv 전체 경로를 모두 찾는다.
// "2. After EST" 같은 정확한 폴더명에 의존하지 않고, 어떤 깊이에 있든 다 찾는다.
function findPTTFilesRecursive(dir: string): string[] {
  const found: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findPTTFilesRecursive(full));
    } else if (
      entry.isFile() &&
      /^PTT/i.test(entry.name) &&
      /\.csv$/i.test(entry.name)
    ) {
      found.push(full);
    }
  }
  return found;
}

export type MergedSlotData = {
  items: TestItem[];
  chips: Chip[];
};

// 슬랏에 PTT csv가 여러 개(재시험) 있으면, 수정시간 순으로 정렬 후
// 같은 좌표(x,y)의 칩은 더 나중 파일 값으로 덮어써서 "최종 결과"로 병합한다.
export function getMergedChips(pttFiles: string[]): MergedSlotData {
  const filesWithTime = pttFiles.map((f) => ({
    path: f,
    mtime: (() => {
      try {
        return fs.statSync(f).mtimeMs;
      } catch {
        return 0;
      }
    })(),
  }));
  filesWithTime.sort((a, b) => a.mtime - b.mtime);

  let items: TestItem[] = [];
  const chipMap = new Map<string, Chip>();

  for (const f of filesWithTime) {
    let text: string;
    try {
      text = fs.readFileSync(f.path, "latin1");
    } catch {
      continue;
    }
    const parsed = parsePTTCsv(text, f.path);
    if (parsed.items.length) items = parsed.items;
    for (const c of parsed.chips) {
      chipMap.set(`${c.x}_${c.y}`, c);
    }
  }

  return { items, chips: Array.from(chipMap.values()) };
}

export type ItemStat = {
  name: string;
  unit: string;
  lower: number | null;
  upper: number | null;
  avg: number;
};

// Bin1(합격) 칩들만 대상으로 항목별 평균값 계산
export function computeBin1Averages(chips: Chip[], items: TestItem[]): ItemStat[] {
  const sums = new Array(items.length).fill(0);
  const counts = new Array(items.length).fill(0);
  for (const c of chips) {
    if (c.bin !== 1) continue;
    for (let i = 0; i < items.length; i++) {
      const v = c.vals[i];
      if (v === undefined || isNaN(v)) continue;
      sums[i] += v;
      counts[i] += 1;
    }
  }
  return items.map((it, i) => ({
    name: it.name,
    unit: it.unit,
    lower: it.lower,
    upper: it.upper,
    avg: counts[i] ? sums[i] / counts[i] : NaN,
  }));
}

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

// Bin1(합격)로 분류된 칩들이 실제로 스펙(LSL/USL) 안에 들어오는지 확인
export function checkBin1Spec(chips: Chip[], items: TestItem[]): SpecCheckRow[] {
  return items.map((it, i) => {
    let min = Infinity;
    let max = -Infinity;
    let count = 0;
    let outOfSpec = 0;
    for (const c of chips) {
      if (c.bin !== 1) continue;
      const v = c.vals[i];
      if (v === undefined || isNaN(v)) continue;
      count++;
      if (v < min) min = v;
      if (v > max) max = v;
      const lo = it.lower;
      const hi = it.upper;
      if ((lo !== null && !isNaN(lo) && v < lo) || (hi !== null && !isNaN(hi) && v > hi)) {
        outOfSpec++;
      }
    }
    return {
      name: it.name,
      unit: it.unit,
      lower: it.lower,
      upper: it.upper,
      min: count ? min : NaN,
      max: count ? max : NaN,
      count,
      outOfSpec,
    };
  });
}

export type SlotYield = {
  lot: string;
  slot: string;
  fileName: string;
  total: number;
  pass: number;
  yieldPct: number;
  items: TestItem[];
  itemAverages: number[]; // items와 같은 순서, bin1 평균값
};

// 특정 제품의 모든 랏/슬랏에 대해 (재시험 병합된) PTT 데이터를 읽어 Yield/항목평균을 계산해준다.
export function getProductYields(product: string): SlotYield[] {
  const norm = (s: string) => s.normalize("NFC").trim();
  const all = scanAllSlots();
  const target = all.filter(
    (s) => norm(s.product) === norm(product) && s.pttFiles.length > 0
  );

  const results: SlotYield[] = [];
  for (const s of target) {
    try {
      const { items, chips } = getMergedChips(s.pttFiles);
      const stats = computeYield(chips);
      const bin1Avgs = computeBin1Averages(chips, items).map((a) => a.avg);
      results.push({
        lot: s.lot,
        slot: s.slot,
        fileName: s.pttFiles[s.pttFiles.length - 1].split(/[\\/]/).pop() || "",
        total: stats.total,
        pass: stats.pass,
        yieldPct: stats.yieldPct,
        items,
        itemAverages: bin1Avgs,
      });
    } catch {
      // 실패한 슬랏은 건너뜀
    }
  }
  return results;
}

// data/ 아래 제품/랏/슬랏(#으로 시작하는 폴더) 구조를 재귀 스캔.
// 슬랏 폴더 밑에 있는 하위 폴더 이름은 상관없이(After EST, 2.After EST 등)
// PTT*.csv를 재귀적으로 다 찾아서 붙여준다.
export function scanAllSlots(): SlotEntry[] {
  const dataDir = path.join(process.cwd(), "data");
  const result: SlotEntry[] = [];
  if (!fs.existsSync(dataDir)) return result;

  function isDir(p: string) {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }

  // 슬랏(# 폴더)을 몇 단계 깊이에서 만나든 상관없이 재귀로 찾는다.
  function walkForSlots(
    dir: string,
    product: string,
    lot: string
  ) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      if (!isDir(full)) continue;
      if (name.startsWith("#")) {
        const slot = name.slice(1);
        const pttFiles = findPTTFilesRecursive(full);
        result.push({ product, lot, slot, slotFolderName: name, pttFiles });
      } else {
        // # 폴더가 아니면 더 깊이 들어가서 찾아본다 (깊이 제한 없음)
        walkForSlots(full, product, lot);
      }
    }
  }

  for (const product of fs.readdirSync(dataDir)) {
    const productDir = path.join(dataDir, product);
    if (!isDir(productDir)) continue;

    for (const lot of fs.readdirSync(productDir)) {
      const lotDir = path.join(productDir, lot);
      if (!isDir(lotDir)) continue;
      walkForSlots(lotDir, product, lot);
    }
  }

  return result;
}
