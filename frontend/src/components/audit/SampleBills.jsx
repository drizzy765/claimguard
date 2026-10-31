import Button from "@/components/ui/Button";

const SAMPLES = [
  {
    file: "bill_clean.json",
    label: "Honest — malaria outpatient",
    kind: "honest",
  },
  {
    file: "bill_honest_typhoid.json",
    label: "Honest — typhoid workup",
    kind: "honest",
  },
  {
    file: "bill_padded.json",
    label: "Padded — overcharges + duplicate",
    kind: "padded",
  },
  {
    file: "bill_unrelated.json",
    label: "Suspect — unrelated MRI on malaria",
    kind: "padded",
  },
];

export default function SampleBills({ apiBase, onPick, disabled }) {
  const load = async (name) => {
    const r = await fetch(`/samples/${name}`);
    if (!r.ok) throw new Error(`Could not load sample ${name}`);
    const blob = await r.blob();
    const file = new File([blob], name, { type: "application/json" });
    onPick(file);
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Try a sample
      </p>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <Button
            key={s.file}
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => load(s.file).catch((e) => alert(e.message))}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
