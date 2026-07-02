"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { deleteCollection } from "@/app/actions/collections";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: { id: string; name: string } | null;
  onSuccess?: () => void;
}

export function DeleteCollectionDialog({
  open,
  onOpenChange,
  collection,
  onSuccess,
}: DeleteCollectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!collection) return;

    setLoading(true);
    try {
      const res = await deleteCollection(collection.id);
      if (res.success) {
        toast.success(`Collection "${collection.name}" deleted.`);
        await queryClient.invalidateQueries({ queryKey: ["collections"] });
        await queryClient.invalidateQueries({ queryKey: ["collection", collection.id] });
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        // If we are currently on the deleted collection page, redirect to library
        if (pathname === `/collections/${collection.id}`) {
          router.push("/library");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this folder?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the collection{" "}
            <span className="font-semibold text-foreground">"{collection?.name}"</span>.
            <br />
            <br />
            <span className="text-muted-foreground text-xs">
              Note: The 3D icons inside this collection will NOT be deleted from your Library. Only the collection folder structure will be removed.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Delete Collection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
