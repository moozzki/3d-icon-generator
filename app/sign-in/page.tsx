"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { AuthLoadingOverlay } from "@/components/auth-loading-overlay";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"google" | "github" | "magic" | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // ── Last-used method ───────────────────────────────────────────────────────
  // getLastUsedLoginMethod() reads from localStorage — only available on the
  // client. Initialise to null so SSR and the first client render match, then
  // populate after hydration via useEffect.
  const [lastMethod, setLastMethod] = useState<string | null>(null);
  useEffect(() => {
    setLastMethod(authClient.getLastUsedLoginMethod() ?? null);
  }, []);

  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") || "/";

  const isLastGoogle = lastMethod === "google";
  const isLastGithub = lastMethod === "github";
  const isLastMagicLink = lastMethod === "magic-link" || lastMethod === "email";

  const handleSocialLogin = async (provider: "google" | "github") => {
    setLoading(provider);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL,
      });
    } catch {
      toast.error("Connection failed. Please try again.");
      setLoading(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading("magic");
    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL,
      });
      setMagicLinkSent(true);
      toast.success("Magic link sent! Check your inbox.");
    } catch {
      toast.error("Failed to send magic link. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const getLoadingMessage = () => {
    if (loading === "google") return "Signing in with Google...";
    if (loading === "github") return "Signing in with GitHub...";
    if (loading === "magic") return "Sending magic link...";
    return "Please wait...";
  };

  return (
    <>
      <AuthLoadingOverlay isVisible={loading !== null && loading !== "magic"} message={getLoadingMessage()} />
      <Card className="relative w-full max-w-sm border-border/60 shadow-2xl shadow-black/5">
        <CardHeader className="space-y-3 text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-1">
            <Image
              src="/assets/audora-square-logo.png"
              alt="Audora"
              width={44}
              height={44}
              className="w-11 h-11 object-contain"
              priority
            />
          </div>

          <div>
            <CardTitle className="text-2xl font-bold font-heading">
              Sign in to Audora
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm">
              Let&apos;s make some 3D magic.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {!magicLinkSent ? (
            <>
              {/* ── Social Login Buttons ──────────────────────────── */}
              <div className="space-y-2.5">
                <Button
                  variant="outline"
                  className="w-full h-11 text-sm font-medium gap-3 rounded-full border-border/70 hover:bg-muted/60 transition-all relative"
                  onClick={() => handleSocialLogin("google")}
                  disabled={loading !== null}
                >
                  {loading === "google" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Continue with Google
                   {isLastGoogle && (
                    <Badge className="absolute right-2.5 text-[10px] h-5 px-1.5 bg-primary text-primary-foreground border-none hover:bg-primary/90 pointer-events-none">
                      Last used
                    </Badge>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 text-sm font-medium gap-3 rounded-full border-border/70 hover:bg-muted/60 transition-all relative"
                  onClick={() => handleSocialLogin("github")}
                  disabled={loading !== null}
                >
                  {loading === "github" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  )}
                  Continue with GitHub
                  {isLastGithub && (
                    <Badge className="absolute right-2.5 text-[10px] h-5 px-1.5 bg-primary text-primary-foreground border-none hover:bg-primary/90 pointer-events-none">
                      Last used
                    </Badge>
                  )}
                </Button>
              </div>

              {/* ── Divider ──────────────────────────────────────── */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground/60">
                    or sign in via email
                  </span>
                </div>
              </div>

              {/* ── Magic Link Form ──────────────────────────────── */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-full text-sm"
                    disabled={loading !== null}
                  />
                </div>
                <Button
                  className="w-full h-11 rounded-full text-sm font-semibold gap-2 relative"
                  type="submit"
                  disabled={loading !== null || !email.trim()}
                >
                  {loading === "magic" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Send Magic Link
                  {isLastMagicLink && (
                    <Badge className="absolute right-2.5 text-[10px] h-5 px-1.5 bg-[#CCCCFF] text-[#09090b] border-none hover:bg-[#CCCCFF]/90 pointer-events-none">
                      Last used
                    </Badge>
                  )}
                </Button>
              </form>

              {/* ── Footer note ──────────────────────────────────── */}
              <p className="text-center text-[11px] text-muted-foreground/50 pt-1">
                By signing in, you agree to Audora&apos;s terms of service.
              </p>
            </>
          ) : (
            /* ── Magic Link Sent ──────────────────────────────────── */
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold font-heading">Check your inbox!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                  We&apos;ve sent a magic link to{" "}
                  <span className="font-semibold text-foreground">{email}</span>.
                  Click the link to sign in.
                </p>
              </div>
              <p className="text-xs text-muted-foreground/50">
                Link will expire in 5 minutes.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 rounded-full"
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail("");
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Try another method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.06] pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-sm h-96 rounded-xl border border-border/60 bg-card animate-pulse" />
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
