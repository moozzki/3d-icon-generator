"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { usePostHog } from 'posthog-js/react';
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ImageIcon, Download, Wand2, MoreVertical, Trash2, Eraser, Loader2, ZoomIn, ChevronDown, Globe, Lock, Share2, X, Copy, Video, Play, Package2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ShareCard } from "@/components/share-card";
import { useSession } from "@/lib/auth-client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Generation {
  id: number;
  userId: string;
  jobId: string;
  status: string;
  aiModel: string | null;
  prompt: string;
  userPrompt?: string | null;
  referenceImage: string | null;
  position: string;
  style: string;
  quality: string;
  cost: number;
  creditCost: number;
  resultImageUrl: string | null;
  baseImageUrl?: string | null;
  isPublic: boolean;
  createdAt: string;
}

interface AnimationItem {
  id: number;
  jobId: string | null;
  status: string | null;
  actionPrompt: string;
  resolution: string;
  aspectRatio: string;
  backgroundColor: string;
  creditCost: number;
  resultVideoUrl: string | null;
  baseImageUrl: string | null;
  createdAt: string | null;
}

const STYLE_LABELS: Record<string, { label: string; icon: string }> = {
  plastic: { label: "Plastic", icon: "🫧" },
  clay: { label: "Clay", icon: "🏺" },
  glass: { label: "Glass", icon: "🧊" },
  plush: { label: "Plush", icon: "🧸" },
  toy_block: { label: "Toy Block", icon: "🧱" },
  metallic: { label: "Metallic", icon: "⚙️" },
};



function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}



export default function LibraryPage() {
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [removingBgJobId, setRemovingBgJobId] = useState<string | null>(null);
  const [exportingPackJobId, setExportingPackJobId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
  
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [selectedImageForShare, setSelectedImageForShare] = useState<Generation | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  const [shareFallbackFile, setShareFallbackFile] = useState<File | null>(null);
  
  const [visibilityTarget, setVisibilityTarget] = useState<Generation | null>(null);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState("icons");
  const [selectedVideo, setSelectedVideo] = useState<AnimationItem | null>(null);

  const {
    data: generations = [],
    isLoading,
    isError,
  } = useQuery<Generation[]>({
    queryKey: ["library"],
    queryFn: async () => {
      const res = await fetch("/api/library");
      if (!res.ok) throw new Error("Failed to fetch library");
      const json = await res.json();
      return json.data;
    },
  });

  // Only show completed generations with a result image
  const completedGenerations = generations.filter(
    (item) => item.status === "completed" && item.resultImageUrl
  );

  const filteredLibrary = completedGenerations.filter((item) =>
    (item.userPrompt || item.prompt).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    data: animationItems = [],
    isLoading: animationsLoading,
  } = useQuery<AnimationItem[]>({
    queryKey: ["library-animations"],
    queryFn: async () => {
      const res = await fetch("/api/library/animations");
      if (!res.ok) throw new Error("Failed to fetch animations");
      const json = await res.json();
      return json.data;
    },
  });

  const filteredAnimations = animationItems.filter((item) =>
    item.actionPrompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt copied to clipboard!");
  };

  const handleDownload = async (item: Generation) => {
    if (!item.resultImageUrl) return;
    try {
      posthog.capture('asset_downloaded', { file_type: 'png' });
      const filename = `audora-${item.quality.toLowerCase()}-${item.jobId}.png`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(item.resultImageUrl)}&filename=${filename}`;

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

  const handleDownloadTransparent = async (item: Generation) => {
    if (!item.jobId) return;
    setRemovingBgJobId(item.jobId);
    try {
      posthog.capture('asset_downloaded', { file_type: 'png' });
      const res = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: item.jobId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove background");

      const filename = `audora-${item.quality.toLowerCase()}-${item.jobId}-transparent.png`;
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
      setRemovingBgJobId(null);
    }
  };

  const handleExportPack = async (item: Generation) => {
    const sourceUrl = item.baseImageUrl || item.resultImageUrl;
    if (!sourceUrl || !item.jobId) return;
    setExportingPackJobId(item.jobId);
    try {
      const filename = `audora-icon-pack-${item.jobId}`;
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
      setExportingPackJobId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/library/${deleteTarget.jobId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Image deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["library"] });
      } else {
        toast.error("Failed to delete image");
      }
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleVisibilityDirectly = async (item: Generation) => {
    setIsUpdatingVisibility(true);
    try {
      const res = await fetch("/api/library/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: item.jobId, isPublic: !item.isPublic }),
      });
      if (!res.ok) throw new Error();
      toast.success(!item.isPublic ? "Asset added to Spotlight!" : "Asset is now private");
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
      handleToggleVisibilityDirectly(visibilityTarget);
      setVisibilityTarget(null);
    }
  };

  const handleShareToIG = async (item: Generation) => {
    if (!item.resultImageUrl) return;
    setIsSharing(true);
    let shareFile: File | null = null;
    let shareDataUrl: string | null = null;

    try {
      // Pre-fetch the icon image as a data URL so html-to-image doesn't hit CORS
      const iconRes = await fetch(`/api/download?url=${encodeURIComponent(item.resultImageUrl)}&filename=icon.png`);
      const iconBlob = await iconRes.blob();
      const iconDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(iconBlob);
      });

      // Set state to render the card with the data URL
      setSelectedImageForShare({ ...item, resultImageUrl: iconDataUrl });

      // Wait for next render tick + a small buffer for layout
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!shareCardRef.current) {
        toast.error("Share card failed to render.");
        return;
      }

      const { toJpeg } = await import("html-to-image");
      
      // Safari hack: Webkit often paints a blank canvas on the first run of SVG-based cloning
      await toJpeg(shareCardRef.current, { width: 1080, height: 1920, skipFonts: true });
      await new Promise(resolve => setTimeout(resolve, 150));

      shareDataUrl = await toJpeg(shareCardRef.current, {
        quality: 0.95,
        width: 1080,
        height: 1920,
        skipFonts: true,
      });

      const blob = await (await fetch(shareDataUrl)).blob();
      shareFile = new File([blob], `audora-story-${item.jobId}.jpg`, { type: "image/jpeg" });

      if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({
          files: [shareFile],
          title: "Crafted on Audora",
          text: "Check out this 3D icon I made on Audora!",
        });
        toast.success("Shared successfully!");
      } else {
        const link = document.createElement("a");
        link.href = shareDataUrl;
        link.download = `audora-story-${item.jobId}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Story card downloaded!");
      }
    } catch (err) {
      console.error("IG Share Error", err);
      // Wait, if it's a NotAllowedError, user gesture expired, offer the fallback modal
      const isUserGestureError = err instanceof Error && (err.name === "NotAllowedError" || err.message?.includes("user gesture"));
      if (isUserGestureError) {
        if (shareFile) {
          setShareFallbackFile(shareFile);
        } else if (shareDataUrl) {
           const link = document.createElement("a");
           link.href = shareDataUrl;
           link.download = `audora-story-${item.jobId}.jpg`;
           link.click();
           toast.success("Story card downloaded!");
        }
      } else {
        toast.error("Failed to generate share card.");
      }
    } finally {
      setIsSharing(false);
      setSelectedImageForShare(null);
    }
  };


  return (
    <>
      <div className="flex flex-col h-full w-full px-4 md:px-8 py-8 gap-8 mt-2 items-start min-h-[calc(100vh-3.5rem)]">
        {/* ── Header Section ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
          <div className="space-y-1">
            <h1 className="text-3xl font-heading font-bold tracking-tight">Library</h1>
            <p className="text-muted-foreground text-sm">
              Your collection of generated 3D icons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search icons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full md:w-64 pl-9 pr-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="icons" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:shadow-sm"><ImageIcon className="h-3.5 w-3.5" />3D Icons</TabsTrigger>
            {/* <TabsTrigger value="animations" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:shadow-sm"><Video className="h-3.5 w-3.5" />Animated Icons</TabsTrigger> */}
          </TabsList>

          <TabsContent value="icons">
        <AnimatePresence mode="wait">
          {/* Loading Skeleton */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-muted/40 animate-pulse border border-border/20"
                />
              ))}
            </motion.div>
          )}

          {/* Error State */}
          {isError && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-destructive/30 bg-destructive/5"
            >
              <p className="text-sm text-destructive font-medium">Failed to load your library.</p>
              <p className="text-xs text-muted-foreground mt-1">Please try refreshing the page.</p>
            </motion.div>
          )}

          {/* Grid of results */}
          {!isLoading && !isError && filteredLibrary.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full"
            >
              {filteredLibrary.map((item, index) => {
                const styleInfo = STYLE_LABELS[item.style];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.04 }}
                    className="group relative"
                  >
                    <div
                      onClick={() => setSelectedImage(item)}
                      className="relative aspect-square w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/40 group-hover:border-primary/20 group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                    >
                      {item.resultImageUrl && (
                        <Image
                          src={item.resultImageUrl}
                          alt="Generated 3D icon"
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          unoptimized
                        />
                      )}

                      {/* Badge Overlays: Style + Quality + Visibility */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-[1]">
                        <Badge
                          variant="secondary"
                          className="bg-background/95 backdrop-blur-md border border-border/20 text-[10px] h-5 px-2 shadow-md font-bold text-foreground hidden md:inline-flex"
                        >
                          {styleInfo?.icon} {styleInfo?.label}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-background/95 backdrop-blur-md border border-border/20 text-[10px] h-5 px-2 shadow-md font-bold text-foreground hidden md:inline-flex"
                        >
                          {item.quality}
                        </Badge>
                        {item.isPublic ? (
                          <Badge
                            variant="secondary"
                            className="bg-indigo-500/10 text-indigo-500 backdrop-blur-md border border-indigo-500/20 text-[10px] h-5 px-2 shadow-md font-bold"
                          >
                            <Globe className="w-3 h-3 sm:mr-1" /> <span className="hidden sm:inline">Spotlight</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-background/95 backdrop-blur-md border border-border/20 text-[10px] h-5 px-2 shadow-md font-bold text-muted-foreground"
                          >
                            <Lock className="w-3 h-3 sm:mr-1" /> <span className="hidden sm:inline">Private</span>
                          </Badge>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-[2]" onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-xl border-none shadow-sm text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="min-w-[110px] w-auto p-1 border-border/50 rounded-xl" align="end" onClick={(e) => e.stopPropagation()}>
                            <ButtonGroup orientation="vertical" className="w-full">
                              <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs">
                                <Link href={`/${item.jobId}?action=refine`}>
                                  <Wand2 className="h-3.5 w-3.5 text-foreground/80" />
                                  Refine
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-full justify-start gap-2 text-xs"
                                onClick={() => handleExportPack(item)}
                                disabled={exportingPackJobId === item.jobId}
                              >
                                {exportingPackJobId === item.jobId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/80" />
                                ) : (
                                  <Package2 className="h-3.5 w-3.5 text-foreground/80" />
                                )}
                                {exportingPackJobId === item.jobId ? "Zipping..." : "Export App Icons"}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs" onClick={() => handleDownload(item)}>
                                <Download className="h-3.5 w-3.5 text-foreground/80" />
                                Download Original
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-full justify-start gap-2 text-xs"
                                onClick={() => handleDownloadTransparent(item)}
                                disabled={removingBgJobId === item.jobId}
                              >
                                {removingBgJobId === item.jobId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/80" />
                                ) : (
                                  <Eraser className="h-3.5 w-3.5 text-foreground/80" />
                                )}
                                {removingBgJobId === item.jobId ? "Processing..." : "Download Transparent"}
                              </Button>
                              <ButtonGroupSeparator orientation="horizontal" />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-full justify-start gap-2 text-xs"
                                onClick={() => {
                                  if (!item.isPublic) setVisibilityTarget(item);
                                  else handleToggleVisibilityDirectly(item);
                                }}
                                disabled={isUpdatingVisibility}
                              >
                                {item.isPublic ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                                {item.isPublic ? "Make Private" : "Spotlight"}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-full justify-start gap-2 text-xs"
                                onClick={() => handleShareToIG(item)}
                                disabled={isSharing}
                              >
                                {isSharing && selectedImageForShare?.jobId === item.jobId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Share2 className="h-3.5 w-3.5" /> 
                                )}
                                Share to IG Story
                              </Button>
                              <ButtonGroupSeparator orientation="horizontal" />
                              <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(item)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </ButtonGroup>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Zoom In Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]">
                        <div className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white">
                          <ZoomIn className="h-6 w-6" />
                        </div>
                      </div>

                      {/* Hover Overlay w/ text & date */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none z-[1]">
                        <p className="text-xs text-white/90 font-medium line-clamp-2 mb-1">
                          {item.referenceImage && !item.userPrompt ? (
                            <span className="flex items-center gap-1.5 italic opacity-80">
                              <ImageIcon className="w-3 h-3" /> Icon from reference image
                            </span>
                          ) : (
                            item.userPrompt || item.prompt
                          )}
                        </p>
                        <span className="text-[10px] text-white/70">
                          {mounted ? formatRelativeDate(item.createdAt) : ""}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && filteredLibrary.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-1 flex-col items-center justify-center w-full min-h-[50vh] gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <h3 className="font-heading text-lg font-semibold text-foreground/70">
                  {searchQuery ? "No matches found" : "Your library is empty"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1 mb-6 max-w-[250px] mx-auto">
                  {searchQuery
                    ? "Try searching for a different keyword or prompt."
                    : "Start generating unique 3D icons in the studio to see them here."}
                </p>
              </div>
              {!searchQuery && (
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                  <Link href="/">Back to Studio</Link>
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </TabsContent>

          {/* <TabsContent value="animations">
            <AnimatePresence mode="wait">
              {animationsLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-video rounded-2xl bg-muted/40 animate-pulse border border-border/20" />
                  ))}
                </motion.div>
              )}

              {!animationsLoading && filteredAnimations.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                  {filteredAnimations.map((item, index) => (
                    <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.04 }}
                      className="group relative">
                      <div onClick={() => setSelectedVideo(item)}
                        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/40 group-hover:border-primary/20 group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-300 cursor-pointer">
                        {item.resultVideoUrl && (
                          <video src={item.resultVideoUrl} muted loop playsInline
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                        )}
                        <div className="absolute top-2 left-2 z-[1]">
                          <Badge variant="secondary" className="bg-background/95 backdrop-blur-md border border-border/20 text-[10px] h-5 px-2 shadow-md font-bold text-foreground">
                            {item.resolution} · {item.aspectRatio}
                          </Badge>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]">
                          <div className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white"><Play className="h-6 w-6" /></div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none z-[1]">
                          <p className="text-xs text-white/90 font-medium line-clamp-2 mb-1">{item.actionPrompt}</p>
                          <span className="text-[10px] text-white/70">{mounted && item.createdAt ? formatRelativeDate(item.createdAt) : ""}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {!animationsLoading && filteredAnimations.length === 0 && (
                <motion.div key="anim-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-1 flex-col items-center justify-center w-full min-h-[50vh] gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-heading text-lg font-semibold text-foreground/70">
                      {searchQuery ? "No matches found" : "No animated icons yet"}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1 mb-6 max-w-[250px] mx-auto">
                      {searchQuery ? "Try a different keyword." : "Animate your 3D icons to see them here."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                      <Link href="/animate">Go to Animate</Link>
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent> */}
        </Tabs>
      </div>

      {/* ── Image Detail Dialog ────────────────────────────── */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
        <DialogContent className="sm:max-w-4xl w-full border-border/50 bg-card p-0 overflow-hidden shadow-2xl" showCloseButton={false}>
          <DialogClose asChild>
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute top-4 right-4 z-50 rounded-full h-10 w-10 shadow-lg border border-border/20 bg-background/80 backdrop-blur-md hover:bg-background transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
          <DialogTitle className="sr-only">Image Details</DialogTitle>
          <DialogDescription className="sr-only">
            View details and actions for this generated 3D icon.
          </DialogDescription>
          {selectedImage && (
            <div className="grid grid-cols-1 md:grid-cols-5 min-h-0">
              {/* Left: Image */}
              <div className="flex items-center justify-center bg-muted/10 p-6 border-b md:border-b-0 md:border-r border-border/20 md:col-span-3">
                <div className="relative w-full aspect-square md:max-h-[75vh] rounded-xl overflow-hidden shadow-lg bg-background border border-border/20">
                  {selectedImage.resultImageUrl && (
                    <Image
                      src={selectedImage.resultImageUrl}
                      alt={selectedImage.prompt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 50vw"
                      className="object-contain"
                      unoptimized
                    />
                  )}
                </div>
              </div>

              {/* Right: Info + Actions */}
              <div className="flex flex-col justify-between p-6 gap-6 md:col-span-2">
                {/* Prompt + Badges */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs h-6 px-2.5 bg-secondary/80 font-semibold">
                      {STYLE_LABELS[selectedImage.style]?.icon} {STYLE_LABELS[selectedImage.style]?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs h-6 px-2.5 bg-secondary/80 font-semibold">
                      {selectedImage.quality}
                    </Badge>
                    {mounted && (
                      <Badge variant="outline" className="text-xs h-6 px-2.5 text-muted-foreground">
                        {formatRelativeDate(selectedImage.createdAt)}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Prompt</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={() => handleCopyPrompt(selectedImage.userPrompt || selectedImage.prompt)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-base font-medium leading-relaxed text-foreground/90 max-h-[40vh] overflow-y-auto pr-2">
                      {selectedImage.referenceImage && !selectedImage.userPrompt ? (
                        <span className="flex items-center gap-1.5 italic opacity-80">
                          <ImageIcon className="w-4 h-4" /> Icon from reference image
                        </span>
                      ) : (
                        selectedImage.userPrompt || selectedImage.prompt
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row gap-2 pt-4 border-t border-border/40 mt-auto items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1 font-semibold rounded-xl h-10 shadow-sm text-xs gap-2" disabled={removingBgJobId === selectedImage.jobId}>
                        {removingBgJobId === selectedImage.jobId ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Removing Background...</>
                        ) : (
                          <><Download className="w-4 h-4" /> Download Image <ChevronDown className="w-3 h-3 opacity-60 ml-auto" /></>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] sm:w-[240px] rounded-xl">
                      <DropdownMenuItem onClick={() => handleExportPack(selectedImage)} disabled={exportingPackJobId === selectedImage.jobId} className="gap-3 py-2.5 cursor-pointer">
                        {exportingPackJobId === selectedImage.jobId ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Package2 className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium">Export App Icons (.zip)</span>
                          <span className="text-[11px] text-muted-foreground">iOS, Android, & Web bundle</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDownload(selectedImage)} className="gap-3 py-2.5 cursor-pointer">
                        <Download className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium">Original Background</span>
                          <span className="text-[11px] text-muted-foreground">White background · PNG</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDownloadTransparent(selectedImage)} disabled={removingBgJobId === selectedImage.jobId} className="gap-3 py-2.5 cursor-pointer">
                        <Eraser className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium">Transparent Background</span>
                          <span className="text-[11px] text-muted-foreground">No background · PNG</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button asChild size="icon" variant="secondary" className="h-10 w-10 flex-shrink-0 rounded-xl" title="Refine">
                    <Link href={`/${selectedImage.jobId}?action=refine`}>
                      <Wand2 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive flex-shrink-0 rounded-xl"
                    onClick={() => {
                      setDeleteTarget(selectedImage);
                      setSelectedImage(null);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              Delete this icon?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will permanently delete the 3D asset and remove it from your library. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget?.resultImageUrl && (
            <div className="flex justify-center py-2">
              <Image
                src={deleteTarget.resultImageUrl}
                alt="Icon to delete"
                width={96}
                height={96}
                className="rounded-xl object-cover border border-border/40 shadow-sm opacity-70"
                unoptimized
              />
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* ── Video Detail Dialog ─────────────────────────────── */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => { if (!open) setSelectedVideo(null); }}>
        <DialogContent className="sm:max-w-3xl w-full border-border/50 bg-card p-0 overflow-hidden shadow-2xl" showCloseButton={false}>
          <DialogClose asChild>
            <Button variant="secondary" size="icon"
              className="absolute top-4 right-4 z-50 rounded-full h-10 w-10 shadow-lg border border-border/20 bg-background/80 backdrop-blur-md hover:bg-background transition-all">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
          <DialogTitle className="sr-only">Animation Details</DialogTitle>
          <DialogDescription className="sr-only">View details about this animated icon.</DialogDescription>
          {selectedVideo && (
            <div className="grid grid-cols-1 md:grid-cols-5 min-h-0">
              <div className="flex items-center justify-center bg-muted/10 p-6 border-b md:border-b-0 md:border-r border-border/20 md:col-span-3">
                {selectedVideo.resultVideoUrl && (
                  <video src={selectedVideo.resultVideoUrl} autoPlay loop muted playsInline
                    className="w-full max-h-[70vh] rounded-xl shadow-lg object-contain" />
                )}
              </div>
              <div className="flex flex-col justify-between p-6 gap-6 md:col-span-2">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs h-6 px-2.5 bg-secondary/80 font-semibold">
                      {selectedVideo.resolution}
                    </Badge>
                    <Badge variant="secondary" className="text-xs h-6 px-2.5 bg-secondary/80 font-semibold">
                      {selectedVideo.aspectRatio}
                    </Badge>
                    <Badge variant="secondary" className="text-xs h-6 px-2.5 bg-secondary/80 font-semibold">
                      4s Loop
                    </Badge>
                    {mounted && selectedVideo.createdAt && (
                      <Badge variant="outline" className="text-xs h-6 px-2.5 text-muted-foreground">
                        {formatRelativeDate(selectedVideo.createdAt)}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Action Prompt</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                        onClick={() => handleCopyPrompt(selectedVideo.actionPrompt)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-base font-medium leading-relaxed text-foreground/90 max-h-[30vh] overflow-y-auto pr-2">
                      {selectedVideo.actionPrompt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Background:</span>
                    <div className="w-5 h-5 rounded-full border border-border/60" style={{ backgroundColor: selectedVideo.backgroundColor }} />
                    <span className="text-xs font-mono text-muted-foreground">{selectedVideo.backgroundColor}</span>
                  </div>
                </div>
                <div className="flex flex-row gap-2 pt-4 border-t border-border/40 mt-auto">
                  <Button size="sm" className="flex-1 font-semibold rounded-xl h-10 text-xs gap-2"
                    onClick={() => {
                      if (!selectedVideo.resultVideoUrl) return;
                      const link = document.createElement("a");
                      link.href = `/api/download?url=${encodeURIComponent(selectedVideo.resultVideoUrl)}&filename=audora-animation-${selectedVideo.jobId}.mp4`;
                      link.download = `audora-animation-${selectedVideo.jobId}.mp4`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success("Download started!");
                    }}>
                    <Download className="w-4 h-4" />Download MP4
                  </Button>
                </div>
              </div>
            </div>
          )}
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
        {selectedImageForShare && (
          <ShareCard 
            imageUrl={selectedImageForShare.resultImageUrl!}
            style={selectedImageForShare.style}
            position={selectedImageForShare.position}
            userName={session?.user?.name || undefined}
            ref={shareCardRef}
          />
        )}
      </div>
    </>
  );
}
