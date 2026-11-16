"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EditorRole } from "@/lib/supabase/types";
import { siteCopy } from "@/content/site";

export function DeskNavigation({
  role,
  mobile = false,
}: {
  role: EditorRole;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const links = siteCopy.desk.nav.filter(
    (item) => !("adminOnly" in item) || !item.adminOnly || role === "admin",
  );

  return (
    <nav
      aria-label={siteCopy.desk.title}
      className={
        mobile
          ? "fixed inset-x-0 bottom-0 z-30 overflow-x-auto border-t border-line bg-paper px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
          : "hidden flex-col gap-1 md:flex"
      }
    >
      <div className={mobile ? "flex min-w-max gap-1" : "flex flex-col gap-1"}>
        {links.map((item) => {
          const active =
            item.href === "/desk"
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              aria-current={active ? "page" : undefined}
              className={
                (mobile
                  ? "flex min-h-16 min-w-[76px] flex-col items-center justify-center px-2 text-center text-[11px]"
                  : "flex min-h-11 items-center rounded px-3 text-sm") +
                (active
                  ? " bg-mist font-medium text-leaf-dark"
                  : " text-muted hover:bg-mist/70 hover:text-ink")
              }
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
