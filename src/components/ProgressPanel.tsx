import { CheckCircle2, Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";

type ProgressPanelProps = {
  label: string;
  progress: number;
  detail?: string;
};

export function ProgressPanel({ label, progress, detail }: ProgressPanelProps) {
  const complete = progress >= 100;
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-primary/15 bg-linear-to-br from-primary/8 via-card to-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {complete ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
          )}
          <span className="truncate text-sm font-semibold">{complete ? "Complete" : label}</span>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="mt-3 h-2.5 bg-primary/10" />
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
