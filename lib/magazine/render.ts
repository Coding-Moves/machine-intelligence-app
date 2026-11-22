import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { escapeTex } from "./escape.ts";
import type { MagazineTemplate } from "./template.ts";
import type { IssuePlan, PlanStory } from "./plan.ts";
import { sortPlanItems } from "./layout.ts";

export type RenderStory = PlanStory & {
  sources: { name: string; url: string; publishedAt: string | null }[];
  imagePath?: string;
};

const themeColors = {
  ocean: { accent: "0052A5", ink: "14263D", muted: "64748B", paper: "F5F8FC" },
  forest: { accent: "28735A", ink: "18372B", muted: "63766B", paper: "F5F8F5" },
  mono: { accent: "343A40", ink: "202428", muted: "697077", paper: "F7F7F6" },
} as const;

function renderParagraphs(value: string) {
  return value
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => escapeTex(paragraph.replace(/\s*\n\s*/g, " ")))
    .filter(Boolean)
    .join("\n\n\\par\n\n");
}

function safeHref(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.username = "";
    url.password = "";
    return url.toString().replace(/([%#&])/g, "\\$1");
  } catch {
    return null;
  }
}

function renderCover(
  template: MagazineTemplate,
  issueTitle: string,
  inThisIssue: string[],
) {
  const color = themeColors[template.theme];
  const issueList = inThisIssue.length
    ? `\\begin{itemize}\n${inThisIssue.map((headline) => `\\item ${escapeTex(headline)}`).join("\n")}\n\\end{itemize}`
    : "\\emph{Stories approved for this issue will appear here.}";

  return [
    "\\thispagestyle{empty}",
    `\\pagecolor[HTML]{${color.paper}}`,
    "\\begin{center}",
    "\\vspace*{1.2cm}",
    `{\\color[HTML]{${color.accent}}\\large\\bfseries NFC IET MULTAN \\textbar\\ AI DEPARTMENT}\\par`,
    "\\vspace{1.8cm}",
    `{\\color[HTML]{${color.ink}}\\Huge\\bfseries ${escapeTex(template.publicationName)}\\par}`,
    "\\vspace{0.5cm}",
    `{\\color[HTML]{${color.accent}}\\Large ${escapeTex(template.coverSubtitle)}\\par}`,
    "\\vspace{0.4cm}",
    `{\\color[HTML]{${color.muted}}\\large\\itshape ${escapeTex(template.coverTagline)}\\par}`,
    "\\vspace{1cm}",
    `{\\color[HTML]{${color.ink}}\\Large ${escapeTex(issueTitle)}\\par}`,
    "\\vspace{0.8cm}",
    `\\colorbox[HTML]{FFFFFF}{\\begin{minipage}{0.82\\linewidth}\\vspace{0.3cm}{\\color[HTML]{${color.accent}}\\large\\bfseries IN THIS ISSUE}\\par\\vspace{0.15cm}${issueList}\\vspace{0.15cm}\\end{minipage}}`,
    "\\vfill",
    `\\textbf{Student editors:} ${template.editors.map(escapeTex).join(" \\textbar\\ ")}\\par`,
    "\\vspace{1.2cm}",
    "\\end{center}",
    "\\clearpage",
    "\\nopagecolor",
  ].join("\n");
}

function renderBackCover(
  title: string,
  template: MagazineTemplate,
  theme: keyof typeof themeColors,
) {
  const color = themeColors[theme];
  const note = template.backCoverNote
    ? renderParagraphs(template.backCoverNote)
    : "";
  return [
    "\\clearpage",
    "\\thispagestyle{empty}",
    `\\pagecolor[HTML]{${color.paper}}`,
    "\\vspace*{\\fill}",
    "\\begin{center}",
    `{\\color[HTML]{${color.accent}}\\Huge\\bfseries ${escapeTex(template.publicationName)}\\par}`,
    "\\vspace{0.6cm}",
    `{\\color[HTML]{${color.ink}}\\Large ${escapeTex(title)}\\par}`,
    "\\vspace{1.2cm}",
    note,
    "\\vspace{1.2cm}",
    `{\\color[HTML]{${color.accent}}\\large\\bfseries Academic supervision\\par}`,
    `\\textbf{${escapeTex(template.supervisorName)}}\\par`,
    `${escapeTex(template.supervisorTitle)}\\par`,
    "\\vspace{0.8cm}",
    `{\\color[HTML]{${color.accent}}\\large\\bfseries Student editors\\par}`,
    template.editors.map(escapeTex).join(" \\textbar\\ "),
    "\\end{center}",
    "\\vspace*{\\fill}",
    "\\nopagecolor",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderEditorNote(
  note: string,
  approved: boolean,
  template: MagazineTemplate,
) {
  const state = approved
    ? "\\textit{Reviewed by an editor}"
    : "\\textcolor{red}{\\textbf{DRAFT -- NOT REVIEWED}}";
  const body = note.trim()
    ? renderParagraphs(note)
    : "The editorial note has not been drafted yet.";
  return [
    "\\section*{Editor's note}",
    state,
    "\\vspace{0.4em}",
    body,
    "\\vspace{0.6em}",
    `\\begin{flushright}\\small Under the academic supervision of\\\\\\textbf{${escapeTex(template.supervisorName)}}\\\\${escapeTex(template.supervisorTitle)}\\end{flushright}`,
    "\\clearpage",
  ].join("\n");
}

function renderStory(story: RenderStory, presentation: string) {
  const titleSize = presentation === "feature" ? "\\Large" : "\\large";
  const summary = renderParagraphs(story.summary);
  const facts = story.keyFacts.slice(0, 4);
  const factBlock = facts.length
    ? `\\begin{quote}\\small\\textbf{Key details}\\begin{itemize}${facts
        .map(
          (fact) =>
            `\\item \\textbf{${escapeTex(fact.label)}:} ${escapeTex(fact.value)}`,
        )
        .join("")}\\end{itemize}\\end{quote}`
    : "";
  const references = story.sources
    .map((source) => {
      const href = safeHref(source.url);
      if (!href) return "";
      const date = source.publishedAt
        ? new Date(source.publishedAt).toLocaleDateString("en", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })
        : "Source";
      return `\\href{${href}}{${escapeTex(source.name)}, ${escapeTex(date)}}`;
    })
    .filter(Boolean)
    .join("\\quad\\textbar\\quad ");
  const style = presentation === "brief" ? "\\small " : "";
  const imagePath =
    story.imagePath &&
    /^images\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/i.test(
      story.imagePath,
    )
      ? story.imagePath
      : null;
  const image = imagePath
    ? `\\begin{center}\\includegraphics[width=0.85\\linewidth,height=${presentation === "feature" ? "5.2cm" : "3.2cm"},keepaspectratio]{${imagePath}}\\par\\footnotesize AI-generated editorial illustration\\end{center}`
    : "";
  return [
    `\\subsection*{${titleSize} ${escapeTex(story.headline)}}`,
    image,
    `${style}${summary}`,
    factBlock,
    references
      ? `\\par\\smallskip{\\footnotesize\\color{muted}Sources: ${references}}`
      : "",
    "\\medskip\\hrule\\medskip",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function renderMagazineTex(input: {
  title: string;
  template: MagazineTemplate;
  plan: IssuePlan;
  stories: RenderStory[];
  editorNote: string;
  editorNoteApproved: boolean;
}) {
  const templateFile = await readFile(
    join(process.cwd(), "latex/templates/issue.tex"),
    "utf8",
  );
  const storyById = new Map(input.stories.map((story) => [story.id, story]));
  const headlineById = new Map(
    input.stories.map((story) => [story.id, story.headline]),
  );
  const orderedIds = sortPlanItems(
    input.plan.items,
    input.template.sections,
  ).map((item) => item.storyId);
  const inThisIssue = orderedIds
    .map((id) => headlineById.get(id))
    .filter((value): value is string => Boolean(value));
  const sections = input.template.sections
    .map((section) => {
      const items = input.plan.items
        .filter((item) => item.section === section.id)
        .sort((left, right) => left.order - right.order);
      if (!items.length) return "";
      const overLimit = items.length > section.slots;
      const label = `${escapeTex(section.label)}${overLimit ? " -- APPROVED STORIES OVER SLOT TARGET" : ""}`;
      const renderedItems = items
        .map((item) => {
          const story = storyById.get(item.storyId);
          return story ? renderStory(story, item.presentation) : "";
        })
        .filter(Boolean)
        .join("\n");
      return `\\section*{${label}}\n${renderedItems}`;
    })
    .filter(Boolean)
    .join("\n\\clearpage\n");
  const colors = themeColors[input.template.theme];
  const document = [
    `\\hypersetup{pdftitle={${escapeTex(input.title)}},pdfauthor={${escapeTex(input.template.supervisorName)}}}`,
    renderCover(input.template, input.title, inThisIssue),
    renderEditorNote(
      input.editorNote,
      input.editorNoteApproved,
      input.template,
    ),
    sections || "\\emph{No stories have been approved for this issue yet.}",
    renderBackCover(input.title, input.template, input.template.theme),
  ].join("\n\n");
  return templateFile
    .replace(
      "{{COLORS}}",
      [
        `\\definecolor{accent}{HTML}{${colors.accent}}`,
        `\\definecolor{ink}{HTML}{${colors.ink}}`,
        `\\definecolor{muted}{HTML}{${colors.muted}}`,
      ].join("\n"),
    )
    .replace("{{DOCUMENT}}", document);
}
