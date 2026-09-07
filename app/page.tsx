import Link from "next/link";
import { getIndex } from "@/lib/readExport";

export default function HomePage() {
  const index = getIndex();

  const grouped: Record<string, Record<string, typeof index>> = {};
  for (const s of index) {
    grouped[s.product] = grouped[s.product] || {};
    grouped[s.product][s.lot] = grouped[s.product][s.lot] || [];
    grouped[s.product][s.lot].push(s);
  }

  const productNames = Object.keys(grouped).sort();

  return (
    <main className="min-h-screen bg-[#0B0D12] text-[#E5E7EB] font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between border-b border-[#2A2E37] pb-6 mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Wafer Test Explorer
            </h1>
            <p className="text-sm text-[#6B7280] mt-1 font-mono">
              {productNames.length} products · {index.length} tested slots
            </p>
          </div>
        </div>

        {productNames.map((product) => (
          <section key={product} className="mb-10">
            <Link
              href={`/${encodeURIComponent(product)}`}
              className="inline-block text-base font-medium text-[#F59E0B] mb-4 font-mono hover:underline"
            >
              {product} →
            </Link>
            <div className="space-y-3">
              {Object.entries(grouped[product]).map(([lot, slotList]) => (
                <div
                  key={lot}
                  className="border border-[#2A2E37] rounded-md bg-[#12151C] px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#9CA3AF] font-mono">
                      {lot}
                    </span>
                    <span className="text-xs text-[#4B5563] font-mono">
                      {slotList.length} tested
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {slotList
                      .sort((a, b) => {
                        const na = parseInt(a.slot, 10);
                        const nb = parseInt(b.slot, 10);
                        if (isNaN(na) || isNaN(nb)) return a.slot.localeCompare(b.slot);
                        return na - nb;
                      })
                      .map((s, idx) => (
                        <Link
                          key={`${product}-${lot}-${s.slot}-${idx}`}
                          href={`/${encodeURIComponent(
                            product
                          )}/${encodeURIComponent(lot)}/${encodeURIComponent(
                            s.slot
                          )}`}
                          className="px-2.5 py-1 text-xs font-mono border border-[#F59E0B]/40 text-[#F59E0B] rounded hover:bg-[#F59E0B] hover:text-[#0B0D12] transition-colors"
                        >
                          #{s.slot}
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {index.length === 0 && (
          <p className="text-[#F87171] font-mono text-sm">
            data-export/ 폴더가 비어있어요. 로컬에서{" "}
            <code className="bg-[#171A21] px-1 rounded">npm run export-data</code>{" "}
            를 먼저 실행해주세요.
          </p>
        )}
      </div>
    </main>
  );
}
