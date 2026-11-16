import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function IssuesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: editions, error } = await supabase
    .from("editions")
    .select("id, slug, title, status, created_at, published_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Could not load editions: " + error.message);
  }

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.issuesTitle}
        title={siteCopy.desk.issuesTitle}
        description={siteCopy.desk.issuesIntro}
      />
      <div className="mt-10">
        {editions.length ? (
          <div className="divide-y divide-line border-y border-line">
            {editions.map((edition) => (
              <article
                key={edition.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="font-serif text-2xl tracking-tight">
                    {edition.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {edition.slug} ·{" "}
                    {new Date(edition.created_at).toLocaleDateString("en", { timeZone: "UTC" })}
                  </p>
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
            ))}
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
