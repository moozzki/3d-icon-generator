"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
} from "@/components/ui/dialog";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { Search, ImageIcon, Download, Wand2, MoreVertical, Trash2 } from "lucide-react";
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
  createdAt: string;
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
                      className="relative aspect-square w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/40 group-hover:border-primary/20 group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-300"
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

                      {/* Badge Overlays: Style + Quality */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-[1]">
                        <Badge
                          variant="secondary"
                          className="bg-background/80 backdrop-blur-xl border-none text-[10px] h-5 px-2 shadow-sm font-semibold text-foreground"
                        >
                          {styleInfo?.icon} {styleInfo?.label}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-background/80 backdrop-blur-xl border-none text-[10px] h-5 px-2 shadow-sm font-semibold text-foreground"
                        >
                          {item.quality}
                        </Badge>
                      </div>

                      {/* Action Button */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-[2]">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-xl border-none shadow-sm text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="min-w-[110px] w-auto p-1 border-border/50 rounded-xl" align="end">
                            <ButtonGroup orientation="vertical" className="w-full">
                              <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs">
                                <Link href={`/${item.jobId}?action=refine`}>
                                  <Wand2 className="h-3.5 w-3.5 text-foreground/80" />
                                  Refine
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs" onClick={() => handleDownload(item)}>
                                <Download className="h-3.5 w-3.5 text-foreground/80" />
                                Download
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

                      {/* Hover Overlay w/ date */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 pointer-events-none">
                        <span className="text-[10px] text-white/90 font-medium">
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
      </div>

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
    </>
  );
}
