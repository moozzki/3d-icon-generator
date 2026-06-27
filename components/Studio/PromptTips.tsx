"use client";

import { Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PROMPT_TIPS = [
  "a slice of pizza wearing sunglasses",
  "a fierce dragon breathing fire",
  "a golden trophy with wings",
];

interface PromptTipsProps {
  visible: boolean;
  onSelect: (tip: string) => void;
}

export function PromptTips({ visible, onSelect }: PromptTipsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="prompt-tips"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex items-start gap-2 px-3 sm:px-4 pt-1.5 pb-0.5"
        >
          {/* Icon */}
          <div className="flex items-center shrink-0 mt-[3px]">
            <Lightbulb className="w-3 h-3 text-amber-400/70" />
          </div>

          {/* Chips */}
          <div className="flex flex-row flex-wrap gap-1.5">
            {PROMPT_TIPS.map((tip, i) => (
              <motion.button
                key={tip}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.18, delay: i * 0.05, ease: "easeOut" }}
                onClick={() => onSelect(tip)}
                className={cn(
                  "h-6 px-2.5 rounded-full border text-[10px] font-medium leading-none",
                  "border-border/40 bg-muted/40 text-muted-foreground/65",
                  "hover:border-primary/30 hover:bg-primary/8 hover:text-primary/80",
                  "transition-colors duration-150 cursor-pointer shrink-0"
                )}
              >
                {tip}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
