"use client";

import { useState } from "react";
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
import { createCollection } from "@/app/actions/collections";
import { toast } from "sonner";
import { FolderPlus, Loader2 } from "lucide-react";

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCollectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCollectionDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await createCollection(name.trim());
      if (res.success && res.collection) {
        toast.success(`Collection "${res.collection.name}" created!`);
        setName("");
        await queryClient.invalidateQueries({ queryKey: ["collections"] });
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        router.push(`/collections/${res.collection.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create collection");
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
              <FolderPlus className="h-5 w-5 text-primary" />
              Create New Collection
            </DialogTitle>
            <DialogDescription>
              Organize your 3D icons by projects, themes, or clients.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="collection-name">Collection Name</Label>
              <Input
                id="collection-name"
                placeholder="e.g., Finance App Redesign, Crypto Project"
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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
