import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteCopy } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper py-8">
      <Container className="flex flex-col gap-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © 2026 {siteCopy.footer.copyright} · {siteCopy.footer.builtBy}
        </p>
        <nav
          aria-label={siteCopy.footer.navigation}
          className="flex flex-wrap gap-x-5 gap-y-2"
        >
          <Link className="hover:text-leaf-dark" href="/issues">
            {siteCopy.nav.issues}
          </Link>
          <Link className="hover:text-leaf-dark" href="/about">
            {siteCopy.nav.about}
          </Link>
          <a
            className="hover:text-leaf-dark"
            href="https://github.com/Coding-Moves/machine-intelligence-app"
          >
            {siteCopy.footer.github}
          </a>
          <Link className="hover:text-leaf-dark" href="/privacy">
            {siteCopy.footer.privacy}
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
