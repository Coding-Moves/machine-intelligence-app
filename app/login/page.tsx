import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { LoginForm } from "@/app/login/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
  title: siteCopy.login.title,
  description: siteCopy.login.intro,
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage =
    error === "not-editor"
      ? siteCopy.login.notEditor
      : error === "admin-required"
        ? siteCopy.desk.adminRequired
        : error === "sign-in-failed"
          ? siteCopy.login.genericError
          : null;

  return (
    <SiteShell>
      <Section className="min-h-[65vh]">
        <PageHeading
          eyebrow={siteCopy.login.eyebrow}
          title={siteCopy.login.title}
          description={siteCopy.login.intro}
        />
        {errorMessage ? (
          <p className="mt-6 max-w-md rounded border border-[#e7c9c3] bg-[#f4e5e2] p-4 text-sm leading-6 text-[#743b34]">
            {errorMessage}
          </p>
        ) : null}
        <LoginForm />
        <Link
          className="mt-8 inline-flex rounded-sm text-sm text-muted underline underline-offset-4 hover:text-ink"
          href="/"
        >
          {siteCopy.login.back}
        </Link>
      </Section>
    </SiteShell>
  );
}
