import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment/complete")({
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      search["status"] === "success" || search["status"] === "failed" || search["status"] === "invalid"
        ? search["status"]
        : "pending",
  }),
  head: () => ({
    meta: [
      { title: "Payment status — CodeMarket" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentComplete,
});

function PaymentComplete() {
  const { status } = Route.useSearch();
  const content = {
    success: {
      icon: CheckCircle2,
      title: "Payment confirmed",
      description: "Your payment was verified. Your software download is now available.",
      tone: "text-emerald-600",
    },
    failed: {
      icon: XCircle,
      title: "Payment could not be confirmed",
      description: "No money was unlocked for download. Check your purchase status or try again.",
      tone: "text-destructive",
    },
    invalid: {
      icon: XCircle,
      title: "Invalid payment return",
      description: "The payment provider did not return enough information to verify this payment.",
      tone: "text-destructive",
    },
    pending: {
      icon: Clock3,
      title: "Payment processing",
      description: "Your payment is being verified. Check your purchases shortly for the updated status.",
      tone: "text-primary",
    },
  }[status];
  const Icon = content.icon;

  return (
    <SiteLayout>
      <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Icon className={`mx-auto h-12 w-12 ${content.tone}`} aria-hidden />
          <h1 className="mt-5 font-display text-2xl font-bold">{content.title}</h1>
          <p className="mt-3 text-muted-foreground">{content.description}</p>
          <Button asChild className="mt-7">
            <Link to="/purchases">View my purchases</Link>
          </Button>
        </div>
      </main>
    </SiteLayout>
  );
}
