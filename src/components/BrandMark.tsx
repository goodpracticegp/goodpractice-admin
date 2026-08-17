import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={compact ? "/icons/icon-192.png" : "/brand/good-practice-header-logo.png"}
        alt="Good Practice GP Surgery"
        className={cn(
          "shrink-0 object-contain",
          compact ? "h-10 w-10 rounded-xl bg-white" : "h-12 w-auto max-w-[190px]",
        )}
      />
      {!compact && (
        <span className="sr-only">
          <span className="block truncate text-sm font-bold leading-tight">
            Good Practice (GP) Surgery
          </span>
          <span className="block truncate text-xs leading-tight opacity-75">
            Quality Care. Close to Home.
          </span>
        </span>
      )}
    </div>
  );
}
