import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatNaira, verdictLabel, verdictTone } from "@/lib/utils";

export default function HistoryPage({ items, clear }) {
  const counts = items.reduce(
    (acc, it) => {
      const t = verdictTone(it.verdict);
      acc[t] = (acc[t] || 0) + 1;
      acc.savings += Number(it.savings) || 0;
      return acc;
    },
    { clean: 0, review: 0, fraud: 0, savings: 0 }
  );

  return (
    <div className="mx-auto max-w-[1040px] space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">History</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Stored only in this browser. Clearing site data removes history.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear history
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["CLEAN", counts.clean, "clean"],
          ["REVIEW", counts.review, "review"],
          ["FRAUD RISK", counts.fraud, "fraud"],
          ["Flagged ₦", formatNaira(counts.savings), "leaf"],
        ].map(([label, value, tone]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-ink-muted">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-semibold tabular">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-ink-muted">
          No audits yet.{" "}
          <Link className="font-medium text-leaf underline" to="/audit">
            Run your first bill
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-paper text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Hospital</th>
                <th className="px-3 py-2">Verdict</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Savings</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-line">
                  <td className="px-3 py-2 text-ink-muted">
                    {new Date(it.at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{it.hospital || it.filename || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge tone={verdictTone(it.verdict)}>{verdictLabel(it.verdict)}</Badge>
                  </td>
                  <td className="px-3 py-2 tabular">{it.score}</td>
                  <td className="px-3 py-2 tabular">{formatNaira(it.savings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
