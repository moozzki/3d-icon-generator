"use client";

import { useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UploadReferenceTrigger, UploadReferencePreview } from "@/components/Studio/UploadReference";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Wand2,
  ChevronDown,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize,
  MessageSquareText,
  Coins,
  Copy,
  Check,
  Download,
  Loader2,
  Eraser,
  Palette,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerOutput,
  ColorPickerFormat,
} from "@/components/kibo-ui/color-picker";

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

export default function StudioDetailPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const isRefine = searchParams.get("action") === "refine";
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isRefineMode, setIsRefineMode] = useState(isRefine);

  const { data: generation } = useQuery({
    queryKey: ["generation", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/library/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch generation");
      const json = await res.json();
      return json.data;
    },
    enabled: !!jobId,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [position, setPosition] = useState("Isometric");
  const [isPositionOpen, setIsPositionOpen] = useState(false);
  const [style, setStyle] = useState("plastic");
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [quality, setQuality] = useState("2K");
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  // Incrementing this key forces the ColorPicker to remount (reset internal state)
  // only when the user explicitly clears the color — breaking any feedback loop.
  const [colorPickerKey, setColorPickerKey] = useState(0);

  const handleClearColor = () => {
    setColor(null);
    setColorPickerKey((k) => k + 1);
  };
  const [aiModel] = useState<AiModelId>("flux-2-pro");
  const [copied, setCopied] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [lastQuality, setLastQuality] = useState<string | null>(null);

  const selectedModel = AI_MODELS.find((m) => m.id === aiModel)!;
  const creditCost = getCreditCost(aiModel, quality);

  // Helper: convert [r, g, b, a] array from ColorPicker onChange to a HEX string
  const rgbaToHex = (rgba: number[]): string => {
    const [r, g, b] = rgba;
    return (
      "#" +
      [r, g, b]
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("")
    ).toUpperCase();
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workAreaRef = useRef<HTMLDivElement>(null);

  const [zoomScale, setZoomScale] = useState(1);

  // Zoom handlers
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.2, 5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.2, 0.1));
  const handleZoomToFit = () => setZoomScale(1);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (generation && !hasInitialized.current) {
      if (!isRefine) {
        setPrompt(generation.userPrompt || generation.prompt || "");
      } else {
        setPrompt("");
        // Use baseImageUrl for lower cost, fallback to resultImageUrl
        setReferenceImage(generation.baseImageUrl || generation.resultImageUrl || null);
        setIsRefineMode(true);
      }
      const formattedPos = generation.position || "isometric";
      const matchedPos = POSITIONS.find(p => p.toLowerCase().replace(" ", "_") === formattedPos) || "Isometric";
      setPosition(matchedPos);
      setStyle(generation.style || "plastic");
      setQuality(generation.quality || "2K");
      setColor(generation.color || null);
      setResultImage(generation.resultImageUrl || null);

      // Auto-open sheet if this is view mode (not refine mode) and image exists
      // Wait, let's strictly follow the instruction: "trigger side sheet menu muncul ketika user meng klik image yang berhasil di generate pada dashboard"
      // So no auto-open here, leave it closed.
      hasInitialized.current = true;
    }
  }, [generation, isRefine]);

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
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

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
          aiModel,
          referenceImage,
          isRefine: isRefineMode,
          color,
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
          const reason = pollData.failReason ?? "Generation job failed on the server.";
          throw new Error(reason);
        }
      }

      setResultImage(finalImageUrl);
      setLastJobId(jobId);
      setLastQuality(quality);
      window.dispatchEvent(new Event("credits-updated"));
      toast.success("Icon generated successfully!");
      router.push(`/${jobId}`);
    } catch (err) {
      console.error("Generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const q = lastQuality || generation?.quality || quality;
      const id = lastJobId || jobId;
      const filename = `audora-${q.toLowerCase()}-${id}.png`;
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

  const handleDownloadTransparent = async () => {
    const id = lastJobId || jobId;
    if (!id) return;
    setIsRemovingBg(true);
    try {
      const res = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove background");

      const q = lastQuality || generation?.quality || quality;
      const filename = `audora-${q.toLowerCase()}-${id}-transparent.png`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(data.url)}&filename=${filename}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Transparent download started!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove background";
      toast.error(message);
    } finally {
      setIsRemovingBg(false);
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

              {/* Generating state */}
              {isGenerating && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-5 mt-10"
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
                    Crafting your 3D icon with {selectedModel.label}...
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
                  className="relative group flex flex-col items-center gap-6 mt-10"
                >
                  <button
                    className="relative pointer-events-auto cursor-pointer focus:outline-none rounded-2xl ring-offset-background transition-shadow hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => !isGenerating && setIsSheetOpen(true)}
                  >
                    <Image
                      src={resultImage}
                      alt="Generated 3D icon"
                      width={512}
                      height={512}
                      className="max-h-[300px] sm:max-h-[420px] w-auto max-w-[85vw] sm:max-w-none h-auto object-contain drop-shadow-2xl rounded-2xl"
                      priority
                    />
                    <div className="absolute inset-0 rounded-2xl pointer-events-none bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  </button>
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
                    < Wand2 className="w-3.5 h-3.5 text-primary" />
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
                      onClear={() => {
                        setReferenceImage(null);
                        setIsRefineMode(false);
                      }}
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

                        {/* Color picker */}
                        <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                          <PopoverTrigger asChild>
                            <button className="h-8 text-[11px] sm:text-xs flex items-center gap-1.5 border border-border/50 bg-muted/40 hover:bg-muted/60 transition-colors shrink-0 px-2 sm:px-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {color ? (
                                <span
                                  className="w-3.5 h-3.5 rounded-sm border border-border/60 shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                              ) : (
                                <Palette className="w-3.5 h-3.5 opacity-50" />
                              )}
                              <span className="truncate max-w-[56px] sm:max-w-none">
                                {color ? color.toUpperCase() : "Color"}
                              </span>
                              {color && (
                                <span
                                  role="button"
                                  aria-label="Clear color"
                                  onClick={(e) => { e.stopPropagation(); handleClearColor(); }}
                                  className="ml-0.5 hover:text-foreground text-muted-foreground/50 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-64 p-3 rounded-xl space-y-3"
                            align="start"
                            sideOffset={8}
                            avoidCollisions
                            collisionPadding={12}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5">
                              Color
                            </p>
                            <ColorPicker
                              key={colorPickerKey}
                              defaultValue="#000000"
                              onChange={(rgba) => {
                                setColor(rgbaToHex(rgba as unknown as number[]));
                              }}
                            >
                              <ColorPickerSelection className="h-32 rounded-lg" />
                              <ColorPickerHue />
                              <div className="flex items-center gap-2">
                                <ColorPickerEyeDropper className="h-8 w-8" />
                                <ColorPickerOutput />
                                <ColorPickerFormat className="flex-1" />
                              </div>
                            </ColorPicker>
                            {color && (
                              <button
                                onClick={() => handleClearColor()}
                                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 border border-border/40 rounded-lg hover:bg-muted/50"
                              >
                                Clear Color
                              </button>
                            )}
                          </PopoverContent>
                        </Popover>

                        {/* Upload reference (ImageUp) */}
                        <UploadReferenceTrigger
                          referenceUrl={referenceImage}
                          onReferenceChanged={(url) => {
                            setReferenceImage(url);
                            setIsRefineMode(false);
                          }}
                        />
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

      {/* ── Detail Side Sheet ────────────────── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen} modal={false}>
        <SheetContent
          side="right"
          showCloseButton={false}
          hideOverlay={true}
          className="!inset-y-auto !right-4 !top-20 !bottom-4 !h-auto w-[260px] sm:w-[280px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-0 flex flex-col overflow-hidden"
        >
          <SheetTitle className="sr-only">Generation Details</SheetTitle>
          <SheetDescription className="sr-only">View icon generation settings and actions.</SheetDescription>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-0 space-y-5">
            {/* Info list */}
            <div className="flex flex-col text-[13px]">

              <div className="flex justify-between items-center py-2.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Style</span>
                <span className="font-semibold text-foreground">
                  {STYLES.find(s => s.id === style)?.label || "Plastic"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Camera Angle</span>
                <span className="font-semibold text-foreground">
                  {generation?.position ? generation.position.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Isometric"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Quality</span>
                <span className="font-semibold text-foreground">{generation?.quality || "2K"}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Size</span>
                <span className="font-semibold text-foreground">
                  {generation?.quality === "4K" ? "4096 × 4096px" : "2048 × 2048px"}
                </span>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest px-1">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-3.5 w-3.5" /> Prompt
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generation?.userPrompt || generation?.prompt || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Prompt copied!");
                  }}
                  className="p-1 hover:bg-muted/80 rounded-md transition-colors text-muted-foreground/50 hover:text-foreground"
                  title="Copy Prompt"
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <div className="text-[12px] leading-relaxed text-foreground/90 bg-muted/30 p-3 rounded-xl border border-border/40 font-medium italic">
                &quot;{generation?.userPrompt || generation?.prompt}&quot;
              </div>
            </div>

          </div>

          {/* Export at bottom */}
          <div className="p-4 pt-3 border-t border-border/50 bg-background mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full font-semibold rounded-xl h-10 shadow-sm text-sm gap-2" disabled={isRemovingBg}>
                  {isRemovingBg ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Removing Background...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Download Image <ChevronDown className="w-3 h-3 opacity-60 ml-auto" /></>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[calc(260px-2rem)] sm:w-[calc(280px-2rem)] rounded-xl">
                <DropdownMenuItem onClick={handleDownload} className="gap-3 py-2.5 cursor-pointer">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium">Original Background</span>
                    <span className="text-[11px] text-muted-foreground">White background · PNG</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDownloadTransparent} disabled={isRemovingBg} className="gap-3 py-2.5 cursor-pointer">
                  <Eraser className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium">Transparent Background</span>
                    <span className="text-[11px] text-muted-foreground">No background · PNG</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
