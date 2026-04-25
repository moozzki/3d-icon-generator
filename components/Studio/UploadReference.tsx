"use client";

import { useState, useRef } from "react";
import { ImageUp, Loader2, X, FileImage, Wand2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCropModal } from "@/components/Studio/ImageCropModal";

interface UploadReferenceProps {
  referenceUrl: string | null;
  onReferenceChanged: (url: string | null) => void;
  className?: string;
}

export function UploadReferenceTrigger({
  referenceUrl,
  onReferenceChanged,
  className,
}: UploadReferenceProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Called when the user clicks "Apply Crop" in the modal ───────────────
  const handleCropApply = async (croppedBase64: string) => {
    setPendingFile(null); // close modal

    try {
      setIsUploading(true);

      // 1. Convert base64 data-URL → Blob → File
      const res = await fetch(croppedBase64);
      const blob = await res.blob();
      const croppedFile = new File([blob], "cropped-reference.png", {
        type: "image/png",
      });

      // 2. Client-side compress (max 1 MB / 1024 px)
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(croppedFile, options);

      // 3. Get presigned upload URL from our API
      const uploadMetaRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: compressedFile.name,
          contentType: compressedFile.type,
        }),
      });

      if (!uploadMetaRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = await uploadMetaRes.json();

      // 4. PUT to Cloudflare R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: compressedFile,
        headers: { "Content-Type": compressedFile.type },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      onReferenceChanged(fileUrl);
      toast.success("Reference image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload reference image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Called when the user selects a file via <input> ─────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file); // opens the crop modal
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || !!referenceUrl}
        className={cn(
          "h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          referenceUrl || isUploading
            ? "border-primary/30 text-primary bg-primary/10 opacity-80 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border/50 bg-muted/40",
          className
        )}
        title="Upload Reference Image"
      >
        {isUploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageUp className="h-3.5 w-3.5" />
        )}
        <span className="hidden xs:inline">
          {isUploading ? "Uploading..." : "Reference"}
        </span>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* Crop modal — shown when a file is pending crop confirmation */}
      <ImageCropModal
        file={pendingFile}
        onApply={handleCropApply}
        onCancel={() => {
          setPendingFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
    </>
  );
}

export function UploadReferencePreview({
  referenceUrl,
  onClear,
  isRefineMode = false,
}: {
  referenceUrl: string | null;
  onClear: () => void;
  isRefineMode?: boolean;
}) {
  return (
    <AnimatePresence>
      {referenceUrl && (
        <motion.div
          initial={{ height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, overflow: "visible" }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          className="px-3 sm:px-4 pt-4 pb-1"
        >
          <div className="relative inline-flex items-center gap-3 p-1.5 pr-3 rounded-lg border border-border/40 bg-muted/30 group">
            <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted border border-border flex-shrink-0">
              <Image
                src={referenceUrl}
                alt="Reference"
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-0.5 justify-center flex-1 min-w-0 pr-6">
              {isRefineMode ? (
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <Wand2 className="w-3 h-3 text-primary" />
                  <span>Refine Target</span>
                  <span className="text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full leading-none">REFINE</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <FileImage className="w-3 h-3 text-muted-foreground" /> Reference
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/80 truncate w-32 break-all">
                {referenceUrl.split("/").pop()}
              </span>
            </div>
            <button
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 peer"
              title="Remove reference"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
