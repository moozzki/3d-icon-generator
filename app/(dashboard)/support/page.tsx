import { Mail, Clock, Headset } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="flex flex-col h-full w-full px-4 md:px-8 py-8 gap-8 mt-2 items-start min-h-[calc(100vh-3.5rem)]">
      <div className="space-y-1">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground text-sm">
          Need a hand or ran into an issue? We&apos;ve got your back.
        </p>
      </div>

      <div className="max-w-3xl w-full grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6 p-6 md:p-8 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="relative z-10 h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          
          <div className="relative z-10 space-y-2">
            <h3 className="font-heading text-xl font-bold">Email Us</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Drop us a line anytime. We try our best to respond as quickly as possible. You can email directly at support@useaudora.com
            </p>
          </div>

          <a
            href="mailto:support@useaudora.com"
            className="relative z-10 mt-auto inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors gap-2 w-full sm:w-auto shadow-sm hover:shadow-primary/25"
          >
            <Headset className="h-4 w-4" />
            Contact Support
          </a>
        </div>

        <div className="flex flex-col gap-6 p-6 md:p-8 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-secondary/50 flex items-center justify-center border border-secondary shrink-0">
            <Clock className="h-6 w-6 text-foreground/70" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-heading text-xl font-bold">Support Hours</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our team is available during the following hours:
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">
                <span className="text-foreground">8:00 AM – 4:00 PM</span>
                <span className="text-muted-foreground">WIB (UTC+7)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
