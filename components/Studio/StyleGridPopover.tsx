"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface StyleOption {
  id: string;
  label: string;
  /** Emoji shown as a large placeholder when previewUrl is null */
  icon: string;
  /** URL or absolute path to the preview image. null → show emoji placeholder */
  previewUrl: string | null;
}

interface StyleGridPopoverProps {
  items: StyleOption[];
  /** Currently selected item id */
  value: string;
  onChange: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The trigger button element */
  children: React.ReactNode;
  /** Popover header label. Defaults to "Style" */
  heading?: string;
  /** Hover overlay button label. Defaults to "Use Style" */
  hoverLabel?: string;
  /** Number of grid columns. Defaults to 3 */
  columns?: 3 | 4;
}

export function StyleGridPopover({
  items,
  value,
  onChange,
  open,
  onOpenChange,
  children,
  heading = "Style",
  hoverLabel = "Use Style",
  columns = 3,
}: StyleGridPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        className="w-[min(26rem,calc(100vw-2rem))] p-4 rounded-2xl"
        align="start"
        sideOffset={8}
        avoidCollisions
        collisionPadding={12}
      >
        {/* Header */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 pb-3">
          {heading}
        </p>

        {/* Option grid */}
        <div
          className={cn(
            "grid gap-3",
            columns === 4 ? "grid-cols-4" : "grid-cols-3"
          )}
        >
          {items.map((s) => {
            const isSelected = s.id === value;
            return (
              <button
                key={s.id}
                onClick={() => {
                  onChange(s.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "group relative rounded-xl overflow-hidden bg-muted/60 focus:outline-none",
                  "transition-all duration-150",
                  isSelected && "ring-2 ring-white ring-offset-2 ring-offset-popover"
                )}
              >
                {/* Preview image area */}
                <div className="relative aspect-square w-full">
                  {s.previewUrl ? (
                    <Image
                      src={s.previewUrl}
                      alt={s.label}
                      fill
                      sizes="(max-width: 640px) 28vw, 130px"
                      className="object-cover"
                      // eager loading so images don't blink when popover opens
                      loading="eager"
                    />
                  ) : (
                    /* Emoji placeholder — shown until previewUrl is provided */
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                      <span
                        className="text-4xl leading-none select-none"
                        aria-hidden="true"
                      >
                        {s.icon}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      "bg-black/40 backdrop-blur-[2px]",
                      "opacity-0 group-hover:opacity-100",
                      "transition-opacity duration-150",
                      // Keep overlay hidden for the already-selected card on hover
                      // (the ring already communicates selection)
                      isSelected && "group-hover:opacity-0"
                    )}
                  >
                    <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-black shadow-md">
                      {hoverLabel}
                    </span>
                  </div>
                </div>

                {/* Label */}
                <p
                  className={cn(
                    "py-1.5 text-center text-[11px] font-medium leading-none",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </p>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
