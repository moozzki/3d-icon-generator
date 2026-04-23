"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, getAvatarUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User,
  Mail,
  Link2,
  Trash2,
  Loader2,
  Check,
  Unlink,
  Panda,
} from "lucide-react";

// Google SVG icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// GitHub SVG icon component
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

type AccountInfo = {
  id: string;
  accountId: string;
  providerId: string;
};

export default function AccountPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Profile state
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState<string | null>(null);

  // Generate 15 stable but "random" seeds for the gallery (5x3 grid)
  const [avatarSeeds] = useState(() =>
    Array.from({ length: 15 }, (_, i) => `seed-${i + 1}`)
  );

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Linked accounts state

  // Linked accounts state
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form with session data
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setImageUrl(session.user.image || "");
    }
  }, [session]);

  // Fetch linked accounts
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await authClient.listAccounts();
        if (res.data) {
          setAccounts(res.data as AccountInfo[]);
        }
      } catch {
        // silently fail
      } finally {
        setAccountsLoading(false);
      }
    }
    if (session?.user) {
      fetchAccounts();
    }
  }, [session]);

  const hasGoogleAccount = accounts.some((a) => a.providerId === "google");
  const hasGithubAccount = accounts.some((a) => a.providerId === "github");

  // Handlers
  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      await authClient.updateUser({
        name,
        image: imageUrl || undefined,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSelectAvatar = async (seed: string) => {
    const newImageUrl = `https://api.dicebear.com/9.x/thumbs/png?seed=${seed}`;
    setUpdatingAvatar(seed);
    try {
      await authClient.updateUser({
        image: newImageUrl,
      });
      setImageUrl(newImageUrl);
      toast.success("Profile picture updated");
      setAvatarModalOpen(false);
    } catch {
      toast.error("Failed to update profile picture");
    } finally {
      setUpdatingAvatar(null);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setEmailLoading(true);
    try {
      await authClient.changeEmail({
        newEmail,
        callbackURL: "/account",
      });
      toast.success("Email updated successfully");
      setNewEmail("");
    } catch {
      toast.error("Failed to change email");
    } finally {
      setEmailLoading(false);
    }
  };


  const handleLinkGoogle = async () => {
    setLinkingProvider("google");
    try {
      await authClient.linkSocial({
        provider: "google",
        callbackURL: "/account",
      });
    } catch {
      toast.error("Failed to link Google account");
      setLinkingProvider(null);
    }
  };

  const handleLinkGithub = async () => {
    setLinkingProvider("github");
    try {
      await authClient.linkSocial({
        provider: "github",
        callbackURL: "/account",
      });
    } catch {
      toast.error("Failed to link GitHub account");
      setLinkingProvider(null);
    }
  };

  const handleUnlinkAccount = async (providerId: string) => {
    setUnlinkingProvider(providerId);
    try {
      await authClient.unlinkAccount({ providerId });
      setAccounts((prev) => prev.filter((a) => a.providerId !== providerId));

      let providerName = "Account";
      if (providerId === "google") providerName = "Google";
      else if (providerId === "github") providerName = "GitHub";
      else if (providerId === "credential") providerName = "Credential";

      toast.success(`${providerName} account unlinked`);
    } catch {
      toast.error("Failed to unlink account. You must have at least one linked account.");
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authClient.deleteUser();
      toast.success("Account deleted. Goodbye!");
      router.push("/sign-in");
    } catch {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!mounted || isPending) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Account
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile, security, and connected accounts.
          </p>
        </div>

        {/* ── Profile Information ──────────────────────────────── */}
        <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Profile Information</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={getAvatarUrl(imageUrl || session.user.image)} />
                <AvatarFallback className="text-lg uppercase">
                  {session.user.name?.substring(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-muted-foreground">
                Display Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-9 text-sm bg-background/50"
              />
            </div>

            {/* Change Avatar Button */}
            <div className="flex items-center gap-3 pt-1">
              <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-2">
                    <Panda className="h-3.5 w-3.5 text-primary" />
                    Choose Your Avatar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                  <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="font-heading text-xl">Choose Avatar</DialogTitle>
                    <DialogDescription>
                      Pick an avatar that matches your vibe. Your profile updates instantly.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="grid grid-cols-5 gap-3">
                      {avatarSeeds.map((seed) => {
                        const url = `https://api.dicebear.com/9.x/thumbs/png?seed=${seed}`;
                        const isUpdating = updatingAvatar === seed;

                        return (
                          <button
                            key={seed}
                            onClick={() => handleSelectAvatar(seed)}
                            disabled={!!updatingAvatar}
                            className={cn(
                              "relative group aspect-square rounded-xl overflow-hidden border-2 transition-all p-1",
                              imageUrl === url
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : "border-border/40 hover:border-primary/50 hover:bg-muted/50"
                            )}
                          >
                            <Image
                              src={url}
                              alt={`Avatar ${seed}`}
                              fill
                              unoptimized
                              className={cn(
                                "object-cover transition-transform duration-300 group-hover:scale-110 p-1.5",
                                isUpdating && "opacity-20"
                              )}
                              sizes="100px"
                            />
                            {isUpdating && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-6 border-t border-border/40 bg-muted/20 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setAvatarModalOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleUpdateProfile}
                disabled={profileLoading}
                className="gap-1.5"
              >
                {profileLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Changes
              </Button>
            </div>
          </div>
        </section>

        {/* ── Change Email ─────────────────────────────────────── */}
        <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Email Address</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{session.user.email}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail" className="text-xs text-muted-foreground">
                New Email Address
              </Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new-email@example.com"
                className="h-9 text-sm bg-background/50"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleChangeEmail}
                disabled={emailLoading || !newEmail}
                className="gap-1.5"
              >
                {emailLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Change Email
              </Button>
            </div>
          </div>
        </section>

        {/* ── Change Password ──────────────────────────────────── 
            Removed because email/password auth is disabled.
        */}

        {/* ── Linked Accounts ──────────────────────────────────── */}
        <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Linked Accounts</h2>
          </div>
          <div className="p-5 space-y-3">
            {accountsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Google */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50">
                      <GoogleIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Google</p>
                      <p className="text-[10px] text-muted-foreground">
                        {hasGoogleAccount ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {hasGoogleAccount ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnlinkAccount("google")}
                      disabled={unlinkingProvider === "google" || accounts.length <= 1}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-red-400"
                    >
                      {unlinkingProvider === "google" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleLinkGoogle}
                      disabled={linkingProvider !== null}
                      className="gap-1.5 text-xs"
                    >
                      {linkingProvider === "google" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      Link
                    </Button>
                  )}
                </div>

                {/* GitHub */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50">
                      <GithubIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">GitHub</p>
                      <p className="text-[10px] text-muted-foreground">
                        {hasGithubAccount ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {hasGithubAccount ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnlinkAccount("github")}
                      disabled={unlinkingProvider === "github" || accounts.length <= 1}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-red-400"
                    >
                      {unlinkingProvider === "github" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleLinkGithub}
                      disabled={linkingProvider !== null}
                      className="gap-1.5 text-xs"
                    >
                      {linkingProvider === "github" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      Link
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Danger Zone ──────────────────────────────────────── */}
        <section className="rounded-xl border border-red-500/20 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-500/10 flex items-center gap-2.5">
            <Trash2 className="h-4 w-4 text-red-500/70" />
            <h2 className="text-sm font-semibold text-red-500/70">Danger Zone</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-heading text-lg text-red-400">
                    Delete Account
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to permanently delete your account? All your data, generations, and credits will be lost forever.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Password confirmation removed since email/password auth is disabled */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="gap-1.5"
                    >
                      {deleteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete Permanently
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
