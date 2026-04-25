"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { usePostHog } from 'posthog-js/react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Wand2, Images, Zap, Coins, Infinity, PanelLeftClose, PanelLeftOpen, LogOut, Menu, Settings, AlertTriangle, X, ChevronsUpDown, Sun, Moon, Laptop, MessageSquare, Receipt, Globe } from "lucide-react";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { AuthLoadingOverlay } from "@/components/auth-loading-overlay";
import { PricingDialog } from "@/components/pricing/pricing-dialog";

export function DashboardLayout({ children, country }: { children: ReactNode; country?: string }) {
  const pathname = usePathname();

  const { data: session, isPending: sessionLoading } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const posthog = usePostHog();

  useEffect(() => {
    if (session?.user) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session?.user, posthog]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Auth guard: redirect to sign-in when session has resolved and there is no user
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/sign-in");
    }
  }, [sessionLoading, session, router]);
  const [credits, setCredits] = useState<number | null>(null);
  const [zeroCreditWarning, setZeroCreditWarning] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(saved === "true");
    }
    // Delay transitions until after hydration and after we've restored the state
    const timer = setTimeout(() => {
      setEnableTransition(true);
    }, 200);
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
          if (data.zeroCreditByIp) setZeroCreditWarning(true);
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
    { name: "Spotlight", href: "/spotlight", icon: Globe },
  ];

  const sidebarWidth = collapsed ? "w-[60px]" : "w-[220px]";
  const mainOffset = collapsed ? "md:pl-[60px]" : "md:pl-[220px]";

  const renderSidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;
    return (
      <div className="flex flex-col h-full bg-card/50">
        {/* Logo */}
        <div className={cn("flex h-14 items-center border-b border-border/40 shrink-0 overflow-hidden", isCollapsed ? "justify-center px-2" : "px-5")}>
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
            <Link href="/" onClick={() => isMobile && setMobileMenuOpen(false)} className="flex items-center gap-2 group">
              <Image
                src="/assets/audora-square-logo.png"
                alt="Audora Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain group-hover:opacity-80 transition-opacity shrink-0"
                priority
              />
              <span className={cn("font-heading text-lg font-bold tracking-tight whitespace-nowrap transition-opacity duration-200", isCollapsed ? "opacity-0" : "opacity-100")}>Audora</span>
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 py-5 space-y-0.5 overflow-hidden", isCollapsed ? "px-1.5" : "px-3")}>
          <p className={cn(
            "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mb-3 whitespace-nowrap transition-opacity duration-200 overflow-hidden",
            isCollapsed ? "opacity-0 h-0 mb-0" : "opacity-100"
          )}>
            Workspace
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap overflow-hidden",
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
                {!isCollapsed && <span className="transition-opacity duration-200">{item.name}</span>}
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

        {/* Feedback Trigger */}
        <div className={cn("px-3 mb-2", isCollapsed && "px-1.5")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <FeedbackDialog>
                  <button className="flex items-center justify-center w-full rounded-lg py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </FeedbackDialog>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Share Feedback
              </TooltipContent>
            </Tooltip>
          ) : (
            <FeedbackDialog>
              <button className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <MessageSquare className="h-4 w-4" />
                <span>Share Feedback</span>
              </button>
            </FeedbackDialog>
          )}
        </div>

        {/* User */}
        <div className={cn("border-t border-border/40 overflow-hidden", isCollapsed ? "px-1.5 pt-3 pb-8 flex justify-center" : "px-4 pb-5 pt-4")}>
          {sessionLoading ? (
            /* Skeleton while session is resolving */
            isCollapsed ? (
              <div className="h-8 w-8 rounded-full bg-muted/60 animate-pulse" />
            ) : (
              <div className="flex items-center gap-2.5 p-2 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-muted/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 rounded-full bg-muted/60 animate-pulse" />
                  <div className="h-2 w-32 rounded-full bg-muted/40 animate-pulse" />
                </div>
              </div>
            )
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {isCollapsed ? (
                  <button className="hover:opacity-80 transition-opacity focus:outline-none">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="text-[10px] uppercase">
                        {session.user.name?.substring(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                ) : (
                  <button className="w-full text-left group focus:outline-none focus:ring-0">
                    <div className="flex items-center gap-2.5 hover:bg-muted/60 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-border/40">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={session.user.image || ""} />
                        <AvatarFallback className="text-[10px] uppercase">
                          {session.user.name?.substring(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-xs font-semibold leading-tight group-hover:text-primary transition-colors">{session.user.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground leading-tight group-hover:text-foreground/80 transition-colors tracking-tight font-medium opacity-70">{session.user.email}</p>
                      </div>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground shrink-0 transition-colors" />
                    </div>
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isCollapsed ? "right" : "top"}
                align={isCollapsed ? "end" : "start"}
                sideOffset={12}
                className="w-60 p-0 overflow-hidden border-border/40 shadow-xl bg-card/95 backdrop-blur-md"
              >
                {/* User info header */}
                <div className="px-3.5 py-3.5 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background shadow-sm">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="text-xs uppercase bg-primary/10 text-primary font-bold">
                        {session.user.name?.substring(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-bold leading-none mb-1 text-foreground">{session.user.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground leading-none font-medium prose-sm">{session.user.email}</p>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator className="m-0" />

                {/* Theme Toggle Section - Premium Tabs */}
                <div className="p-2 bg-muted/10">
                  <Tabs
                    value={mounted ? theme : "system"}
                    onValueChange={(v) => setTheme(v)}
                    className="w-full"
                  >
                    <TabsList className="w-full h-8 bg-muted/40 p-1 border border-border/20">
                      <TabsTrigger value="light" title="Light" className="flex-1 h-6 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all focus-visible:outline-none">
                        <Sun className="h-3.5 w-3.5" />
                      </TabsTrigger>
                      <TabsTrigger value="dark" title="Dark" className="flex-1 h-6 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all focus-visible:outline-none">
                        <Moon className="h-3.5 w-3.5" />
                      </TabsTrigger>
                      <TabsTrigger value="system" title="System" className="flex-1 h-6 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all focus-visible:outline-none">
                        <Laptop className="h-3.5 w-3.5" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <DropdownMenuSeparator className="m-0" />

                {/* Menu items */}
                <DropdownMenuGroup className="p-1.5 section-group">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/account"
                      onClick={() => isMobile && setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer group/item"
                    >
                      <Settings className="h-4 w-4 group-hover/item:rotate-45 transition-transform duration-300" />
                      Account
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/transactions"
                      onClick={() => isMobile && setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer group/item"
                    >
                      <Receipt className="h-4 w-4 group-hover/item:scale-110 transition-transform duration-200" />
                      Transactions
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="-mx-1.5 my-1.5" />

                  <DropdownMenuItem
                    onClick={async () => {
                      setIsSigningOut(true);
                      await signOut();
                      posthog.reset();
                      router.push("/sign-in");
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer group/item"
                  >
                    <LogOut className="h-4 w-4 group-hover/item:-translate-x-1 transition-transform" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <AuthLoadingOverlay isVisible={isSigningOut} message="Signing out..." />
      <div className="flex min-h-screen bg-background text-foreground">
        {/* ── Sidebar (Desktop) ─────────────────────────────────────────── */}
        <aside className={cn(
          "hidden md:flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm fixed inset-y-0 left-0 z-40 overflow-hidden",
          enableTransition ? "transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]" : "",
          sidebarWidth
        )}>
          {renderSidebarContent()}
        </aside>

        {/* ── Main area (sidebar offset) ───────────────────────── */}
        <div className={cn(
          "flex flex-1 flex-col w-full",
          enableTransition ? "transition-[padding-left] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]" : "",
          mainOffset
        )}>
          {/* ── Top Header ───────────────────────────────────────── */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-card/60 backdrop-blur-md px-4 md:px-6 shrink-0">
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
                    <SheetDescription className="sr-only">Mobile navigation menu links and workspace switcher.</SheetDescription>
                    {renderSidebarContent(true)}
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Right: Feedback + Credits + CTA */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Feedback Trigger (Desktop) */}
              <div className="hidden sm:block">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FeedbackDialog>
                      <button className="flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-8 h-8">
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </FeedbackDialog>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    Share Feedback
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Credit badge */}
              <div className="flex h-7 items-center gap-1.5 rounded-full bg-primary/[0.08] dark:bg-primary/[0.15] px-3 text-[11px] sm:text-xs font-bold text-primary border border-primary/10 transition-colors">
                <Coins className="h-3.5 w-3.5" />
                {sessionLoading ? (
                  <div className="h-2.5 w-14 rounded-full bg-primary/20 animate-pulse" />
                ) : isAdmin ? (
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
              <Button
                size="sm"
                onClick={() => setIsPricingOpen(true)}
                className="h-7 sm:h-8 rounded-full text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 shadow-sm hover:shadow-primary/25 transition-shadow px-3 sm:px-4"
              >
                <Zap className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                <span className="hidden sm:inline">Top Up</span>
                <span className="inline sm:hidden">Top Up</span>
              </Button>
            </div>
          </header>

          {/* ── Zero-Credit Warning Banner (Sybil Defense UX) ──── */}
          {zeroCreditWarning && credits === 0 && (
            <div className="relative bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
              <div className="flex items-start gap-3 max-w-3xl mx-auto">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="text-amber-200 leading-relaxed">
                    <span className="font-semibold">Hi!</span> It looks like your current network has reached its daily limit for free credits. But do not worry, your account is fully active! You can start generating 3D icons right away by doing a{" "}
                    <button
                      onClick={() => setIsPricingOpen(true)}
                      className="underline underline-offset-2 font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Credit Top-up
                    </button>
                    {" "}or contact{" "}
                    <a
                      href="mailto:support@useaudora.com"
                      className="underline underline-offset-2 font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Support
                    </a>
                    {" "}if you think this is a mistake.
                  </p>
                </div>
                <button
                  onClick={() => setZeroCreditWarning(false)}
                  className="text-amber-500/60 hover:text-amber-400 transition-colors shrink-0 mt-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Page Content ─────────────────────────────────────── */}
          <main className="flex-1 relative overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </div>
      <PricingDialog open={isPricingOpen} onOpenChange={setIsPricingOpen} country={country} />
    </TooltipProvider>
  );
}

