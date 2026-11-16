import Link from "next/link";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";
import { Container } from "@/components/ui/container";

const links = [
  { href: "/issues", label: siteCopy.nav.issues },
  { href: "/about", label: siteCopy.nav.about },
  { href: "/how-its-made", label: siteCopy.nav.process },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <Container className="flex min-h-20 flex-col justify-center gap-4 py-4 sm:min-h-[88px] sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <Link
          className="w-fit text-ink focus-visible:rounded-sm"
          href="/"
          aria-label={magazine.name + ", home"}
        >
          <span className="font-serif text-xl tracking-[-0.04em] sm:text-2xl">
            {magazine.name}
            <span className="text-leaf" aria-hidden="true">
              ✦
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] tracking-wide text-muted">
            {magazine.universityShort} · {magazine.departmentShort}
          </span>
        </Link>
        <nav
          aria-label={siteCopy.nav.menu}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              className="text-muted transition-colors hover:text-leaf-dark"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          <Link
            className="font-medium text-leaf-dark underline-offset-4 hover:underline"
            href="/login"
          >
            {siteCopy.nav.login}
          </Link>
        </nav>
      </Container>
    </header>
  );
}
