import { setImageApproval } from "@/app/desk/actions";
import Image from "next/image";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { requireEditor } from "@/lib/auth/require-editor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { siteCopy } from "@/content/site";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  await requireEditor();
  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("images")
    .select("id, story_id, storage_path, credit, approved, created_at")
    .eq("license", "own")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not load magazine illustrations.");

  const storyIds = [
    ...new Set(
      (rows ?? [])
        .map((image) => image.story_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const { data: stories, error: storyError } = storyIds.length
    ? await admin
        .from("stories")
        .select("id, headline, status")
        .in("id", storyIds)
    : { data: [], error: null };
  if (storyError) throw new Error("Could not load illustration story details.");
  const storyById = new Map((stories ?? []).map((story) => [story.id, story]));

  const { data: signedImages, error: signedImagesError } = rows?.length
    ? await admin.storage
        .from("drafts")
        .createSignedUrls(
          rows.map((image) => image.storage_path),
          3600,
        )
    : { data: [], error: null };
  if (signedImagesError) throw new Error("Could not sign illustration previews.");
  const imageByPath = new Map(
    (rows ?? []).map((image) => [image.storage_path, image]),
  );
  const visible = (signedImages ?? []).flatMap((signed) => {
    if (!signed.path || !signed.signedUrl || signed.error) return [];
    const image = imageByPath.get(signed.path);
    return image ? [{ ...image, url: signed.signedUrl }] : [];
  });

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.imagesTitle}
        title={siteCopy.desk.imagesTitle}
        description="Gemini creates original editorial illustrations for AI stories. Review each one before it is placed in the magazine; unapproved images stay out of the PDF."
      />
      <p className="text-muted mt-4 max-w-3xl text-sm leading-6">
        The ingest job generates up to two illustrations per run for the
        highest-priority AI stories that do not have one yet. Generated art is
        an illustration, not a documentary photo. Publisher preview images are
        not copied because a trusted news source does not automatically grant
        reuse rights.
      </p>
      <div className="mt-10">
        {!visible.length ? (
          <EmptyState
            title="No generated illustrations yet"
            description="The next scheduled ingest run will create illustrations for eligible AI stories. They will appear here for editorial review."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {visible.map((image) => {
              const story = image.story_id
                ? storyById.get(image.story_id)
                : null;
              return (
                <article
                  key={image.id}
                  className="border-line overflow-hidden rounded-xl border bg-white"
                >
                  <Image
                    src={image.url}
                    alt={
                      story
                        ? `AI-generated illustration for ${story.headline}`
                        : "AI-generated editorial illustration"
                    }
                    width={960}
                    height={540}
                    unoptimized
                    className="bg-paper aspect-video w-full object-cover"
                  />
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold tracking-wide uppercase">
                        {image.approved ? "Approved for issue" : "Needs review"}
                      </span>
                      <span className="text-muted text-xs">
                        {new Date(image.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="font-serif text-xl leading-tight">
                      {story?.headline ?? "Story no longer available"}
                    </h2>
                    <p className="text-muted text-xs">{image.credit}</p>
                    {story ? (
                      <p className="text-muted text-xs">
                        Story status: {story.status}
                      </p>
                    ) : null}
                    <form action={setImageApproval}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <input
                        type="hidden"
                        name="approved"
                        value={image.approved ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        variant={image.approved ? "secondary" : "primary"}
                        className="min-h-10 px-4 text-xs"
                      >
                        {image.approved
                          ? "Remove from issue"
                          : "Approve illustration"}
                      </Button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}
