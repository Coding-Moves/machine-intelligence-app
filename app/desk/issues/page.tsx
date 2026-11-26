import { PageHeading } from "@/components/page-heading";
import { PublicationEmailDeliveryForm } from "@/components/publication-email-delivery-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { requireEditor } from "@/lib/auth/require-editor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getPublicationEmailSettings,
  isPublicationEmailProviderConfigured,
} from "@/lib/magazine/publication-email-delivery";

type IssueEmailDeliveryRow = {
  edition_id: string;
  recipient: string;
  status: "pending" | "sending" | "sent" | "failed" | "unknown" | "skipped";
  last_error: string | null;
  sent_at: string | null;
};

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string }>;
}) {
  const { editor } = await requireEditor();
  const params = await searchParams;
  const admin = createSupabaseAdminClient();
  const [{ data: editions, error }, deliveryResult] = await Promise.all([
    admin
      .from("editions")
      .select("id, slug, title, status, created_at, published_at")
      .order("created_at", { ascending: false }),
    editor.role === "admin"
      ? admin
          .from("publication_email_deliveries")
          .select("edition_id, recipient, status, last_error, sent_at")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (error) throw new Error("Could not load editions: " + error.message);

  const settings =
    editor.role === "admin" ? await getPublicationEmailSettings() : null;
  const providerConfigured = isPublicationEmailProviderConfigured();
  const deliveries = new Map<string, IssueEmailDeliveryRow[]>();
  const deliveryRows = (deliveryResult.data ?? []) as IssueEmailDeliveryRow[];
  for (const delivery of deliveryRows) {
    const rows = deliveries.get(delivery.edition_id) ?? [];
    rows.push(delivery);
    deliveries.set(delivery.edition_id, rows);
  }
  const emailReady = Boolean(
    settings?.databaseReady &&
    settings.faculty_approved &&
    settings.recipient_consent_confirmed &&
    settings.recipients.length &&
    providerConfigured,
  );

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.issuesTitle}
        title={siteCopy.desk.issuesTitle}
        description={siteCopy.desk.issuesIntro}
      />
      {params.published === "1" ? (
        <p className="mt-5 border-l-2 border-[#28735a] bg-[#eef5ef] px-3 py-2 text-sm leading-6 text-[#245b45]">
          The issue was published. Its PDF is not sent automatically; an admin
          can send it after faculty approval of the exact issue and message.
        </p>
      ) : null}
      <div className="mt-10">
        {editions.length ? (
          <div className="divide-line border-line divide-y border-y">
            {editions.map((edition) => {
              const issueDeliveries = deliveries.get(edition.id) ?? [];
              const sentCount = issueDeliveries.filter(
                (delivery) => delivery.status === "sent",
              ).length;
              const skippedCount = issueDeliveries.filter(
                (delivery) => delivery.status === "skipped",
              ).length;
              const deliveryStatus = issueDeliveries.some(
                (delivery) => delivery.status === "unknown",
              )
                ? "unknown"
                : issueDeliveries.some(
                      (delivery) => delivery.status === "sending",
                    )
                  ? "sending"
                  : issueDeliveries.some(
                        (delivery) => delivery.status === "failed",
                      )
                    ? sentCount
                      ? "partial"
                      : "failed"
                    : issueDeliveries.some(
                          (delivery) => delivery.status === "pending",
                        )
                      ? "pending"
                      : skippedCount
                        ? sentCount
                          ? "sent"
                          : "skipped"
                        : issueDeliveries.length
                          ? "sent"
                          : null;
              const deliveryErrors = issueDeliveries
                .map((delivery) => delivery.last_error)
                .filter((message): message is string => Boolean(message));
              return (
                <article
                  key={edition.id}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <h2 className="font-serif text-2xl tracking-tight">
                      {edition.title}
                    </h2>
                    <p className="text-muted mt-1 text-xs">
                      {edition.slug} ·{" "}
                      {new Date(edition.created_at).toLocaleDateString("en", {
                        timeZone: "UTC",
                      })}
                    </p>
                    {edition.status === "published" &&
                    editor.role === "admin" ? (
                      <div className="mt-4 space-y-2">
                        {deliveryStatus ? (
                          <p className="text-muted text-xs leading-5">
                            Email status: {deliveryStatus} · {sentCount} of{" "}
                            {issueDeliveries.length} recipient emails sent
                            {skippedCount ? ` · ${skippedCount} skipped` : ""}
                          </p>
                        ) : (
                          <p className="text-muted text-xs leading-5">
                            The PDF is not emailed automatically. Faculty must
                            approve this exact issue before delivery.
                          </p>
                        )}
                        {deliveryErrors.map((message, index) => (
                          <p
                            key={index}
                            className="text-xs leading-5 text-[#704719]"
                          >
                            {message}
                          </p>
                        ))}
                        {!settings?.databaseReady ? (
                          <p className="text-xs leading-5 text-[#704719]">
                            Apply the publication email database migration to
                            enable delivery.
                          </p>
                        ) : emailReady || deliveryStatus ? (
                          <PublicationEmailDeliveryForm
                            editionId={edition.id}
                            status={deliveryStatus}
                            sentCount={sentCount}
                            totalCount={issueDeliveries.length}
                          />
                        ) : (
                          <p className="text-xs leading-5 text-[#704719]">
                            Confirm recipient consent, approve the saved email
                            settings, and configure the verified sender in
                            Vercel before sending.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className={
                      "inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium " +
                      (edition.status === "published"
                        ? "bg-[#e2eee7] text-[#245b45]"
                        : "bg-[#e8e9e4] text-[#4f5d55]")
                    }
                  >
                    {siteCopy.desk.editionStatus[edition.status]}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={siteCopy.desk.issueEmpty}
            description={siteCopy.desk.localOnly}
          />
        )}
      </div>
    </Section>
  );
}
