"use client";

import { useState, use, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Folder,
  Pencil,
  Trash2,
  ImageIcon,
  Download,
  Wand2,
  MoreVertical,
  Eraser,
  Loader2,
  ZoomIn,
  FolderMinus,
  Package2,
  X,
  Copy,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
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
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { RenameCollectionDialog } from "@/components/collections/rename-collection-dialog";
import { DeleteCollectionDialog } from "@/components/collections/delete-collection-dialog";
import { AddToCollectionDialog } from "@/components/collections/add-to-collection-dialog";

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

interface CollectionItemData {
  id: number;
  collectionId: string;
  generationId: number;
  createdAt: string;
  generation: Generation;
}

interface CollectionDetailResponse {
  collection: {
    id: string;
    userId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  items: CollectionItemData[];
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

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const collectionId = id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
  const [removingBgJobId, setRemovingBgJobId] = useState<string | null>(null);
  const [exportingPackJobId, setExportingPackJobId] = useState<string | null>(null);
  const [removingGenerationId, setRemovingGenerationId] = useState<number | null>(null);
  const [addToCollectionTarget, setAddToCollectionTarget] = useState<Generation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt copied to clipboard!");
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
        queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
        queryClient.invalidateQueries({ queryKey: ["collections"] });
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

  const { data, isLoading, isError } = useQuery<CollectionDetailResponse>({
    queryKey: ["collection", collectionId],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${collectionId}`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          throw new Error("Collection not found");
        }
        throw new Error("Failed to fetch collection details");
      }
      return res.json();
    },
    enabled: !!collectionId,
  });

  const collection = data?.collection;
  const items = data?.items || [];

  const handleRemoveFromCollection = async (generationId: number) => {
    setRemovingGenerationId(generationId);
    try {
      const res = await fetch("/api/collections/remove-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, generationId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to remove icon from collection");
      }

      toast.success("Icon removed from collection");
      queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove icon from collection");
    } finally {
      setRemovingGenerationId(null);
    }
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

  const handleDownloadTransparent = async (item: Generation) => {
    if (!item.jobId) return;
    setRemovingBgJobId(item.jobId);
    try {
      const res = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: item.jobId }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to remove background");

      const filename = `audora-${item.quality.toLowerCase()}-${item.jobId}-transparent.png`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(resData.url)}&filename=${filename}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Transparent download started!");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove background");
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

  if (!collectionId || (isError && !isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <Folder className="w-12 h-12 text-muted-foreground/30" />
        <h2 className="text-xl font-heading font-semibold text-foreground">Collection not found</h2>
        <p className="text-sm text-muted-foreground">The collection you are looking for does not exist or was deleted.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/library">Back to Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full w-full px-4 md:px-8 py-8 gap-8 mt-2 items-start min-h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 min-w-0">
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">
              {isLoading ? "Loading..." : collection?.name}
            </h1>
            {!isLoading && (
              <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5 shrink-0">
                {items.length} {items.length === 1 ? "icon" : "icons"}
              </Badge>
            )}
          </div>

          {!isLoading && collection && (
            <div className="flex items-center gap-2 shrink-0">
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-border/60 hover:bg-accent/60 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-foreground/80" />
                    <span className="sr-only">Folder options</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-48 p-1 border-border/60 rounded-xl shadow-lg backdrop-blur-md"
                >
                  <ButtonGroup orientation="vertical" className="w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPopoverOpen(false);
                        setRenameOpen(true);
                      }}
                      className="h-8 w-full justify-start gap-2.5 text-xs font-medium rounded-lg text-foreground hover:bg-accent cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      Rename collection
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPopoverOpen(false);
                        setDeleteOpen(true);
                      }}
                      className="h-8 w-full justify-start gap-2.5 text-xs font-medium rounded-lg text-destructive hover:text-destructive hover:bg-destructive/15 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      Delete collection
                    </Button>
                  </ButtonGroup>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-muted/40 animate-pulse border border-border/20"
                />
              ))}
            </motion.div>
          )}

          {!isLoading && items.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full"
            >
              {items.map((itemData, index) => {
                const item = itemData.generation;
                const styleInfo = STYLE_LABELS[item.style];
                return (
                  <motion.div
                    key={itemData.id}
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

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-[1]">
                        <Badge
                          variant="secondary"
                          className="bg-background/95 backdrop-blur-md border border-border/20 text-[10px] h-5 px-2 shadow-md font-bold text-foreground hidden md:inline-flex"
                        >
                          {styleInfo?.icon} {styleInfo?.label}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div
                        className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-[2]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-xl border-none shadow-sm text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="min-w-[140px] w-auto p-1 border-border/50 rounded-xl"
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                                className="h-8 w-full justify-start gap-2 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                onClick={() => handleRemoveFromCollection(item.id)}
                                disabled={removingGenerationId === item.id}
                              >
                                {removingGenerationId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FolderMinus className="h-3.5 w-3.5" />
                                )}
                                Remove from collection
                              </Button>
                            </ButtonGroup>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Zoom Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]">
                        <div className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white">
                          <ZoomIn className="h-6 w-6" />
                        </div>
                      </div>

                      {/* Hover text */}
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
          {!isLoading && items.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center w-full min-h-[40vh] gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <h3 className="font-heading text-lg font-semibold text-foreground/70">
                  This collection is empty
                </h3>
                <p className="text-muted-foreground text-sm mt-1 mb-6 max-w-[280px] mx-auto">
                  Add icons to this collection from your Library.
                </p>
              </div>
              <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                <Link href="/library">Browse Library</Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Detail Dialog */}
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
              {/* Left: Image Preview */}
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
                    variant="secondary"
                    className="h-10 w-10 flex-shrink-0 rounded-xl"
                    onClick={() => setAddToCollectionTarget(selectedImage)}
                    title="Add to Collection"
                  >
                    <Folder className="h-4 w-4" />
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

      {/* Delete Confirmation Dialog */}
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

      <AddToCollectionDialog
        open={!!addToCollectionTarget}
        onOpenChange={(open) => !open && setAddToCollectionTarget(null)}
        generationId={addToCollectionTarget?.id || null}
      />

      {/* Dialogs */}
      {collection && (
        <>
          <RenameCollectionDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            collection={collection}
          />
          <DeleteCollectionDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open && !data) {
                // If deleted, navigate back to library
                router.push("/library");
              }
            }}
            collection={collection}
          />
        </>
      )}
    </>
  );
}
