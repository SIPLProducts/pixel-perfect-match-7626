import type { ComponentType } from "react";

export type Tone = "primary" | "info" | "success" | "warning" | "destructive";
// Static class map so Tailwind always generates these (no runtime-built class names).
export const toneClass: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

type Icon = ComponentType<{ className?: string }>;

export function Kpi({ label, value, delta, icon: Icon, tone }: { label: string; value: string; delta: string; icon: Icon; tone: Tone }) {
  return <div className="glass-panel rounded-2xl p-5"><div className="flex items-center gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-xl ${toneClass[tone]}`}><Icon className="size-4" /></div><p className="text-xs font-semibold leading-tight text-muted-foreground">{label}</p></div><p className="mt-3 whitespace-nowrap font-display text-xl font-bold tabular-nums xl:text-2xl">{value}</p><p className="mt-2 text-[11px] font-medium text-muted-foreground">{delta}</p></div>;
}

export function CareRow({ icon: Icon, label, value, color, onClick }: { icon: Icon; label: string; value: number; color: Tone; onClick?: () => void }) {
  const body = <><div className={`grid size-9 place-items-center rounded-lg ${toneClass[color]}`}><Icon className="size-4" /></div><span className="flex-1 text-left text-sm text-muted-foreground">{label}</span><b>{value}</b></>;
  return onClick ? <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg transition hover:bg-accent/50">{body}</button> : <div className="flex items-center gap-3">{body}</div>;
}

export function EmptyState({ title, description, icon: Icon }: { title: string; description?: string; icon: Icon }) {
  return <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center"><div><Icon className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">{title}</p>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div></div>;
}
