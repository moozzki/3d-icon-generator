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
    template: "%s | AI 3D Isometric Icon Generator | Audora",
    default: "Dashboard | AI 3D Isometric Icon Generator | Audora",
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

