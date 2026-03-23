"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wand2, Images, Sparkles, Zap, Coins, Infinity, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const { data: session } = useSession();
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", next.toString());
      return next;
    });
  };

  useEffect(() => {
    if (!session?.user) return;
    // @ts-ignore – better-auth admin plugin adds role to user
    if (session.user.role === "admin") {
      setIsAdmin(true);
      setCredits(null);
      return;
    }
    const fetchCredits = () => {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.balance === "number") setCredits(data.balance);
        })
        .catch(() => {});
    };

    fetchCredits();
    
    window.addEventListener("credits-updated", fetchCredits);
    return () => window.removeEventListener("credits-updated", fetchCredits);
  }, [session]);

  const navItems = [
    { name: "Studio", href: "/", icon: Wand2 },
    { name: "Gallery", href: "/gallery", icon: Images },
  ];

  const sidebarWidth = collapsed ? "w-[60px]" : "w-[200px]";
  const mainOffset = collapsed ? "md:pl-[60px]" : "md:pl-[200px]";

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className={cn(
          "hidden md:flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm fixed inset-y-0 left-0 z-20 transition-all duration-200",
          sidebarWidth
        )}>
          {/* Logo */}
          <div className={cn("flex h-14 items-center border-b border-border/40 shrink-0", collapsed ? "justify-center px-2" : "px-5")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-primary/40 transition-all shrink-0">
                      <Wand2 size={14} className="text-white" />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  IconGen AI
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-primary/40 transition-all shrink-0">
                  <Wand2 size={14} className="text-white" />
                </div>
                <span className="font-heading font-bold text-sm tracking-tight">
                  IconGen<span className="text-primary">AI</span>
                </span>
              </Link>
            )}
          </div>

          {/* Nav */}
          <nav className={cn("flex-1 py-5 space-y-0.5", collapsed ? "px-1.5" : "px-3")}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mb-3">
                Workspace
              </p>
            )}
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2",
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
                  {!collapsed && item.name}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{linkContent}</div>;
            })}
          </nav>



          {/* User */}
          {session?.user && (
            <div className={cn("border-t border-border/40", collapsed ? "px-1.5 py-3 flex justify-center" : "px-4 pb-5 pt-4")}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => { await signOut(); router.push("/sign-in"); }}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={session.user.image || ""} />
                        <AvatarFallback className="text-[10px] uppercase">
                          {session.user.name?.substring(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    <div className="flex flex-col">
                      <span className="font-medium">{session.user.name}</span>
                      <span className="text-muted-foreground text-[10px]">{session.user.email}</span>
                      <span className="text-[10px] flex items-center gap-1 mt-1 text-red-400"><LogOut className="h-3 w-3" /> Sign out</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div 
                  className="cursor-pointer group"
                  onClick={async () => { await signOut(); router.push("/sign-in"); }}
                >
                  <div className="flex items-center gap-2.5 hover:bg-muted/60 p-2 -mx-2 rounded-lg transition-colors">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="text-[10px] uppercase">
                        {session.user.name?.substring(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-xs font-semibold leading-tight group-hover:text-primary transition-colors">{session.user.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground leading-tight group-hover:text-foreground/80 transition-colors">{session.user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Main area (sidebar offset) ───────────────────────── */}
        <div className={cn("flex flex-1 flex-col transition-all duration-200", mainOffset)}>
          {/* ── Top Header ───────────────────────────────────────── */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/50 bg-card/60 backdrop-blur-md px-6 shrink-0">
            {/* Left: Page breadcrumb / title */}
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleCollapsed}
                    className="flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-8 h-8"
                  >
                    {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  {collapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>
              <span className="text-sm font-semibold text-foreground/80">
                {pathname === "/" ? "Studio" : pathname === "/gallery" ? "Gallery" : "Dashboard"}
              </span>
            </div>

            {/* Right: Credits + CTA */}
            <div className="flex items-center gap-3">
              {/* Credit badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm">
                <Coins className="h-3.5 w-3.5 text-primary" />
                {isAdmin ? (
                  <span className="flex items-center gap-1 text-foreground">
                    <Infinity className="h-3.5 w-3.5 text-primary" />
                    Unlimited
                  </span>
                ) : (
                  <span className="text-foreground">
                    {credits === null ? "—" : `${credits} Credit${credits !== 1 ? "s" : ""}`}
                  </span>
                )}
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
    </TooltipProvider>
  );
}
