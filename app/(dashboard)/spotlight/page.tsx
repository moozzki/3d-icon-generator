"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Search, Download, Wand2, ZoomIn, Globe, Copy, X, ImageIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
  isPublic: boolean;
  createdAt: string;
  userName?: string;
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

export default function SpotlightPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const [mounted, setMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
  const [visibilityTarget, setVisibilityTarget] = useState<Generation | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: generations = [],
    isLoading,
    isError,
  } = useQuery<Generation[]>({
    queryKey: ["spotlight"],
    queryFn: async () => {
      const res = await fetch("/api/spotlight");
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

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt copied to clipboard!");
  };

  const handleDownload = async (item: Generation) => {
    if (!item.resultImageUrl) return;
    try {
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

  const handleToggleVisibilityDirectly = async (item: Generation) => {
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
    }
  };

  const handleConfirmSpotlight = () => {
    if (visibilityTarget) {
      handleToggleVisibilityDirectly(visibilityTarget);
      setVisibilityTarget(null);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full w-full px-4 md:px-8 py-8 gap-8 mt-2 items-start min-h-[calc(100vh-3.5rem)]">
        {/* ── Header Section ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
          <div className="space-y-1">
            <h1 className="text-3xl font-heading font-bold tracking-tight">Spotlight</h1>
            <p className="text-muted-foreground text-sm">
              Discover amazing 3D icons created by the community.
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

        {/* ── Grid Section ───────────────────────────────────── */}
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
              <p className="text-sm text-destructive font-medium">Failed to load the spotlight feed.</p>
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
                        />
                      )}

                      {/* Badge Overlays: Style + Position + UserName */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-[1]">
                        <Badge
                          variant="secondary"
                          className="bg-background/95 backdrop-blur-md border border-border/20 text-[10px] h-5 px-2 shadow-md font-bold text-foreground hidden md:inline-flex"
                        >
                          {styleInfo?.icon} {styleInfo?.label}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-background/95 backdrop-blur-md border border-border/20 text-[10px] h-5 px-2 shadow-md font-bold text-foreground capitalize hidden md:inline-flex"
                        >
                          {item.position.replace('_', ' ')}
                        </Badge>
                        {item.userName && (
                          <Badge
                            variant="secondary"
                            className="bg-[#FFFF47] text-[#121212] backdrop-blur-md border border-[#FFFF47] text-[10px] h-5 px-2 shadow-md font-bold truncate max-w-[100px]"
                          >
                            @{item.userName}
                          </Badge>
                        )}
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
                <Globe className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <h3 className="font-heading text-lg font-semibold text-foreground/70">
                  {searchQuery ? "No matches found" : "The spotlight is currently empty"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1 mb-6 max-w-[250px] mx-auto">
                  {searchQuery
                    ? "Try searching for a different keyword or prompt."
                    : "Be the first to share your creative generation with the community."}
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
            View details and community interactions for this generated 3D icon.
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
                    <Badge variant="secondary" className="text-xs h-6 px-2.5 bg-secondary/80 font-semibold capitalize">
                      {selectedImage.position.replace('_', ' ')}
                    </Badge>
                    {selectedImage.userName && (
                      <Badge variant="secondary" className="text-xs h-6 px-2.5 bg-[#FFFF47] text-[#121212] border border-[#FFFF47] font-bold">
                        @{selectedImage.userName}
                      </Badge>
                    )}

                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
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
                  <Button 
                    onClick={() => handleDownload(selectedImage)} 
                    size="sm" 
                    className="flex-1 font-semibold rounded-xl h-10 shadow-sm text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Download className="w-4 h-4" /> Download Image
                  </Button>

                  <Button asChild size="icon" variant="secondary" className="h-10 w-10 flex-shrink-0 rounded-xl" title="Refine">
                    <Link href={`/${selectedImage.jobId}?action=refine`}>
                      <Wand2 className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
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
    </>
  );
}
