import type { ReactNode } from "react";
import Link from "next/link";
import { DeskNavigation } from "@/components/desk-navigation";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";
import { requireEditor } from "@/lib/auth/require-editor";
import { signOut } from "@/app/desk/actions";
import { Button } from "@/components/ui/button";

export default async function DeskLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, editor } = await requireEditor();

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line px-4 py-6 md:flex md:flex-col">
        <Link href="/" className="mb-8 block">
          <span className="font-serif text-lg tracking-tight text-ink">
            {magazine.name}
          </span>
          <span className="mt-1 block text-xs text-muted">
            {siteCopy.desk.title}
          </span>
        </Link>
        <DeskNavigation role={editor.role} />
        <p className="mt-auto border-t border-line pt-4 text-xs leading-5 text-muted">
          {magazine.universityShort}
        </p>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-8">
          <div>
            <p className="font-serif text-xl tracking-tight text-ink">
              {siteCopy.desk.title}
            </p>
            <p className="mt-1 text-xs text-muted">
              {siteCopy.desk.currentUser}: {editor.name} · {user.email}
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="secondary" className="min-h-10 px-4 text-xs">
              {siteCopy.desk.signOut}
            </Button>
          </form>
        </header>
        <main className="min-w-0 pb-24 md:pb-10">{children}</main>
      </div>
      <DeskNavigation role={editor.role} mobile />
    </div>
  );
}
