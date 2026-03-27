"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Wand2, Images, Sparkles, Zap, Coins, Infinity, PanelLeftClose, PanelLeftOpen, LogOut, Menu, Settings } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const { data: session } = useSession();
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(saved === "true");
    }
    const timer = setTimeout(() => setEnableTransition(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isAdmin = session?.user && (session.user as { role?: string }).role === "admin";

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", next.toString());
      return next;
    });
  };

  useEffect(() => {
    if (!session?.user || isAdmin) {
      return;
    }
    const fetchCredits = () => {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.balance === "number") setCredits(data.balance);
        })
        .catch(() => { });
    };

    fetchCredits();

    window.addEventListener("credits-updated", fetchCredits);
    return () => window.removeEventListener("credits-updated", fetchCredits);
  }, [session, isAdmin]);

  const navItems = [
    { name: "Studio", href: "/", icon: Wand2 },
    { name: "Library", href: "/library", icon: Images },
  ];

  const sidebarWidth = collapsed ? "w-[60px]" : "w-[200px]";
  const mainOffset = collapsed ? "md:pl-[60px]" : "md:pl-[200px]";

  const renderSidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;
    return (
      <div className="flex flex-col h-full bg-card/50">
        {/* Logo */}
        <div className={cn("flex h-14 items-center border-b border-border/40 shrink-0", isCollapsed ? "justify-center px-2" : "px-5")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/" onClick={() => isMobile && setMobileMenuOpen(false)} className="flex items-center justify-center group">
                  <Image 
                    src="/assets/audora-square-logo.png" 
                    alt="Audora Logo" 
                    width={28} 
                    height={28} 
                    className="w-7 h-7 object-contain group-hover:opacity-80 transition-opacity shrink-0"
                    priority 
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Audora
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link href="/" onClick={() => isMobile && setMobileMenuOpen(false)} className="flex items-center group">
              <Image 
                src="/assets/audora-landscape-logo.png" 
                alt="Audora Logo" 
                width={120} 
                height={28} 
                className="h-7 w-auto object-contain group-hover:opacity-80 transition-opacity shrink-0"
                priority 
              />
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 py-5 space-y-0.5", isCollapsed ? "px-1.5" : "px-3")}>
          {!isCollapsed && (
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
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                  isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2",
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
                {!isCollapsed && item.name}
              </Link>
            );

            if (isCollapsed) {
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
          <div className={cn("border-t border-border/40 mt-auto", isCollapsed ? "px-1.5 pt-3 pb-8 flex justify-center" : "px-4 pb-5 pt-4")}>
            <Popover>
              <PopoverTrigger asChild>
                {isCollapsed ? (
                  <button className="hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="text-[10px] uppercase">
                        {session.user.name?.substring(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                ) : (
                  <button className="w-full text-left group">
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
                  </button>
                )}
              </PopoverTrigger>
              <PopoverContent
                side={isCollapsed ? "right" : "top"}
                align={isCollapsed ? "end" : "start"}
                sideOffset={12}
                alignOffset={isCollapsed ? -6 : 0}
                className="w-56 p-0"
              >
                {/* User info header */}
                <div className="px-3 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="text-[10px] uppercase">
                        {session.user.name?.substring(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-xs font-semibold leading-tight">{session.user.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground leading-tight">{session.user.email}</p>
                    </div>
                  </div>
                </div>
                {/* Menu items */}
                <div className="p-1">
                  <Link
                    href="/account"
                    onClick={() => isMobile && setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Account
                  </Link>
                  <button
                    onClick={async () => { await signOut(); router.push("/sign-in"); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* ── Sidebar (Desktop) ─────────────────────────────────────────── */}
        <aside className={cn(
          "hidden md:flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm fixed inset-y-0 left-0 z-20",
          enableTransition ? "transition-all duration-200" : "",
          sidebarWidth
        )}>
          {renderSidebarContent()}
        </aside>

        {/* ── Main area (sidebar offset) ───────────────────────── */}
        <div className={cn("flex flex-1 flex-col w-full", enableTransition ? "transition-all duration-200" : "", mainOffset)}>
          {/* ── Top Header ───────────────────────────────────────── */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/50 bg-card/60 backdrop-blur-md px-4 md:px-6 shrink-0">
            {/* Left: Page breadcrumb / title Add Mobile Menu Control */}
            <div className="flex items-center gap-3">
              {/* Desktop toggle button */}
              <div className="hidden md:flex">
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
              </div>

              {/* Mobile Menu Sheet */}
              <div className="md:hidden flex items-center">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <button className="flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-8 h-8 -ml-1">
                      <Menu className="h-5 w-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[260px] p-0 flex flex-col border-r-border/50">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    {renderSidebarContent(true)}
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Right: Credits + CTA */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Credit badge */}
              <div className="flex h-7 items-center gap-1.5 rounded-full bg-primary/[0.08] dark:bg-primary/[0.15] px-3 text-[11px] sm:text-xs font-bold text-primary border border-primary/10 transition-colors">
                <Coins className="h-3.5 w-3.5" />
                {isAdmin ? (
                  <span className="flex items-center gap-1">
                    <Infinity className="h-3.5 w-3.5" />
                    <span>Unlimited</span>
                  </span>
                ) : (
                  <span>
                    {credits === null ? "—" : `${credits} Credit${credits !== 1 ? "s" : ""}`}
                  </span>
                )}
              </div>

              {/* Top Up CTA */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 sm:h-8 rounded-full text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 shadow-sm hover:shadow-primary/25 transition-shadow px-3 sm:px-4"
                  >
                    <Zap className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                    <span className="hidden sm:inline">Top Up</span>
                    <span className="inline sm:hidden">Top Up</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm w-[95vw] rounded-xl mx-auto">
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
          <main className="dot-canvas flex-1 relative overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

