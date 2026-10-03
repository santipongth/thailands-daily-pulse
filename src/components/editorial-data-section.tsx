import type { ReactNode } from "react";

type EditorialDataSectionProps = {
  eyebrow: string;
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function EditorialDataSection({ eyebrow, title, summary, children, footer }: EditorialDataSectionProps) {
  return (
    <section className="editorial-data-section">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-editorial-rule pb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-editorial-red">{eyebrow}</p>
          <h2 className="mt-1 font-editorial text-2xl leading-tight text-editorial-ink sm:text-3xl">{title}</h2>
        </div>
        {summary && <div className="shrink-0 text-right">{summary}</div>}
      </header>
      <div className="pt-5">{children}</div>
      {footer && <footer className="mt-5 border-t border-editorial-rule pt-3 text-xs leading-relaxed text-muted-foreground">{footer}</footer>}
    </section>
  );
}