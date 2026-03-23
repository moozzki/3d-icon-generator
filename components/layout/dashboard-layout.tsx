"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wand2, Images, Sparkles, Zap, Coins } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Studio", href: "/", icon: Wand2 },
    { name: "Gallery", href: "/gallery", icon: Images },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex w-[200px] flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm fixed inset-y-0 left-0 z-20">
        {/* Logo */}
        <div className="flex h-14 items-center px-5 border-b border-border/40 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-primary/40 transition-all">
              <Wand2 size={14} className="text-white" />
            </div>
            <span className="font-heading font-bold text-sm tracking-tight">
              IconGen<span className="text-primary">AI</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mb-3">
            Workspace
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 pb-5 border-t border-border/40 pt-4">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback className="text-[10px]">KY</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold leading-tight">Kyz User</p>
              <p className="truncate text-[10px] text-muted-foreground leading-tight">user@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area (sidebar offset) ───────────────────────── */}
      <div className="flex flex-1 flex-col md:pl-[200px]">
        {/* ── Top Header ───────────────────────────────────────── */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/50 bg-card/60 backdrop-blur-md px-6 shrink-0">
          {/* Left: Page breadcrumb / title */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground/80">
              {pathname === "/" ? "Studio" : pathname === "/gallery" ? "Gallery" : "Dashboard"}
            </span>
          </div>

          {/* Right: Credits + CTA */}
          <div className="flex items-center gap-3">
            {/* Credit badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">2 Credits</span>
            </div>

            {/* Top Up CTA */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold gap-1.5 shadow-sm hover:shadow-primary/25 transition-shadow px-4"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Top Up
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl">Top Up Credits</DialogTitle>
                  <DialogDescription>
                    Get more credits to generate high-quality 3D icons.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="border-2 border-primary rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden bg-primary/5">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">
                      Popular
                    </div>
                    <Sparkles className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-heading text-2xl font-bold mb-1">10 Credits</h3>
                    <p className="text-sm text-muted-foreground mb-4">Perfect for quick projects.</p>
                    <div className="text-xl font-bold mb-4">Rp 30.000</div>
                    <Button className="w-full">Purchase via QRIS</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* ── Page Content ─────────────────────────────────────── */}
        <main className="dot-canvas flex-1 relative overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
