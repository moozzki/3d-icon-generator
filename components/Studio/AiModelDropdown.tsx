"use client";

import { Check, ChevronDown } from "lucide-react";

import { Flux } from "@/components/ui/svgs/flux";
import { Gemini } from "@/components/ui/svgs/gemini";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AI_MODELS, type AiModelId } from "@/lib/ai-models";
import { cn } from "@/lib/utils";

interface AiModelDropdownProps {
  value: AiModelId;
  onChange: (model: AiModelId) => void;
  disabled?: boolean;
}

function ModelIcon({ id, className }: { id: AiModelId; className?: string }) {
  if (id === "nano-banana-2") {
    return <Gemini className={className} aria-hidden="true" />;
  }
  return <Flux className={className} aria-hidden="true" />;
}

export function AiModelDropdown({
  value,
  onChange,
  disabled,
}: AiModelDropdownProps) {
  const activeModel = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="h-8 text-[11px] sm:text-xs flex items-center gap-1.5 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted/60 disabled:opacity-50 disabled:pointer-events-none"
        >
          <ModelIcon id={activeModel.id} className="h-3.5 w-auto shrink-0" />
          <span className="truncate max-w-[70px] sm:max-w-none">
            {activeModel.label}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[min(14rem,calc(100vw-2rem))] rounded-xl p-1.5"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          AI Model
        </DropdownMenuLabel>
        {AI_MODELS.map((model) => {
          const isActive = model.id === value;

          return (
            <DropdownMenuItem
              key={model.id}
              onSelect={() => onChange(model.id)}
              className="gap-2.5 rounded-lg px-2 py-2 cursor-pointer"
            >
              <ModelIcon id={model.id} className="h-4 w-auto shrink-0" />
              <span className="text-[13px] font-semibold">{model.label}</span>
              <Check
                className={cn(
                  "ml-auto h-3.5 w-3.5 text-primary",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
