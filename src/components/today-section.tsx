// Shared Today-page section frame (pattern from "ความเคลื่อนไหวจาก Social Media").
import type { ReactNode } from "react";

export const thTime = (iso: string | null | undefined) =>
  iso ? `${new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} น.` : "—";

export function TodaySection({ id, title, note, action, children }: { id: string; title: string; note?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-editorial-ink pt-5 font-editorial-body" aria-labelledby={id}>
      <div className="flex items-baseline gap-3 border-b border-editorial-rule pb-3">
        <h2 id={id} className="font-editorial text-2xl leading-snug text-editorial-red">{title}</h2>
        <span aria-hidden="true" className="hidden h-px flex-1 bg-editorial-rule sm:block" />
        {action && <span className="shrink-0 text-sm">{action}</span>}
      </div>
      {note && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{note}</p>}
      {children}
    </section>
  );
}

export function TodayEmpty({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-sm text-muted-foreground">{children}</p>;
}

export function TodayList({ children }: { children: ReactNode }) {
  return <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">{children}</ul>;
}

export function TodayItem({ label, children, meta }: { label: ReactNode; children: ReactNode; meta?: ReactNode }) {
  return (
    <li className="min-w-0 border-b border-editorial-rule py-4 text-sm leading-relaxed">
      <p className="text-xs font-semibold text-editorial-red">{label}</p>
      <div className="mt-1">{children}</div>
      {meta && <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">{meta}</div>}
    </li>
  );
}
