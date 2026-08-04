import { Heart } from "lucide-react";
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-alert-soft">
        <Heart className="h-5 w-5 fill-alert text-alert" />
      </span>
      {!compact && (
        <span className="min-w-0">
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
