import { formatNaira } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

export default function LineItemsTable({ report }) {
  const items = report?.extracted?.items || [];
  const pricing = report?.pricing?.lines || [];
  const medical = report?.medical?.lines || [];

  if (!items.length) {
    return <p className="text-sm text-ink-muted">No line items extracted.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-line">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-paper text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Description</th>
            <th className="px-3 py-2 font-semibold">Qty</th>
            <th className="px-3 py-2 font-semibold">Charged</th>
            <th className="px-3 py-2 font-semibold">Tariff ref</th>
            <th className="px-3 py-2 font-semibold">Δ%</th>
            <th className="px-3 py-2 font-semibold">Price</th>
            <th className="px-3 py-2 font-semibold">Clinical</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const p = pricing.find((x) => x.line === it.line);
            const m = medical.find((x) => x.line === it.line);
            const priceTone =
              p?.flag === "overpriced" ? "fraud" : p?.flag === "ok" ? "clean" : "default";
            const medTone =
              m?.fit === "unrelated" ? "fraud" : m?.fit === "ok" ? "clean" : "review";
            return (
              <tr key={it.line} className="border-t border-line align-top">
                <td className="px-3 py-2 tabular">{it.line}</td>
                <td className="px-3 py-2">{it.description}</td>
                <td className="px-3 py-2 tabular">{it.qty}</td>
                <td className="px-3 py-2 tabular">{formatNaira(it.unit_price)}</td>
                <td className="px-3 py-2 tabular">{p ? formatNaira(p.ref_price) : "—"}</td>
                <td className="px-3 py-2 tabular">
                  {p ? `${Number(p.overcharge_pct).toFixed(0)}%` : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={priceTone}>{p?.flag || "—"}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={medTone}>{m?.fit || "—"}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
