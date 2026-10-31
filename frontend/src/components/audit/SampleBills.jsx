import Button from "@/components/ui/Button";

const SAMPLES = [
  {
    file: "bill_padded.jpg",
    label: "Photo · padded (demo)",
    kind: "padded",
    type: "image/jpeg",
  },
  {
    file: "bill_clean.jpg",
    label: "Photo · clean",
    kind: "honest",
    type: "image/jpeg",
  },
  {
    file: "bill_padded.json",
    label: "JSON · padded",
    kind: "padded",
    type: "application/json",
  },
  {
    file: "bill_clean.json",
    label: "JSON · clean",
    kind: "honest",
    type: "application/json",
  },
  {
    file: "bill_honest_typhoid.json",
    label: "JSON · typhoid",
    kind: "honest",
    type: "application/json",
  },
  {
    file: "bill_unrelated.json",
    label: "JSON · unrelated MRI",
    kind: "padded",
    type: "application/json",
  },
];

export default function SampleBills({ onPick, disabled }) {
  const load = async (name, type) => {
    const r = await fetch(`/samples/${name}`);
    if (!r.ok) throw new Error(`Could not load sample ${name}`);
    const blob = await r.blob();
    const file = new File([blob], name, { type: type || blob.type || "application/octet-stream" });
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
            onClick={() => load(s.file, s.type).catch((e) => alert(e.message))}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
