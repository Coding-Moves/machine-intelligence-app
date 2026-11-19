import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DeskNavigation } from "@/components/desk-navigation";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";
import { requireEditor } from "@/lib/auth/require-editor";
import { signOut } from "@/app/desk/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DeskLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, editor } = await requireEditor();

  return (
    <div className="bg-paper min-h-screen md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-line hidden border-r px-4 py-6 md:flex md:flex-col">
        <Link
          href="/"
          aria-label={magazine.name + ", home"}
          className="mb-8 flex items-center gap-2"
        >
          <Image
            alt=""
            className="size-8 shrink-0"
            height={40}
            src="/brand/icon-192.png"
            width={40}
          />
          <span>
            <span className="text-ink block font-serif text-base tracking-tight">
              {magazine.name}
            </span>
            <span className="text-muted mt-1 block text-xs">
              {siteCopy.desk.title}
            </span>
          </span>
        </Link>
        <DeskNavigation role={editor.role} />
        <p className="border-line text-muted mt-auto border-t pt-4 text-xs leading-5">
          {magazine.universityShort}
        </p>
      </aside>
      <div className="min-w-0">
        <header className="border-line flex min-h-16 items-center justify-between gap-4 border-b px-5 py-3 sm:px-8">
          <div>
            <p className="text-ink font-serif text-xl tracking-tight">
              {siteCopy.desk.title}
            </p>
            <p className="text-muted mt-1 text-xs">
              {siteCopy.desk.currentUser}: {editor.name} · {user.email}
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="secondary"
              className="min-h-10 px-4 text-xs"
            >
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
