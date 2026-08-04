import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  "Out of Stock": "bg-alert text-alert-foreground border-alert",
  "Reorder Required": "bg-warn text-warn-foreground border-warn",
  "Low Stock": "bg-caution text-caution-foreground border-caution",
  "In Stock": "bg-ok text-ok-foreground border-ok",
  Discontinued: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STYLES[status] ?? STYLES["Discontinued"],
        className,
      )}
    >
      {status}
    </span>
  );
}
