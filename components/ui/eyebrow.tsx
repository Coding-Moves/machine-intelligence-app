import type { ReactNode } from "react";

export function Eyebrow({
  children,
  tone = "leaf",
}: {
  children: ReactNode;
  tone?: "leaf" | "sun";
}) {
  return (
    <p
      className={
        "text-xs font-semibold uppercase tracking-[0.18em] " +
        (tone === "sun" ? "text-sun" : "text-leaf")
      }
    >
      {children}
    </p>
  );
}
