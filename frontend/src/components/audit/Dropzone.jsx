import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dropzone({ file, preview, onPick, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const take = (f) => {
    if (!f || disabled) return;
    onPick(f);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload hospital bill"
      className={cn(
        "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-leaf/35 bg-surface px-4 py-8 text-center transition-[border-color,background-color] duration-150",
        dragging && "border-leaf bg-leaf/5",
        disabled && "opacity-60 pointer-events-none"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.json,application/json"
        className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
      {preview ? (
        <img src={preview} alt="Bill preview" className="max-h-56 max-w-full rounded-md object-contain outline outline-1 outline-black/10" />
      ) : (
        <>
          <Upload className="text-leaf" size={28} strokeWidth={1.75} />
          <div>
            <p className="font-medium text-ink">Drop a bill photo or JSON sample</p>
            <p className="mt-1 text-sm text-ink-muted">JPG, PNG, or sample .json · max 5 MB</p>
          </div>
        </>
      )}
      {file && !preview && (
        <p className="text-sm text-ink-muted">{file.name}</p>
      )}
    </div>
  );
}
