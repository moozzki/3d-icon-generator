import Image from "next/image";

interface AuthLoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

export function AuthLoadingOverlay({ message = "Loading...", isVisible }: AuthLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
        <Image
          src="/assets/audora-square-logo.png"
          alt="Audora Logo"
          width={80}
          height={80}
          className="w-20 h-20 object-contain animate-pulse"
          priority
        />
        <p className="text-lg font-medium text-foreground tracking-tight">
          {message}
        </p>
      </div>
    </div>
  );
}
