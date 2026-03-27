"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sparkles,
  Download,
  Wand2,
  UploadCloud,
  ChevronDown,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

const POSITIONS = [
  "Isometric",
  "Front Facing",
  "Back Facing",
  "Side Facing",
  "Three Quarter",
  "Top Down",
  "Dimetric",
];

const STYLES = [
  { id: "plastic", label: "Plastic", icon: "🫧" },
  { id: "clay", label: "Clay", icon: "🏺" },
  { id: "glass", label: "Glass", icon: "🧊" },
  { id: "plush", label: "Plush", icon: "🧸" },
  { id: "toy_block", label: "Toy Block", icon: "🧱" },
  { id: "metallic", label: "Metallic", icon: "⚙️" },
];

const QUALITIES = ["2K", "4K"];

export default function StudioPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    "A cute red fox sitting on a wooden log, stylized 3D rendered"
  );
  const [position, setPosition] = useState("Isometric");
  const [isPositionOpen, setIsPositionOpen] = useState(false);
  const [style, setStyle] = useState("plastic");
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [quality, setQuality] = useState("2K");
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResultImage(null);

    try {
      // Convert 'Front Facing' -> 'front_facing'
      const formattedPosition = position.toLowerCase().replace(" ", "_");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: prompt,
          position: formattedPosition,
          style,
          quality,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate image.");
      }

      setResultImage(data.resultUrl);
      window.dispatchEvent(new Event("credits-updated"));
      toast.success("Icon generated successfully!");
    } catch (err) {
      console.error("Generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <>
      {/* ── Full-canvas work area ───────────────────────────── */}
      <div className="relative flex h-full min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center">

        {/* ── Canvas: preview lives directly here ─────────────── */}
        <AnimatePresence mode="wait">
          {/* Idle empty state */}
          {!isGenerating && !resultImage && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 select-none"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mb-1 shadow-sm">
                <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground/70">
                Your 3D icon will appear here
              </p>
              <p className="text-xs text-muted-foreground/40">
                Type a prompt below and press Generate
              </p>
            </motion.div>
          )}

          {/* Generating state */}
          {isGenerating && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="relative w-28 h-28">
                {/* Outer spinning ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                />
                {/* Inner spinning ring */}
                <motion.div
                  className="absolute inset-3 rounded-full border-2 border-primary/10 border-b-primary/60"
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wand2 className="w-7 h-7 text-primary/70" />
                </div>
              </div>

              <motion.p
                className="text-sm font-medium text-muted-foreground"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2.2 }}
              >
                Crafting your 3D icon...
              </motion.p>
            </motion.div>
          )}

          {/* Result image */}
          {resultImage && !isGenerating && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative group flex flex-col items-center gap-4"
            >
              <div className="relative">
                <img
                  src={resultImage}
                  alt="Generated 3D icon"
                  className="max-h-[300px] sm:max-h-[420px] w-auto max-w-[85vw] sm:max-w-none h-auto object-contain drop-shadow-2xl rounded-2xl"
                />
                {/* Hover download overlay */}
                <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-3 right-3 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floating prompt bar ─────────────────────────────── */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-3 sm:px-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl sm:rounded-2xl border border-border/70 bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/10 overflow-hidden"
          >
            {/* Textarea row */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-3.5 pb-1 sm:pb-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Describe your 3D icon... (Enter to generate)"
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none leading-relaxed"
              />
            </div>

            {/* Controls row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-3 sm:px-3.5 pb-3 pt-1">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
                {/* Style popover */}
                <Popover open={isStyleOpen} onOpenChange={setIsStyleOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-8 text-[11px] sm:text-xs flex items-center gap-1 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="truncate max-w-[70px] sm:max-w-none">
                        {STYLES.find(s => s.id === style)?.icon} {STYLES.find(s => s.id === style)?.label}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 rounded-xl" align="start" sideOffset={8}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-1 pb-2">
                      Style
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setStyle(s.id);
                            setIsStyleOpen(false);
                          }}
                          className={cn(
                            "text-xs text-left px-2.5 py-1.5 rounded-md transition-colors focus:outline-none flex items-center gap-2",
                            style === s.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <span>{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Camera angle popover */}
                <Popover open={isPositionOpen} onOpenChange={setIsPositionOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-8 text-[11px] sm:text-xs flex items-center gap-1 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="truncate max-w-[70px] sm:max-w-none">{position}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 rounded-xl" align="start" sideOffset={8}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-1 pb-2">
                      Camera Angle
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {POSITIONS.map((pos) => (
                        <button
                          key={pos}
                          onClick={() => {
                            setPosition(pos);
                            setIsPositionOpen(false);
                          }}
                          className={cn(
                            "text-xs text-left px-2.5 py-1.5 rounded-md transition-colors focus:outline-none",
                            position === pos
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Quality popover */}
                <Popover open={isQualityOpen} onOpenChange={setIsQualityOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-8 text-[11px] sm:text-xs flex items-center gap-1 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {quality}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-36 p-2 rounded-xl" align="start" sideOffset={8}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-1 pb-2">
                      Quality
                    </p>
                    <div className="flex flex-col gap-1">
                      {QUALITIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setQuality(q);
                            setIsQualityOpen(false);
                          }}
                          className={cn(
                            "text-xs text-left px-2.5 py-1.5 rounded-md transition-colors focus:outline-none",
                            quality === q
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Upload reference */}
                <button className="h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-border/50 flex items-center gap-1.5 transition-colors shrink-0">
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Reference</span>
                </button>
              </div>

              {/* Generate button */}
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="h-9 sm:h-8 px-4 text-[11px] sm:text-xs font-semibold gap-1.5 rounded-xl shadow-sm hover:shadow-primary/20 transition-all w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate · {quality === "2K" ? "1" : "2"} Credit{quality !== "2K" && "s"}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
