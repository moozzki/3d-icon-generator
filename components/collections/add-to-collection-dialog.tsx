"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Check, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateCollectionDialog } from "./create-collection-dialog";

interface Collection {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface AddToCollectionDialogProps {
  generationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToCollectionDialog({
  generationId,
  open,
  onOpenChange,
}: AddToCollectionDialogProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Fetch all collections
  const { data: collectionsData, isLoading: isCollectionsLoading } = useQuery<{
    collections: Collection[];
  }>({
    queryKey: ["collections"],
    queryFn: async () => {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json();
    },
    enabled: open,
  });

  // Fetch which collections this generation belongs to
  const { data: memberData, isLoading: isMemberLoading } = useQuery<{
    collectionIds: string[];
  }>({
    queryKey: ["generation-collections", generationId],
    queryFn: async () => {
      if (!generationId) return { collectionIds: [] };
      const res = await fetch(`/api/collections/generation/${generationId}`);
      if (!res.ok) throw new Error("Failed to fetch generation collection memberships");
      return res.json();
    },
    enabled: open && !!generationId,
  });

  const collections = collectionsData?.collections || [];
  const activeCollectionIds = new Set(memberData?.collectionIds || []);

  const handleToggleCollection = async (collectionId: string, isCurrentlyMember: boolean) => {
    if (!generationId) return;

    setLoadingMap((prev) => ({ ...prev, [collectionId]: true }));
    try {
      const endpoint = isCurrentlyMember ? "/api/collections/remove-item" : "/api/collections/add-item";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, generationId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update collection membership");
      }

      toast.success(
        isCurrentlyMember
          ? "Removed from collection"
          : "Added to collection!"
      );

      // Invalidate queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: ["generation-collections", generationId] });
      queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update collection");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [collectionId]: false }));
    }
  };

  const isLoading = isCollectionsLoading || isMemberLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-border/50 bg-card p-6 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Add to Collection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select collections to organize this 3D icon into. You can add an icon to multiple collections.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {isLoading && (
              <div className="space-y-2 py-4">
                <div className="h-10 w-full rounded-xl bg-muted/40 animate-pulse" />
                <div className="h-10 w-full rounded-xl bg-muted/40 animate-pulse" />
              </div>
            )}

            {!isLoading && collections.length === 0 && (
              <div className="text-center py-6 text-muted-foreground space-y-3">
                <p className="text-xs">No collections created yet.</p>
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="rounded-xl gap-2 text-xs"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create First Collection
                </Button>
              </div>
            )}

            {!isLoading &&
              collections.map((col) => {
                const isMember = activeCollectionIds.has(col.id);
                const isItemLoading = !!loadingMap[col.id];

                return (
                  <button
                    key={col.id}
                    disabled={isItemLoading}
                    onClick={() => handleToggleCollection(col.id, isMember)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                      isMember
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/40 hover:border-border/80 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isMember ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        <Folder className="h-4 w-4 fill-current" />
                      </div>
                      <span className="text-xs font-semibold truncate">{col.name}</span>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isItemLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : isMember ? (
                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-border/60 group-hover:border-primary/50" />
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {!isLoading && collections.length > 0 && (
            <div className="pt-2 border-t border-border/40 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="rounded-xl gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <FolderPlus className="h-4 w-4 text-primary" />
                New Collection
              </Button>

              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs px-4"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
