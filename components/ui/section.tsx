import type { ReactNode } from "react";
import { Container } from "./container";

export function Section({
  children,
  variant = "paper",
  className = "",
  contained = true,
}: {
  children: ReactNode;
  variant?: "paper" | "mist" | "band";
  className?: string;
  contained?: boolean;
}) {
  const background = {
    paper: "bg-paper text-ink",
    mist: "bg-mist text-ink",
    band: "bg-band text-paper",
  }[variant];
  const inner = contained ? <Container>{children}</Container> : children;

  return (
    <section
      className={background + " py-16 sm:py-20 lg:py-24 " + className}
    >
      {inner}
    </section>
  );
}
