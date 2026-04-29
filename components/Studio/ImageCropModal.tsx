"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ImageCrop,
  ImageCropContent,
  ImageCropApply,
  ImageCropReset,
} from "@/components/kibo-ui/image-crop";
import { CropIcon, RotateCcwIcon } from "lucide-react";
import { useRef } from "react";

interface ImageCropModalProps {
  /** Raw File selected by the user. Pass null to close the modal. */
  file: File | null;
  /** Called with the cropped image as a base64 PNG data-URL. */
  onApply: (croppedBase64: string) => void;
  /** Called when the user cancels or closes the modal. */
  onCancel: () => void;
}

export function ImageCropModal({ file, onApply, onCancel }: ImageCropModalProps) {
  // Holds the latest cropped image emitted by ImageCropApply
  const pendingCropRef = useRef<string | null>(null);

  const handleCrop = (croppedImage: string) => {
    pendingCropRef.current = croppedImage;
    onApply(croppedImage);
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Crop Reference Image</DialogTitle>
          <DialogDescription>
            Drag the corners to freely adjust the crop area, then click{" "}
            <strong>Apply Crop</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Cropper — only mount when file is present */}
        {file && (
          <div className="px-6 pb-4">
            <ImageCrop
              file={file}
              onCrop={handleCrop}
              keepSelection
            >
              {/* The interactive crop surface */}
              <ImageCropContent className="rounded-md border border-border/50 overflow-hidden" />

              <DialogFooter className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Reset crop back to the initial centered selection */}
                  <ImageCropReset asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <RotateCcwIcon className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  </ImageCropReset>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                  </Button>

                  {/* Apply triggers getCroppedPngImage internally, then calls onCrop → handleCrop */}
                  <ImageCropApply asChild>
                    <Button size="sm" className="gap-1.5">
                      <CropIcon className="h-3.5 w-3.5" />
                      Apply Crop
                    </Button>
                  </ImageCropApply>
                </div>
              </DialogFooter>
            </ImageCrop>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
