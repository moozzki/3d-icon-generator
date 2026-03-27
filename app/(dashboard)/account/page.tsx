"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Lock,
  Link2,
  Trash2,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Unlink,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

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

type AccountInfo = {
  id: string;
  accountId: string;
  providerId: string;
};

export default function AccountPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Profile state
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Linked accounts state
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  // Delete state
  const [deletePassword, setDeletePassword] = useState("");
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

  const hasCredentialAccount = accounts.some((a) => a.providerId === "credential");
  const hasGoogleAccount = accounts.some((a) => a.providerId === "google");

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

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPasswordLoading(true);
    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to change password. Check your current password.");
    } finally {
      setPasswordLoading(false);
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

  const handleUnlinkAccount = async (providerId: string) => {
    setUnlinkingProvider(providerId);
    try {
      await authClient.unlinkAccount({ providerId });
      setAccounts((prev) => prev.filter((a) => a.providerId !== providerId));
      toast.success(`${providerId === "google" ? "Google" : "Credential"} account unlinked`);
    } catch {
      toast.error("Failed to unlink account. You must have at least one linked account.");
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      if (hasCredentialAccount && deletePassword) {
        await authClient.deleteUser({ password: deletePassword });
      } else {
        await authClient.deleteUser();
      }
      toast.success("Account deleted. Goodbye!");
      router.push("/sign-in");
    } catch {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Account
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
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
                <AvatarImage src={imageUrl || session.user.image || ""} />
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

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="image" className="text-xs text-muted-foreground">
                Avatar URL
              </Label>
              <Input
                id="image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="h-9 text-sm bg-background/50"
              />
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

        {/* ── Change Password ──────────────────────────────────── */}
        <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Password</h2>
          </div>
          <div className="p-5 space-y-4">
            {!hasCredentialAccount ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  You signed in with OAuth. Use the &quot;Forgot Password&quot; flow to set a password.
                </span>
              </div>
            ) : (
              <>
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs text-muted-foreground">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-sm bg-background/50 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs text-muted-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-sm bg-background/50 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-sm bg-background/50 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Revoke sessions */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revokeOtherSessions}
                    onChange={(e) => setRevokeOtherSessions(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-muted-foreground">
                    Sign out of all other devices
                  </span>
                </label>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleChangePassword}
                    disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                    className="gap-1.5"
                  >
                    {passwordLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                    Update Password
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

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
                      disabled={linkingProvider === "google"}
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

                {/* Email/Password */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email & Password</p>
                      <p className="text-[10px] text-muted-foreground">
                        {hasCredentialAccount ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                    {hasCredentialAccount ? "Active" : "Set via forgot password"}
                  </span>
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
                  {hasCredentialAccount && (
                    <div className="space-y-2">
                      <Label htmlFor="deletePassword" className="text-xs text-muted-foreground">
                        Enter your password to confirm
                      </Label>
                      <Input
                        id="deletePassword"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
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
                      disabled={deleteLoading || (hasCredentialAccount && !deletePassword)}
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
