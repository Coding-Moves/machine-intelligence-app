import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
};

const base =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55";

export function Button({
  children,
  variant = "primary",
  href,
  className = "",
  title,
  disabled = false,
  type = "button",
  onClick,
}: ButtonProps) {
  const style =
    variant === "primary"
      ? "border-leaf bg-leaf text-white hover:border-leaf-dark hover:bg-leaf-dark focus-visible:outline-leaf"
      : "border-line bg-paper text-ink hover:border-leaf hover:text-leaf-dark focus-visible:outline-leaf";
  const classes = base + " " + style + " " + className;

  if (href) {
    return (
      <Link
        className={classes}
        href={href}
        title={title}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  );
}
