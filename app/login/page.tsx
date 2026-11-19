import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { LoginForm } from "@/app/login/login-form";
import { hasPublicEnvironment } from "@/lib/env";

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
  const authAvailable = hasPublicEnvironment();
  const errorMessage = authAvailable
    ? error === "not-editor"
      ? siteCopy.login.notEditor
      : error === "admin-required"
        ? siteCopy.desk.adminRequired
        : error === "sign-in-failed"
          ? siteCopy.login.genericError
          : null
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
        {authAvailable ? (
          <LoginForm />
        ) : (
          <p className="border-line text-muted mt-8 max-w-md rounded border bg-white p-4 text-sm leading-6">
            {siteCopy.login.authUnavailable}
          </p>
        )}
        <Link
          className="text-muted hover:text-ink mt-8 inline-flex rounded-sm text-sm underline underline-offset-4"
          href="/"
        >
          {siteCopy.login.back}
        </Link>
      </Section>
    </SiteShell>
  );
}
