import { AddEditorForm, RemoveEditorForm } from "@/components/editor-management";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { requireAdmin } from "@/lib/auth/require-editor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = "bom1";

export default async function EditorsPage() {
  const { user } = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: editors, error } = await admin
    .from("editors")
    .select("email, name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Could not load the editor list: " + error.message);
  }

  const currentEmail = user.email?.toLowerCase();

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.editorsTitle}
        title={siteCopy.desk.editorsTitle}
        description={siteCopy.desk.editorsIntro}
      />
      <div className="mt-8">
        <AddEditorForm />
      </div>
      {editors.length ? (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {editors.map((editor) => (
            <article
              key={editor.email}
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="font-medium text-ink">{editor.name}</h2>
                <p className="mt-1 text-sm text-muted">{editor.email}</p>
                <p className="mt-1 text-xs text-muted">
                  {editor.role === "admin"
                    ? siteCopy.desk.roleAdmin
                    : siteCopy.desk.roleEditor}
                </p>
              </div>
              <RemoveEditorForm
                email={editor.email}
                disabled={editor.email.toLowerCase() === currentEmail}
              />
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">{siteCopy.desk.noEditors}</p>
      )}
    </Section>
  );
}
