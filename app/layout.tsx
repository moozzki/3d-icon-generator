import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });

import { PostHogProvider } from "./providers/PostHogProvider";

export const metadata: Metadata = {
  title: {
    template: "%s | Audora",
    default: "Audora - AI 3D Isometric Icon Generator | Dashboard",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Audora",
  },
  icons: {
    icon: "/assets/zupericon-logo-square-192.png",
    apple: "/assets/zupericon-logo-square-withbg-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", spaceGrotesk.variable, inter.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  window.addEventListener('beforeinstallprompt', function(e) {
                    e.preventDefault();
                    window.__deferredPrompt = e;
                  });
                  if ('serviceWorker' in navigator) {
                    var registerSW = function() {
                      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function() {});
                    };
                    if (document.readyState === 'complete' || document.readyState === 'interactive') {
                      registerSW();
                    } else {
                      window.addEventListener('load', registerSW);
                    }
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className="font-sans min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <PostHogProvider>
              {children}
              <Toaster />
            </PostHogProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

