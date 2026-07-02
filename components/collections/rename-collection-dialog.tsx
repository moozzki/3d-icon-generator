"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameCollection } from "@/app/actions/collections";
import { toast } from "sonner";
import { Edit3, Loader2 } from "lucide-react";

interface RenameCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: { id: string; name: string } | null;
  onSuccess?: () => void;
}

export function RenameCollectionDialog({
  open,
  onOpenChange,
  collection,
  onSuccess,
}: RenameCollectionDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (collection) {
      setName(collection.name);
    }
  }, [collection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection || !name.trim()) return;

    setLoading(true);
    try {
      const res = await renameCollection(collection.id, name.trim());
      if (res.success) {
        toast.success("Collection renamed successfully!");
        await queryClient.invalidateQueries({ queryKey: ["collections"] });
        await queryClient.invalidateQueries({ queryKey: ["collection", collection.id] });
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to rename collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Rename Collection
            </DialogTitle>
            <DialogDescription>
              Enter a new name for this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-collection-name">Collection Name</Label>
              <Input
                id="rename-collection-name"
                placeholder="e.g., Finance App Redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || name.trim() === collection?.name}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
