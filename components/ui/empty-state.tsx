import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-y border-line px-5 py-12 text-center sm:px-8">
      <h2 className="font-serif text-2xl tracking-tight text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
