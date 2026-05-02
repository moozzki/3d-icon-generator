"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Clapperboard, ImageIcon, CornerDownRight, Coins, Info,
  ZoomIn, ZoomOut, Copy, Download, Check,
  Play, Loader2, Video, ChevronDown, Wand2, Maximize,
} from "lucide-react";
import { UploadReferencePreview } from "@/components/Studio/UploadReference";
import { cn } from "@/lib/utils";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerOutput,
  ColorPickerFormat,
} from "@/components/kibo-ui/color-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface Generation {
  id: number;
  jobId: string;
  status: string;
  userPrompt?: string | null;
  prompt: string;
  resultImageUrl: string | null;
  baseImageUrl: string | null;
  quality: string;
  style: string;
  createdAt: string;
}

type Resolution = "720p" | "1080p";
type AspectRatio = "16:9" | "9:16";

const CREDIT_COST: Record<Resolution, number> = { "720p": 2, "1080p": 3 };


// Poll hook
function useAnimationPoll(jobId: string | null, enabled: boolean) {
  const [status, setStatus] = useState<string>("pending");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [prevJobId, setPrevJobId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (jobId !== prevJobId) {
    setPrevJobId(jobId);
    setStatus("pending");
    setVideoUrl(null);
    setFailReason(null);
  }

  useEffect(() => {
    if (!jobId || !enabled) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/animation-status?jobId=${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "completed" && data.resultVideoUrl) {
          setVideoUrl(data.resultVideoUrl);
          if (intervalRef.current) clearInterval(intervalRef.current);
          window.dispatchEvent(new Event("credits-updated"));
        }
        if (data.status === "failed") {
          setFailReason(data.failReason);
          if (intervalRef.current) clearInterval(intervalRef.current);
          window.dispatchEvent(new Event("credits-updated"));
        }
      } catch { /* ignore */ }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId, enabled]);

  return { status, videoUrl, failReason };
}

// Progress phases
const PHASES = [
  { label: "Removing background...", duration: 6000 },
  { label: "Composing canvas...", duration: 4000 },
  { label: "Generating animation...", duration: 80000 },
  { label: "Finalizing...", duration: 10000 },
];

export default function AnimatePage() {
  // Asset selection
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Generation | null>(null);

  // Form state
  const [actionPrompt, setActionPrompt] = useState("");
  const [resolution, setResolution] = useState<Resolution>("720p");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [bgColor, setBgColor] = useState("#FFFFFF");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progressPhase, setProgressPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  // Result state
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);

  // Zoom
  const [zoomScale, setZoomScale] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workAreaRef = useRef<HTMLDivElement>(null);

  // Helper: convert [r, g, b, a] array from ColorPicker onChange to a HEX string
  const handleColorChange = useCallback((rgba: number[]) => {
    const [r, g, b] = rgba;
    const hex = (
      "#" +
      [r, g, b]
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("")
    ).toUpperCase();
    setBgColor(hex);
  }, []);

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

  // Fetch library assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery<Generation[]>({
    queryKey: ["library"],
    queryFn: async () => {
      const res = await fetch("/api/library");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    },
  });

  const completedAssets = assets.filter(
    (a) => a.status === "completed" && a.baseImageUrl
  );

  // Poll for animation status
  const { status: jobStatus, videoUrl, failReason } = useAnimationPoll(
    currentJobId,
    isGenerating
  );

  // Handle poll results
  useEffect(() => {
    if (jobStatus === "completed" && videoUrl) {
      setResultVideoUrl(videoUrl);
      setIsGenerating(false);
      setProgress(100);
      toast.success("Animation generated!");
    }
    if (jobStatus === "failed") {
      setIsGenerating(false);
      setProgress(0);
      toast.error(failReason || "Animation failed.");
    }
  }, [jobStatus, videoUrl, failReason]);

  // Simulated progress
  useEffect(() => {
    if (!isGenerating) return;
    setProgressPhase(0);
    setProgress(0);

    let phase = 0;
    let elapsed = 0;
    const totalDuration = PHASES.reduce((s, p) => s + p.duration, 0);
    const interval = setInterval(() => {
      elapsed += 200;
      const pct = Math.min((elapsed / totalDuration) * 95, 95);
      setProgress(pct);

      let acc = 0;
      for (let i = 0; i < PHASES.length; i++) {
        acc += PHASES[i].duration;
        if (elapsed < acc) { phase = i; break; }
        if (i === PHASES.length - 1) phase = i;
      }
      setProgressPhase(phase);
    }, 200);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Generate handler
  const handleGenerate = useCallback(async () => {
    if (!selectedAsset || !actionPrompt.trim()) {
      toast.error("Please select an icon and describe the animation.");
      return;
    }
    setIsGenerating(true);
    setResultVideoUrl(null);

    try {
      const res = await fetch("/api/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceGenerationId: selectedAsset.id,
          actionPrompt: actionPrompt.trim(),
          resolution,
          aspectRatio,
          backgroundColor: bgColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start animation");
      }

      setCurrentJobId(data.jobId);
      window.dispatchEvent(new Event("credits-updated"));
    } catch (err) {
      setIsGenerating(false);
      toast.error(err instanceof Error ? err.message : "Failed to start animation");
    }
  }, [selectedAsset, actionPrompt, resolution, aspectRatio, bgColor]);

  const creditCost = CREDIT_COST[resolution];
  const hasAssets = completedAssets.length > 0;

  return (
    <>
      <div className="relative flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden bg-background">
        {/* Canvas Area */}
        <div ref={workAreaRef} className="flex-1 w-full h-full overflow-auto relative dot-canvas pb-32 scroll-smooth no-scrollbar">
          {/* Scalable inner canvas with a very large height to allow "unlimited" scroll */}
          <div
            className="min-w-full min-h-[calc(100%-8rem)] flex flex-col items-center justify-center origin-center py-[200vh]"
            style={{
              transform: `scale(${zoomScale})`,
              transition: "transform 0.1s ease-out"
            }}
          >
            <AnimatePresence mode="wait">
            {/* Empty State */}
            {!hasAssets && !assetsLoading && (
              <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4 text-center select-none">
                <div className="w-20 h-20 rounded-3xl bg-muted/40 flex items-center justify-center">
                  <Video className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h2 className="text-xl font-heading font-bold text-foreground/70">No 3D Icons Yet</h2>
                <p className="text-sm text-muted-foreground max-w-[300px]">
                  Generate your first 3D icon in the Studio, then come back here to animate it into a looping video.
                </p>
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20 mt-2">
                  <Link href="/"><Wand2 className="h-4 w-4 mr-2" />Go to Studio</Link>
                </Button>
              </motion.div>
            )}

            {/* Loading */}
            {assetsLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </motion.div>
            )}

            {/* No Selection */}
            {hasAssets && !selectedAsset && !assetsLoading && !resultVideoUrl && (
              <motion.div key="select" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4 text-center select-none">
                <div className="w-20 h-20 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mb-1 shadow-sm">
                  <Clapperboard className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h2 className="text-xl font-heading font-bold text-muted-foreground/70">Animate Your 3D Icon</h2>
                <p className="text-sm text-muted-foreground/40 max-w-[300px]">
                  Turn your 3D icon into a stunning 4-second looping animation.
                </p>
                <Button onClick={() => setSelectorOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 mt-2">
                  <ImageIcon className="h-4 w-4 mr-2" />Select 3D Icon
                </Button>
              </motion.div>
            )}

            {/* Selected Asset Preview / Generating / Result */}
            {(selectedAsset || resultVideoUrl) && (
              <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center justify-center m-auto origin-center">
                {resultVideoUrl ? (
                  <div className="relative cursor-pointer group" onClick={() => setSheetOpen(true)}>
                    <video src={resultVideoUrl} autoPlay loop muted playsInline
                      className="max-w-[500px] max-h-[60vh] rounded-2xl shadow-2xl border border-border/30 object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl bg-black/20">
                      <div className="bg-black/50 backdrop-blur-md p-3 rounded-full"><Play className="h-6 w-6 text-white" /></div>
                    </div>
                  </div>
                ) : selectedAsset?.baseImageUrl ? (
                  <div className="relative group">
                    <Image src={selectedAsset.baseImageUrl} alt="Selected icon" width={400} height={400}
                      className="max-h-[300px] sm:max-h-[420px] w-auto max-w-[85vw] sm:max-w-none h-auto object-contain drop-shadow-2xl" unoptimized />
                    {isGenerating && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur-sm">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                ) : null}
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
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress Bar */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-6">
              <div className="bg-card/90 backdrop-blur-xl border border-border/40 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{PHASES[progressPhase]?.label}</span>
                  <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    style={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Prompt Bar */}
        {hasAssets && !assetsLoading && (
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-3 sm:px-4 flex flex-col items-center pointer-events-none z-30">
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
                    className="flex items-center justify-center h-full w-full gap-2.5 px-4 h-[48px]"
                  >
                    <div className="bg-primary/20 p-1 rounded-full shrink-0">
                      <Clapperboard className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-primary/90 whitespace-nowrap">Animation Prompt</span>
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
                        referenceUrl={selectedAsset?.baseImageUrl || null}
                        isRefineMode={false}
                        onClear={() => {
                          setSelectedAsset(null);
                          setResultVideoUrl(null);
                        }}
                      />

                      {/* Textarea row */}
                      <div className={cn("px-3 sm:px-4 pb-1 sm:pb-2", selectedAsset ? "pt-1" : "pt-7 sm:pt-8")}>
                        <textarea
                          ref={textareaRef}
                          value={actionPrompt}
                          onChange={(e) => setActionPrompt(e.target.value)}
                          rows={3}
                          placeholder="e.g., The 3D icon gently hovers, spins 360..."
                          disabled={isGenerating}
                          className="w-full resize-none bg-transparent text-base sm:text-[15px] font-medium text-foreground placeholder:text-muted-foreground/45 outline-none leading-relaxed pr-24"
                        />
                      </div>

                      {/* Controls row */}
                      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 pb-3 pt-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 pr-2">

                          {/* Prompt Info Tooltip */}
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 focus:outline-none">
                                  <Info className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[250px] leading-relaxed">
                                💡 Pro-Tip: The AI animates the existing pose. It cannot drastically change geometry (e.g., a sitting character cannot stand). Keep prompts focused on micro-interactions.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Resolution popover */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="h-8 text-[11px] sm:text-xs flex items-center gap-1 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <span className="truncate max-w-[70px] sm:max-w-none">{resolution}</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[min(11rem,calc(100vw-2rem))] p-2 rounded-xl" align="start" sideOffset={8} avoidCollisions collisionPadding={12}>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-1 pb-2">Resolution</p>
                              <div className="flex flex-col gap-1">
                                {(["720p", "1080p"] as Resolution[]).map((r) => (
                                  <PopoverClose asChild key={r}>
                                    <button onClick={() => setResolution(r)}
                                      className={cn("text-xs text-left px-2.5 py-1.5 rounded-md transition-colors focus:outline-none", resolution === r ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")}>
                                      {r}
                                    </button>
                                  </PopoverClose>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Aspect Ratio popover */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="h-8 text-[11px] sm:text-xs flex items-center gap-1 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <span className="truncate max-w-[70px] sm:max-w-none">{aspectRatio}</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} className="w-[min(10rem,calc(100vw-2rem))] p-2 rounded-xl" align="start" sideOffset={8} avoidCollisions collisionPadding={12}>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-1 pb-2">Aspect Ratio</p>
                              <div className="flex flex-col gap-1">
                                <TooltipProvider delayDuration={300}>
                                  {(["16:9", "9:16"] as AspectRatio[]).map((ar) => (
                                    <Tooltip key={ar}>
                                      <PopoverClose asChild>
                                        <TooltipTrigger asChild>
                                          <button onClick={() => setAspectRatio(ar)}
                                            className={cn("text-xs text-left px-2.5 py-1.5 rounded-md transition-colors focus:outline-none", aspectRatio === ar ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")}>
                                            {ar} {ar === "16:9" ? "Landscape" : "Portrait"}
                                          </button>
                                        </TooltipTrigger>
                                      </PopoverClose>
                                      <TooltipContent side="right" className="text-xs max-w-[150px]">
                                        {ar === "16:9" 
                                          ? "16:9 is suitable for websites, desktop, etc." 
                                          : "9:16 is suitable for social media, mobile, etc."}
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </TooltipProvider>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Background Color picker */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="h-8 text-[11px] sm:text-xs flex items-center gap-1.5 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <span className="w-3.5 h-3.5 rounded-sm border border-border/60 shrink-0" style={{ backgroundColor: bgColor }} />
                                <span className="truncate max-w-[56px] sm:max-w-none">BG Color</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-3 rounded-xl" align="start" sideOffset={8} avoidCollisions collisionPadding={12}>
                              <div className="flex items-center gap-1.5 px-0.5 mb-2">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Background</p>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground/40 hover:text-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="text-xs max-w-[220px] leading-relaxed">
                                      🎨 Why HEX Color? MP4 videos do not support transparent backgrounds natively. Enter your UI&apos;s background color so the video blends seamlessly, or choose &apos;Chroma Green&apos; to remove it later in your video editor.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <ColorPicker value={bgColor} onChange={handleColorChange}>
                                <ColorPickerSelection className="h-40 sm:h-48 rounded-lg" />
                                <div className="flex items-center gap-3 my-3 px-1">
                                  <ColorPickerEyeDropper className="h-5 w-5 shrink-0 border-none bg-transparent shadow-none hover:bg-muted p-0.5" />
                                  <ColorPickerHue className="h-4 rounded-full flex-1" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <ColorPickerOutput className="h-9 w-20 shrink-0 bg-secondary border-none" />
                                  <div className="flex-1 overflow-hidden">
                                    <ColorPickerFormat />
                                  </div>
                                </div>
                              </ColorPicker>

                              {/* Quick Presets */}
                              <div className="mt-4 px-0.5">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Quick Presets</p>
                                <div className="flex gap-2.5">
                                  <button onClick={() => setBgColor("#FFFFFF")} className="w-7 h-7 rounded-md border border-border/60 hover:scale-110 shadow-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ backgroundColor: "#FFFFFF" }} title="White" />
                                  <button onClick={() => setBgColor("#000000")} className="w-7 h-7 rounded-md border border-border/60 hover:scale-110 shadow-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ backgroundColor: "#000000" }} title="Black" />
                                  <button onClick={() => setBgColor("#00FF00")} className="w-7 h-7 rounded-md border border-border/60 hover:scale-110 shadow-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ backgroundColor: "#00FF00" }} title="Chroma Green" />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                        </div>

                        {/* Generate button (Icon only) */}
                        <Button
                          size="icon"
                          onClick={handleGenerate}
                          disabled={isGenerating || (!actionPrompt.trim() && !selectedAsset)}
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shadow-sm hover:shadow-primary/20 transition-all shrink-0 ml-auto"
                        >
                          {isGenerating ? (
                            <CornerDownRight className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                          ) : (
                            <CornerDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </div>

      {/* Asset Selector Modal */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogTitle className="font-heading text-lg">Select 3D Icon</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose a completed 3D icon from your library to animate.
          </DialogDescription>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
            {completedAssets.map((asset) => (
              <button key={asset.id} onClick={() => { setSelectedAsset(asset); setSelectorOpen(false); setResultVideoUrl(null); }}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg ${selectedAsset?.id === asset.id ? "border-primary shadow-primary/20" : "border-border/30 hover:border-primary/40"}`}>
                {asset.baseImageUrl && (
                  <Image src={asset.baseImageUrl} alt="3D icon" fill sizes="150px" className="object-cover" unoptimized />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Side Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetTitle className="font-heading text-lg mb-4">Animation Details</SheetTitle>
          <SheetDescription className="sr-only">Details about the generated animation</SheetDescription>
          {resultVideoUrl && (
            <div className="space-y-6">
              <video src={resultVideoUrl} autoPlay loop muted playsInline className="w-full rounded-xl border border-border/30 shadow-lg" />

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground font-medium">Resolution</span>
                  <span className="text-xs font-semibold">{resolution}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground font-medium">Aspect Ratio</span>
                  <span className="text-xs font-semibold">{aspectRatio}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground font-medium">Duration</span>
                  <span className="text-xs font-semibold">4 seconds (loop)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground font-medium">Background</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border border-border/60" style={{ backgroundColor: bgColor }} />
                    <span className="text-xs font-mono font-semibold">{bgColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Action Prompt</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { navigator.clipboard.writeText(actionPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Copied!"); }}>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{actionPrompt}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1 rounded-xl h-10 font-semibold gap-2"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = `/api/download?url=${encodeURIComponent(resultVideoUrl)}&filename=audora-animation-${currentJobId}.mp4`;
                    link.download = `audora-animation-${currentJobId}.mp4`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success("Download started!");
                  }}>
                  <Download className="h-4 w-4" />Download MP4
                </Button>
                <Button variant="outline" className="rounded-xl h-10 font-semibold gap-2"
                  onClick={() => { navigator.clipboard.writeText(resultVideoUrl); toast.success("CDN link copied!"); }}>
                  <Copy className="h-4 w-4" />Copy Link
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
