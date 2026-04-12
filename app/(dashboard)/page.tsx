"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UploadReferenceTrigger, UploadReferencePreview } from "@/components/Studio/UploadReference";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CornerRightUp,
  Coins,
  Download,
  Wand2,
  ChevronDown,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize,
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
  { id: "plush", label: "Plushy", icon: "🧸" },
  { id: "toy_block", label: "Toy Block", icon: "🧱" },
  { id: "metallic", label: "Metallic", icon: "⚙️" },
];

const QUALITIES = ["2K", "4K"];

const AI_MODELS = [
  {
    id: "flux-2-pro",
    label: "Flux 2 Pro",
    badge: "Fast",
    description: "Sharp details, fast generation. Best for most icons.",
    costs: { "2K": 1, "4K": 2 },
  },
  {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    badge: "Hi-Res",
    description: "Native 2K output, premium quality. Slower.",
    costs: { "2K": 2, "4K": 3 },
  },
] as const;

type AiModelId = (typeof AI_MODELS)[number]["id"];

function getCreditCost(aiModel: AiModelId, quality: string): number {
  const model = AI_MODELS.find((m) => m.id === aiModel);
  if (!model) return 1;
  return model.costs[quality as "2K" | "4K"] ?? 1;
}

export default function StudioPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [position, setPosition] = useState("Isometric");
  const [isPositionOpen, setIsPositionOpen] = useState(false);
  const [style, setStyle] = useState("plastic");
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [quality, setQuality] = useState("2K");
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [aiModel] = useState<AiModelId>("flux-2-pro");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedModel = AI_MODELS.find((m) => m.id === aiModel)!;
  const creditCost = getCreditCost(aiModel, quality);

  // Estimated durations in ms per pipeline combination
  function getEstimatedDuration(model: AiModelId, q: string): number {
    if (model === "flux-2-pro") return q === "4K" ? 28000 : 20000;
    if (model === "nano-banana-2") return q === "4K" ? 45000 : 35000;
    return 25000;
  }

  // Phase label based on % progress
  function getPhaseLabel(pct: number, q: string): string {
    if (pct < 40) return "Generating base image...";
    if (pct < 70) return `Upscaling to ${q}...`;
    return "Finalizing & saving...";
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workAreaRef = useRef<HTMLDivElement>(null);

  const [zoomScale, setZoomScale] = useState(1);

  // Zoom handlers
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.2, 5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.2, 0.1));
  const handleZoomToFit = () => setZoomScale(1);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    const target = workAreaRef.current;
    if (target) {
      target.addEventListener("wheel", handleWheel, { passive: false });

      // Initial scroll to center
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;
      target.scrollTop = (scrollHeight - clientHeight) / 2;
    }

    return () => {
      if (target) target.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") {
        return;
      }
      if (e.ctrlKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
        }
      }
      if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        handleZoomToFit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResultImage(null);
    setProgress(0);

    // Start progress timer
    const estimatedDuration = getEstimatedDuration(aiModel, quality);
    const startTime = Date.now();
    const TARGET_PCT = 92; // cap at 92% during polling, jump to 100% on complete
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / estimatedDuration) * TARGET_PCT, TARGET_PCT);
      setProgress(pct);
      setRemainingSeconds(Math.max(0, Math.round((estimatedDuration - elapsed) / 1000)));
    }, 200);

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
          aiModel,
          referenceImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start generation.");
      }

      const { jobId } = data;

      // Polling loop
      let status = "pending";
      let finalImageUrl = null;

      while (status === "pending") {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2s
        const pollRes = await fetch(`/api/job-status?jobId=${jobId}`);
        if (!pollRes.ok) {
          throw new Error("Failed to check job status.");
        }
        const pollData = await pollRes.json();
        status = pollData.status;

        if (status === "completed") {
          finalImageUrl = pollData.resultImageUrl;
        } else if (status === "failed") {
          // Surface the failure reason if available (set by onFailure or content policy)
          const reason = pollData.failReason
            ?? "Generation failed. Your credits have been refunded.";
          throw new Error(reason);
        }
      }

      // Job done — clear timer and jump to 100%
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setProgress(100);
      setRemainingSeconds(0);

      setResultImage(finalImageUrl);
      window.dispatchEvent(new Event("credits-updated"));
      toast.success("Icon generated successfully!");
    } catch (err) {
      console.error("Generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setIsGenerating(false);
      // Small delay before resetting progress so 100% flash is visible
      setTimeout(() => setProgress(0), 600);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const filename = `audora-${quality.toLowerCase()}-gen.png`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(resultImage)}&filename=${filename}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");
    } catch {
      toast.error("Failed to download image.");
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
      <div className="relative flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden bg-background">

        {/* Scrollable container for pan */}
        <div ref={workAreaRef} className="w-full h-full overflow-auto relative dot-canvas pb-32 scroll-smooth no-scrollbar">

          {/* Scalable inner canvas with a very large height to allow "unlimited" scroll */}
          <div
            className="min-w-full min-h-[calc(100%-8rem)] flex flex-col items-center justify-center origin-center py-[200vh]"
            style={{
              transform: `scale(${zoomScale})`,
              transition: "transform 0.1s ease-out"
            }}
          >
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

              {/* Generating state — progress bar */}
              {isGenerating && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-6 mt-10 w-72"
                >
                  {/* Spinning icon */}
                  <div className="relative w-24 h-24">
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-3 rounded-full border-2 border-primary/10 border-b-primary/60"
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wand2 className="w-7 h-7 text-primary/70" />
                    </div>
                  </div>

                  {/* Animated phase label */}
                  <motion.p
                    key={getPhaseLabel(progress, quality)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-semibold text-foreground"
                  >
                    {getPhaseLabel(progress, quality)}
                  </motion.p>

                  {/* Progress bar */}
                  <div className="w-full">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "linear", duration: 0.2 }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                        {Math.round(progress)}%
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {remainingSeconds > 0
                          ? `~${remainingSeconds}s remaining`
                          : "Finishing up..."}
                      </span>
                    </div>
                  </div>

                  {/* Model tag */}
                  <p className="text-[11px] text-muted-foreground/50">
                    {selectedModel.label} · {quality}
                  </p>
                </motion.div>
              )}

              {/* Result image */}
              {resultImage && !isGenerating && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.88, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="relative group flex flex-col items-center gap-6 mt-10"
                >
                  <div className="relative pointer-events-auto">
                    <Image
                      src={resultImage}
                      alt="Generated 3D icon"
                      width={512}
                      height={512}
                      className="max-h-[300px] sm:max-h-[420px] w-auto max-w-[85vw] sm:max-w-none h-auto object-contain drop-shadow-2xl rounded-2xl"
                      priority
                    />
                    <div className="absolute inset-0 rounded-2xl pointer-events-none bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  </div>

                  {/* Download button under image */}
                  <div className="flex flex-wrap justify-center items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      className="h-9 px-4 text-xs font-semibold gap-2 rounded-xl shadow-sm border-border/60 hover:bg-muted/50"
                    >
                      <Download className="h-4 w-4" />
                      Download .png
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Extracted Floating Zoom Controls ────────────────── */}
        <div className="absolute top-4 right-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 bg-card/50 backdrop-blur-md">
                {Math.round(zoomScale * 100)}%
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleZoomIn}>
                <ZoomIn className="mr-2 h-4 w-4" />
                <span>Zoom In</span>
                <DropdownMenuShortcut>Ctrl +</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleZoomOut}>
                <ZoomOut className="mr-2 h-4 w-4" />
                <span>Zoom Out</span>
                <DropdownMenuShortcut>Ctrl -</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setZoomScale(0.5)}>
                <span>50%</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setZoomScale(1)}>
                <span>100%</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setZoomScale(2)}>
                <span>200%</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleZoomToFit}>
                <Maximize className="mr-2 h-4 w-4" />
                <span>Zoom to Fit</span>
                <DropdownMenuShortcut>Shift 1</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Floating Prompt Bar ────────────────────────────── */}

        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-3 sm:px-4 flex flex-col items-center pointer-events-none">
          <motion.div
            layout
            initial={false}
            animate={{
              width: isPromptExpanded ? "100%" : "180px",
              height: isPromptExpanded ? "auto" : "48px",
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 35,
              mass: 1
            }}
            style={{ transformOrigin: "bottom center" }}
            className={cn(
              "relative border border-border/70 bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto",
              isPromptExpanded ? "rounded-xl sm:rounded-2xl" : "rounded-full cursor-pointer hover:bg-card transition-colors border-primary/20 bg-primary/5"
            )}
            onClick={() => !isPromptExpanded && setIsPromptExpanded(true)}
          >
            <AnimatePresence mode="wait">
              {!isPromptExpanded ? (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.5, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 15 }}
                  className="flex items-center justify-center h-full w-full gap-2.5 px-4"
                >
                  <div className="bg-primary/20 p-1 rounded-full shrink-0">
                    <Wand2 className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-primary/90 whitespace-nowrap">Write Prompt</span>
                </motion.div>
              ) : (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="w-full relative"
                >
                  {/* Toggle Collapse Button - Top Center */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPromptExpanded(false);
                      }}
                      className="p-1 px-4 text-muted-foreground/30 hover:text-foreground/60 transition-colors group flex flex-col items-center"
                      title="Collapse"
                    >
                      <div className="w-8 h-1 rounded-full bg-muted-foreground/20 group-hover:bg-muted-foreground/40 transition-colors mb-0.5" />
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-full">
                    {/* Credits badge - Top Right */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-none">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                        <Coins className="w-3 h-3" />
                        {creditCost} Credit{creditCost > 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Reference Image Preview */}
                    <UploadReferencePreview
                      referenceUrl={referenceImage}
                      onClear={() => setReferenceImage(null)}
                    />

                    {/* Textarea row */}
                    <div className={cn("px-3 sm:px-4 pb-1 sm:pb-2", referenceImage ? "pt-1" : "pt-7 sm:pt-8")}>
                      <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3}
                        placeholder="Describe your 3D icon..."
                        className="w-full resize-none bg-transparent text-base sm:text-[15px] font-medium text-foreground placeholder:text-muted-foreground/45 outline-none leading-relaxed pr-24"
                      />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 pb-3 pt-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 pr-2">

                        {/* Upload reference (ImageUp) */}
                        <UploadReferenceTrigger
                          referenceUrl={referenceImage}
                          onReferenceChanged={setReferenceImage}
                        />

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
                          <PopoverContent className="w-[min(14rem,calc(100vw-2rem))] p-2 rounded-xl" align="start" sideOffset={8} avoidCollisions collisionPadding={12}>
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
                          <PopoverContent className="w-[min(14rem,calc(100vw-2rem))] p-2 rounded-xl" align="start" sideOffset={8} avoidCollisions collisionPadding={12}>
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
                          <PopoverContent className="w-[min(9rem,calc(100vw-2rem))] p-2 rounded-xl" align="start" sideOffset={8} avoidCollisions collisionPadding={12}>
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
                      </div>


                      {/* Generate button (Icon only) */}
                      <Button
                        size="icon"
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shadow-sm hover:shadow-primary/20 transition-all shrink-0 ml-auto"
                      >
                        {isGenerating ? (
                          <CornerRightUp className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                        ) : (
                          <CornerRightUp className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-3 select-none">
            Audora is an AI. Generations can sometimes be unexpected.
          </p>
        </div>
      </div>
    </>
  );
}
