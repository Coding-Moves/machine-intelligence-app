import { z } from "zod";
import { magazine } from "@/config/magazine";
import type { Json, StorySection } from "@/lib/supabase/types";

const sectionIds = ["pakistan", "global", "research", "industry"] as const;

export const magazineTemplateSchema = z
  .object({
    publicationName: z.string().trim().min(2).max(100),
    coverSubtitle: z.string().trim().min(1).max(180),
    coverTagline: z.string().trim().max(180),
    backCoverNote: z.string().trim().max(500),
    supervisorName: z.string().trim().min(2).max(100),
    supervisorTitle: z.string().trim().min(2).max(100),
    editors: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
    theme: z.enum(["ocean", "forest", "mono"]),
    sections: z
      .array(
        z.object({
          id: z.enum(sectionIds),
          label: z.string().trim().min(2).max(40),
          slots: z.number().int().min(0).max(12),
        }),
      )
      .length(4),
  })
  .superRefine((template, context) => {
    const ids = template.sections.map((section) => section.id);
    if (new Set(ids).size !== sectionIds.length) {
      context.addIssue({
        code: "custom",
        message: "Each magazine section must appear exactly once.",
      });
    }
    if (
      new Set(template.editors.map((name) => name.toLocaleLowerCase())).size !==
      template.editors.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Editor names must be unique.",
      });
    }
  });

export type MagazineTemplate = z.infer<typeof magazineTemplateSchema>;

export const defaultMagazineTemplate: MagazineTemplate = {
  publicationName: magazine.name,
  coverSubtitle:
    "A fortnightly look at AI progress in Pakistan and around the world",
  coverTagline: "Research, reporting, and ideas shaping intelligent systems",
  backCoverNote:
    "An independent student magazine from the Department of Artificial Intelligence, NFC IET Multan.",
  supervisorName: magazine.supervisor.name,
  supervisorTitle: magazine.supervisor.title,
  editors: [...magazine.editors],
  theme: "ocean",
  sections: magazine.sections.map((section) => ({ ...section })),
};

export function readMagazineTemplate(layout: Json): MagazineTemplate {
  if (layout && typeof layout === "object" && !Array.isArray(layout)) {
    const template = (layout as Record<string, Json | undefined>).template;
    const parsed = magazineTemplateSchema.safeParse(template);
    if (parsed.success) return parsed.data;
  }
  return defaultMagazineTemplate;
}

export function toJsonTemplate(template: MagazineTemplate): Json {
  return JSON.parse(JSON.stringify(template)) as Json;
}

export function isStorySection(value: unknown): value is StorySection {
  return (
    typeof value === "string" && sectionIds.includes(value as StorySection)
  );
}
