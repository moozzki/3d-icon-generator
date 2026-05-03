"use client";

import { useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePostHog } from 'posthog-js/react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShareCard } from "@/components/share-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Globe,
  Lock,
  Share2,
  Zap,
  Package2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerOutput,
  ColorPickerFormat,
} from "@/components/kibo-ui/color-picker";
import { useSession } from "@/lib/auth-client";

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
  const posthog = usePostHog();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { jobId } = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const isRefine = searchParams.get("action") === "refine";
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isRefineMode, setIsRefineMode] = useState(isRefine);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareFallbackFile, setShareFallbackFile] = useState<File | null>(null);

  const [visibilityTarget, setVisibilityTarget] = useState<string | null>(null);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

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
  const [isExportingPack, setIsExportingPack] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [lastQuality, setLastQuality] = useState<string | null>(null);

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Estimated durations in ms per pipeline combination
  function getEstimatedDuration(model: AiModelId, q: string, hasReference: boolean): number {
    if (hasReference) {
      if (model === "flux-2-pro") return q === "4K" ? 45000 : 40000;
      if (model === "nano-banana-2") return q === "4K" ? 50000 : 45000;
      return 45000;
    }
    if (model === "flux-2-pro") return q === "4K" ? 36000 : 32000;
    if (model === "nano-banana-2") return q === "4K" ? 40000 : 36000;
    return 36000;
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

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (generation && !hasInitialized.current) {
      if (!isRefine) {
        setPrompt("");
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
    // Allow generation if there's a prompt OR a reference image (refine mode)
    if (!prompt.trim() && !referenceImage) return;
    setIsGenerating(true);
    setResultImage(null);
    setProgress(0);

    // Start progress timer
    const estimatedDuration = getEstimatedDuration(aiModel, quality, !!referenceImage);
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

      posthog.capture('generate_icon_started');
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

      const { jobId: newJobId } = data;

      // Polling loop — resilient to transient network errors
      let status = "pending";
      let finalImageUrl = null;
      let consecutiveErrors = 0;
      const MAX_ERRORS = 5;

      while (status === "pending") {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3s
        try {
          const pollRes = await fetch(`/api/job-status?jobId=${newJobId}`);

          if (pollRes.status === 404) {
            // Job row not yet written to DB — treat as still pending
            consecutiveErrors = 0;
            continue;
          }

          if (!pollRes.ok) {
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_ERRORS) {
              throw new Error("Failed to check job status after multiple attempts.");
            }
            continue; // retry on transient server errors
          }

          consecutiveErrors = 0;
          const pollData = await pollRes.json();
          status = pollData.status;

          if (status === "completed") {
            finalImageUrl = pollData.resultImageUrl;
          } else if (status === "failed") {
            const reason = pollData.failReason ?? "Generation failed. Your credits have been refunded.";
            throw new Error(reason);
          }
        } catch (pollErr) {
          // Re-throw known terminal errors
          if (status === "failed") throw pollErr;
          if (pollErr instanceof Error && pollErr.message.includes("multiple attempts")) throw pollErr;
          // Network-level error (e.g. TimeoutError) — increment and retry
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_ERRORS) {
            throw new Error("Failed to check job status after multiple attempts.");
          }
        }
      }

      // Job done — clear timer and jump to 100%
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setProgress(100);
      setRemainingSeconds(0);

      setResultImage(finalImageUrl);
      setLastJobId(newJobId);
      setLastQuality(quality);
      window.dispatchEvent(new Event("credits-updated"));
      toast.success("Icon generated successfully!");
      router.push(`/${newJobId}`);
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

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      posthog.capture('asset_downloaded', { file_type: 'png' });
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

  const handleExportPack = async () => {
    // Use baseImage (1K/1024×1024) as source — fastest fetch & resize, no quality loss for target sizes
    const sourceUrl = generation?.baseImageUrl || resultImage || generation?.resultImageUrl;
    if (!sourceUrl) return;
    setIsExportingPack(true);
    try {
      const filename = `audora-icon-pack-${lastJobId || jobId}`;
      const exportUrl = `/api/export-pack?url=${encodeURIComponent(sourceUrl)}&filename=${encodeURIComponent(filename)}`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("Failed to generate icon pack");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Icon pack downloaded!");
    } catch {
      toast.error("Failed to generate pack. Please try again later.");
    } finally {
      setIsExportingPack(false);
    }
  };

  const handleDownloadTransparent = async () => {
    const id = lastJobId || jobId;
    if (!id) return;
    setIsRemovingBg(true);
    try {
      posthog.capture('asset_downloaded', { file_type: 'png' });
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

  const handleToggleVisibilityDirectly = async () => {
    if (!generation?.jobId) return;
    setIsUpdatingVisibility(true);
    try {
      const res = await fetch("/api/library/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: generation.jobId, isPublic: !generation.isPublic }),
      });
      if (!res.ok) throw new Error();
      toast.success(!generation.isPublic ? "Asset added to Spotlight!" : "Asset is now private");
      queryClient.invalidateQueries({ queryKey: ["generation", jobId] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["spotlight"] });
    } catch {
      toast.error("Failed to update visibility");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleConfirmSpotlight = () => {
    if (visibilityTarget) {
      handleToggleVisibilityDirectly();
      setVisibilityTarget(null);
    }
  };

  const handleShareToIG = async () => {
    if (!resultImage || !generation) return;
    setIsSharing(true);
    try {
      // Pre-fetch the icon image as a data URL so html-to-image doesn't hit CORS
      const iconRes = await fetch(`/api/download?url=${encodeURIComponent(resultImage)}&filename=icon.png`);
      const iconBlob = await iconRes.blob();
      const iconDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(iconBlob);
      });

      setShareImageUrl(iconDataUrl);

      // Wait for next render tick + a small buffer for layout
      setTimeout(async () => {
        let shareFile: File | null = null;
        let shareDataUrl: string | null = null;

        if (!shareCardRef.current) {
          setIsSharing(false);
          return;
        }
        try {
          const { toJpeg } = await import("html-to-image");

          // Safari hack: prime cache
          await toJpeg(shareCardRef.current, { quality: 0.95 });
          await new Promise(resolve => setTimeout(resolve, 150));

          shareDataUrl = await toJpeg(shareCardRef.current, { quality: 0.95 });

          const blob = await (await fetch(shareDataUrl)).blob();
          shareFile = new File([blob], `audora-story-${generation.jobId}.jpg`, { type: 'image/jpeg' });

          if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
            await navigator.share({
              files: [shareFile],
              title: 'Crafted on Audora',
              text: 'Check out this 3D icon I made on Audora!',
            });
            toast.success("Shared successfully!");
          } else {
            const link = document.createElement("a");
            link.href = shareDataUrl;
            link.download = `audora-story-${generation.jobId}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Story card downloaded!");
          }
        } catch (err) {
          console.error("IG Share Error", err);
          const isUserGestureError = err instanceof Error && (err.name === "NotAllowedError" || err.message?.includes("user gesture"));
          if (isUserGestureError) {
            if (shareFile) {
              setShareFallbackFile(shareFile);
            } else if (shareDataUrl) {
              const link = document.createElement("a");
              link.href = shareDataUrl;
              link.download = `audora-story-${generation.jobId}.jpg`;
              link.click();
              toast.success("Story card downloaded!");
            }
          } else {
            toast.error("Failed to generate share card.");
          }
        } finally {
          setIsSharing(false);
          setShareImageUrl(null);
        }
      }, 0);
    } catch (err) {
      console.error("IG Share Init Error", err);
      toast.error("Failed to initialize share.");
      setIsSharing(false);
      setShareImageUrl(null);
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
                      unoptimized
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
                      isRefineMode={isRefineMode}
                      onClear={() => {
                        // If we're in refine mode, the reference IS the previously
                        // generated icon — removing it means the user is cancelling
                        // the refine. Clear the canvas too so state is unambiguous.
                        if (isRefineMode) {
                          setResultImage(null);
                          setLastJobId(null);
                          setLastQuality(null);
                          // Strip ?action=refine from the URL so a page refresh
                          // doesn't re-trigger the refine initialization.
                          router.replace(`/${jobId}`, { scroll: false });
                        }
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
                        onDrop={(e) => {
                          e.preventDefault();
                        }}
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
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
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

            {/* Actions Accordion */}
            <Accordion type="single" collapsible className="border border-border/40 rounded-xl overflow-hidden">
              <AccordionItem value="actions" className="border-0">
                <AccordionTrigger className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:no-underline hover:bg-muted/30 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-muted-foreground/50">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    Actions
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="flex flex-col gap-1.5">
                    {/* Refine */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full font-semibold rounded-lg h-9 text-xs gap-2 justify-start"
                      onClick={() => {
                        const imageToRefine = resultImage || generation?.baseImageUrl || generation?.resultImageUrl;
                        if (imageToRefine) {
                          setReferenceImage(imageToRefine);
                          setIsRefineMode(true);
                          setPrompt("");
                          setIsSheetOpen(false);
                          setIsPromptExpanded(true);
                          // Sync URL so ?action=refine is visible — consistent with
                          // Library/Spotlight flow, and refresh will restore refine state.
                          router.replace(`/${jobId}?action=refine`, { scroll: false });
                          setTimeout(() => textareaRef.current?.focus(), 100);
                        }
                      }}
                    >
                      <Wand2 className="w-3.5 h-3.5 text-primary" />
                      Refine Icon
                    </Button>

                    {/* Export App Icons Pack */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full font-semibold rounded-lg h-9 text-xs gap-2 justify-start"
                      onClick={handleExportPack}
                      disabled={isExportingPack || !(generation?.baseImageUrl || resultImage || generation?.resultImageUrl)}
                      title="Includes iOS, Android, macOS, and Web Favicon sizes in a single ZIP."
                    >
                      {isExportingPack
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Zipping...</>
                        : <><Package2 className="w-3.5 h-3.5" /> Export App Icons (.zip)</>}
                    </Button>

                    {/* Spotlight — only show if current user owns this generation */}
                    {generation && generation.userId === session?.user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full font-semibold rounded-lg h-9 text-xs gap-2 justify-start"
                        onClick={() => {
                          if (!generation.isPublic) setVisibilityTarget(generation.jobId);
                          else handleToggleVisibilityDirectly();
                        }}
                        disabled={isUpdatingVisibility}
                      >
                        {generation.isPublic ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                        {generation.isPublic ? "Make Private" : "Spotlight"}
                      </Button>
                    )}

                    {/* Share to IG Story — only show if current user owns this generation */}
                    {generation && generation.userId === session?.user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full font-semibold rounded-lg h-9 text-xs gap-2 justify-start bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900"
                        onClick={handleShareToIG}
                        disabled={isSharing || !resultImage}
                      >
                        {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                        Share to IG Story
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Prompt Section */}
            <div className="space-y-2">
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
              <div className="text-[12px] leading-relaxed text-foreground/90 bg-muted/30 p-3 rounded-xl border border-border/40 font-medium italic max-h-[120px] sm:max-h-[140px] overflow-y-auto no-scrollbar">
                {generation?.referenceImage && !generation?.userPrompt ? (
                  <span className="flex items-center gap-1.5 opacity-80">
                    <ImageIcon className="w-3.5 h-3.5" /> Icon from reference image
                  </span>
                ) : (
                  <>&quot;{generation?.userPrompt || generation?.prompt}&quot;</>
                )}
              </div>
            </div>
          </div>

          {/* Download at bottom */}
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

      {/* ── Spotlight Confirmation Dialog ──────────────────── */}
      <AlertDialog open={!!visibilityTarget} onOpenChange={(open) => { if (!open) setVisibilityTarget(null); }}>
        <AlertDialogContent className="sm:max-w-sm rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to spotlight this icon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your generation visible to others in the community spotlight feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSpotlight} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Yes, Spotlight it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Share Fallback Modal ──────────────────── */}
      <Dialog open={!!shareFallbackFile} onOpenChange={(open) => { if (!open) setShareFallbackFile(null); }}>
        <DialogContent className="sm:max-w-sm rounded-xl text-center flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>Share to Instagram</DialogTitle>
            <DialogDescription>
              Your beautifully crafted story card is ready!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4 w-full">
            {shareFallbackFile && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(shareFallbackFile)}
                alt="Story card preview"
                className="w-48 h-auto rounded-xl border border-border/50 shadow-md mb-2"
              />
            )}
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full"
              onClick={() => {
                if (shareFallbackFile && navigator.canShare && navigator.canShare({ files: [shareFallbackFile] })) {
                  navigator.share({
                    files: [shareFallbackFile],
                    title: "Crafted on Audora",
                    text: "Check out this 3D icon I made on Audora!",
                  }).then(() => {
                    toast.success("Shared successfully!");
                    setShareFallbackFile(null);
                  }).catch(() => {
                    toast.error("Share cancelled.");
                  });
                }
              }}
            >
              Share Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Hidden Share Card (off-screen, NOT opacity-0 which causes blank captures) */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "1080px",
          height: "1920px",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {resultImage && generation && (shareImageUrl || !isSharing) && (
          <ShareCard
            imageUrl={shareImageUrl || resultImage}
            style={generation.style || style}
            position={generation.position || position}
            userName={session?.user?.name || undefined}
            ref={shareCardRef}
          />
        )}
      </div>

    </>
  );
}
