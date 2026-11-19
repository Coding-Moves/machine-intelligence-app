import Image from "next/image";
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
    <header className="border-line bg-paper border-b">
      <Container className="flex min-h-20 flex-col justify-center gap-4 py-4 sm:min-h-[88px] sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <Link
          className="text-ink w-fit focus-visible:rounded-sm"
          href="/"
          aria-label={magazine.name + ", home"}
        >
          <Image
            alt=""
            className="h-auto w-[284px] max-w-full"
            height={196}
            priority
            src="/brand/logo-horizontal.svg"
            width={580}
          />
        </Link>
        <nav
          aria-label={siteCopy.nav.menu}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              className="text-muted hover:text-leaf-dark transition-colors"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          <Link
            className="text-leaf-dark font-medium underline-offset-4 hover:underline"
            href="/login"
          >
            {siteCopy.nav.login}
          </Link>
        </nav>
      </Container>
    </header>
  );
}
