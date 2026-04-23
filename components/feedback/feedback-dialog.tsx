"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback } from "@/app/actions/feedback";
import { cn, getAvatarUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FeedbackDialogProps extends React.ComponentPropsWithoutRef<typeof Dialog> {
  children?: React.ReactNode;
}

export function FeedbackDialog({ children, open, onOpenChange, ...props }: FeedbackDialogProps) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (content.length < 10) {
      toast.error("Feedback must be at least 10 characters long");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({
        rating,
        content,
        suggestions: suggestions || undefined,
      });
      toast.success("Thank you! Your feedback helps us build a better Audora.");
      setIsOpen(false);
      // Reset form
      setRating(0);
      setContent("");
      setSuggestions("");
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && (
        <DialogTrigger asChild {...props}>
          {children}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[440px] p-0 gap-0 border-border/40 shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight">Share Your Feedback</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/80">
              Your feedback directly shapes Audora's future.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2.5 p-2 px-3 rounded-lg bg-muted/30 border border-border/50">
              <Avatar className="h-7 w-7 ring-1 ring-background shadow-sm">
                <AvatarImage src={getAvatarUrl(session?.user?.image)} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">{session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold leading-none truncate">{session?.user?.name}</span>
                <span className="text-[10px] text-muted-foreground truncate opacity-70 mt-0.5">{session?.user?.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/90">How would you rate your experience? <span className="text-destructive">*</span></Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-all hover:scale-110 active:scale-95 outline-none rounded-full p-0.5 group"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-all duration-200",
                        (hoverRating || rating) >= star
                          ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.3)]"
                          : "text-muted-foreground/30 group-hover:text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-xs font-semibold text-foreground/90">What do you think of Audora? <span className="text-destructive">*</span></Label>
              <Textarea
                id="content"
                placeholder="Tell us what you like or could be better..."
                className="min-h-[85px] max-h-[120px] bg-muted/20 border-border/60 focus:border-primary/40 focus:ring-primary/20 transition-all rounded-xl p-3 text-xs"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <p className={cn(
                  "text-[9px] font-medium transition-colors",
                  content.length > 0 && content.length < 10 ? "text-destructive" : "text-muted-foreground/60"
                )}>
                  {content.length < 10 ? `${content.length}/10 characters` : "Looks good!"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggestions" className="text-xs font-semibold text-foreground/90">Any suggestions? (Optional)</Label>
              <Textarea
                id="suggestions"
                placeholder="Features you'd like to see..."
                className="min-h-[65px] max-h-[100px] bg-muted/20 border-border/60 focus:border-primary/40 focus:ring-primary/20 transition-all rounded-xl p-3 text-xs"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="rounded-full px-4 text-xs h-9"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={isSubmitting || rating === 0 || content.length < 10}
                className="rounded-full px-6 shadow-lg shadow-primary/20 transition-all active:scale-95 h-9 text-xs font-bold"
              >
                {isSubmitting ? "Submitting..." : "Send Feedback"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
