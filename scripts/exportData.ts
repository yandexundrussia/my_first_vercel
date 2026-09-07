// scripts/exportData.ts
// 실행: npm run export-data
// data/ 안의 원본 PTT csv들을 읽어서, 웹에 배포할 요약 결과만 data-export/에 저장한다.
import fs from "fs";
import path from "path";
import {
  scanAllSlots,
  getMergedChips,
  computeYield,
  computeBin1Averages,
  checkBin1Spec,
} from "../lib/waferParser";
import { slotSlug } from "../lib/slug";

const outDir = path.join(process.cwd(), "data-export");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const allSlots = scanAllSlots().filter((s) => s.pttFiles.length > 0);
const index: {
  product: string;
  lot: string;
  slot: string;
  total: number;
  pass: number;
  yieldPct: number;
}[] = [];

let done = 0;
for (const s of allSlots) {
  try {
    const { items, chips } = getMergedChips(s.pttFiles);
    const stats = computeYield(chips);
    const itemAverages = computeBin1Averages(chips, items).map((a) => a.avg);
    const specRows = checkBin1Spec(chips, items);

    // 웨이퍼맵은 좌표/빈/값을 배열 형태로 압축 저장 (용량 절약)
    const xs = chips.map((c) => c.x);
    const ys = chips.map((c) => c.y);
    const bins = chips.map((c) => c.bin);
    const vals: number[][] = items.map((_, itemIdx) =>
      chips.map((c) => c.vals[itemIdx])
    );

    const slug = slotSlug(s.product, s.lot, s.slot);
    fs.writeFileSync(
      path.join(outDir, `${slug}.json`),
      JSON.stringify({
        product: s.product,
        lot: s.lot,
        slot: s.slot,
        total: stats.total,
        pass: stats.pass,
        yieldPct: stats.yieldPct,
        items,
        itemAverages,
        specRows,
        xs,
        ys,
        bins,
        vals,
      })
    );

    index.push({
      product: s.product,
      lot: s.lot,
      slot: s.slot,
      total: stats.total,
      pass: stats.pass,
      yieldPct: stats.yieldPct,
    });
    done++;
    console.log(`✓ ${s.product} / ${s.lot} / #${s.slot}`);
  } catch (e) {
    console.log(`✗ 실패: ${s.product} / ${s.lot} / #${s.slot} - ${e}`);
  }
}

fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index));
console.log(`\n완료: ${done}개 슬랏 추출됨 -> data-export/`);
