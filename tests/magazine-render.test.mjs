import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import test from "node:test";
import { escapeTex } from "../lib/magazine/escape.ts";
import { renderMagazineTex } from "../lib/magazine/render.ts";

function createSmokePng() {
  function chunk(type, data) {
    const typeBytes = Buffer.from(type);
    const content = Buffer.concat([typeBytes, data]);
    let crc = 0xffffffff;
    for (const byte of content) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    const result = Buffer.alloc(12 + data.length);
    result.writeUInt32BE(data.length, 0);
    content.copy(result, 4);
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
    return result;
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from([0, 24, 96, 140, 255]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("LaTeX text escaping protects TeX syntax and control characters", () => {
  assert.equal(
    escapeTex("A&B 50% $x_1$ #tag {draft} ~ ^ \\input{secret}\u0001"),
    "A\\&B 50\\% \\$x\\_1\\$ \\#tag \\{draft\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}input\\{secret\\}",
  );
});

test("magazine renderer escapes hostile story text and keeps notes clearly labeled", async () => {
  const storyId = "11111111-1111-4111-8111-111111111111";
  const briefStoryId = "22222222-2222-4222-8222-222222222222";
  const tex = await renderMagazineTex({
    title: "Test issue: AI & 50%",
    template: {
      publicationName: "Machine Intelligence",
      coverSubtitle: "Research & reporting",
      coverTagline: "A safe {draft}",
      backCoverNote: "A student publication from NFC IET Multan.",
      supervisorName: "Dr. Example",
      supervisorTitle: "Head of Department",
      editors: ["Student Editor"],
      theme: "ocean",
      sections: [
        { id: "pakistan", label: "Pakistan", slots: 1 },
        { id: "global", label: "Global", slots: 4 },
        { id: "research", label: "Research", slots: 3 },
        { id: "industry", label: "Industry", slots: 4 },
      ],
    },
    plan: {
      items: [
        { storyId, section: "pakistan", order: 1, presentation: "feature" },
        {
          storyId: briefStoryId,
          section: "pakistan",
          order: 2,
          presentation: "brief",
        },
      ],
      editorNote: "",
      provider: "fallback",
      warning: null,
    },
    stories: [
      {
        id: storyId,
        headline: "AI & 50% \\input{secret}",
        summary:
          "The report says 50% and includes {editor} text with $values_1$.",
        section: "pakistan",
        imagePath: `images/${storyId}.png`,
        finalScore: 8,
        keyFacts: [{ label: "Result", value: "50% & tested" }],
        sources: [
          {
            name: "Example Source",
            url: "https://example.test/story?a=1&b=2",
            publishedAt: null,
          },
        ],
      },
      {
        id: briefStoryId,
        headline: "A second eligible story",
        summary:
          "This story is rendered as a brief because the section target is one.",
        section: "pakistan",
        imagePath: "../../secret.tex",
        finalScore: 5,
        keyFacts: [],
        sources: [],
      },
    ],
    editorNote: "A draft note for the editors to review before publication.",
    editorNoteApproved: false,
  });

  assert.match(tex, /DRAFT -- NOT REVIEWED/);
  assert.match(tex, /Machine Intelligence/);
  assert.match(tex, /Academic supervision/);
  assert.match(tex, /Dr\. Example/);
  assert.match(
    tex,
    new RegExp(`\\\\includegraphics\\[[^\\]]+\\]\\{images/${storyId}\\.png\\}`),
  );
  assert.doesNotMatch(tex, /secret\.tex/);
  assert.match(tex, /STORIES BEYOND SECTION TARGET/);
  assert.doesNotMatch(tex, /APPROVED STORIES/);
  assert.match(tex, /A second eligible story/);
  assert.match(tex, /\\small This story is rendered as a brief/);
  assert.match(tex, /AI \\& 50\\% \\textbackslash\{\}input/);
  assert.doesNotMatch(tex, /\\input\{secret\}/);
  assert.match(tex, /50\\% \\& tested/);
  if (process.env.WRITE_LATEX_SMOKE === "1") {
    await writeFile("latex/generated-render-smoke.tex", tex, "utf8");
    await mkdir("latex/images", { recursive: true });
    await writeFile(`latex/images/${storyId}.png`, createSmokePng());
  }
});
