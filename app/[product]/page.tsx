import Link from "next/link";
import { getProductSlots } from "@/lib/readExport";
import ProductMetricsChart from "@/components/ProductMetricsChart";

function yieldColor(pct: number) {
  if (pct >= 90) return "#34D399";
  if (pct >= 70) return "#F59E0B";
  return "#F87171";
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product: rawProduct } = await params;
  const product = decodeURIComponent(rawProduct);
  const slots = getProductSlots(product);

  const sorted = [...slots].sort((a, b) => {
    if (a.lot !== b.lot) return a.lot.localeCompare(b.lot);
    const na = parseInt(a.slot, 10);
    const nb = parseInt(b.slot, 10);
    if (isNaN(na) || isNaN(nb)) return a.slot.localeCompare(b.slot);
    return na - nb;
  });

  const items =
    sorted[0]?.items.map((it) => ({
      name: it.name,
      unit: it.unit,
      lower: it.lower,
      upper: it.upper,
    })) || [];

  const chartData = sorted.map((s) => ({
    label: `${s.lot}#${s.slot}`,
    yieldPct: Number(s.yieldPct.toFixed(2)),
    itemAverages: s.itemAverages,
  }));

  const avgYield = sorted.length
    ? sorted.reduce((sum, s) => sum + s.yieldPct, 0) / sorted.length
    : 0;

  return (
    <main className="min-h-screen bg-[#0B0D12] text-[#E5E7EB] font-sans">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/"
          className="text-xs text-[#6B7280] hover:text-[#F59E0B] font-mono transition-colors"
        >
          ← back
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight mt-3 mb-1">
          {product}
        </h1>
        <p className="text-xs text-[#6B7280] font-mono mb-8">
          {sorted.length} slots tested · avg yield{" "}
          <span style={{ color: yieldColor(avgYield) }}>
            {avgYield.toFixed(2)}%
          </span>
        </p>

        <h2 className="text-sm font-medium text-[#9CA3AF] mb-3 font-mono">
          trend (yield / leakage / capacitance ...)
        </h2>
        <div className="mb-10">
          <ProductMetricsChart data={chartData} items={items} />
        </div>

        <h2 className="text-sm font-medium text-[#9CA3AF] mb-3 font-mono">
          all slots
        </h2>
        <div className="border border-[#2A2E37] rounded-md overflow-hidden">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-[#2A2E37] text-[#6B7280] text-xs">
                <th className="text-left px-4 py-2 font-normal">lot</th>
                <th className="text-left px-4 py-2 font-normal">slot</th>
                <th className="text-right px-4 py-2 font-normal">total</th>
                <th className="text-right px-4 py-2 font-normal">pass</th>
                <th className="text-right px-4 py-2 font-normal">yield</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => (
                <tr
                  key={`${s.lot}-${s.slot}-${idx}`}
                  className="border-b border-[#2A2E37] last:border-0 hover:bg-[#171A21]"
                >
                  <td className="px-4 py-2 text-[#9CA3AF]">{s.lot}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/${encodeURIComponent(
                        product
                      )}/${encodeURIComponent(s.lot)}/${encodeURIComponent(
                        s.slot
                      )}`}
                      className="text-[#F59E0B] hover:underline"
                    >
                      #{s.slot}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {s.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-[#34D399]">
                    {s.pass.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-2 text-right"
                    style={{ color: yieldColor(s.yieldPct) }}
                  >
                    {s.yieldPct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <p className="text-[#F87171] font-mono text-sm mt-4">
            이 제품에서 테스트된 슬랏이 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}
