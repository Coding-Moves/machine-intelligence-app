import type { Issue, Source, Story } from "@/lib/types";

const sources: Record<string, Source> = {
  moitt: {
    id: "moitt-ai-seekho",
    name: "Ministry of IT & Telecom",
    feedUrl: null,
    homepage:
      "https://www.moitt.gov.pk/NewsDetail/NjRhZWNhZGQtZGRkNC00MmJiLTk5YjctNmU0MTA0MjZhYTFi",
    region: "pakistan",
    kind: "government",
    trustWeight: 1.2,
    trusted: true,
    active: true,
  },
  pda: {
    id: "pda-islamabad-declaration",
    name: "Pakistan Digital Authority",
    feedUrl: null,
    homepage:
      "https://www.pda.gov.pk/press-details.php?id=islamabad-ai-declaration",
    region: "pakistan",
    kind: "government",
    trustWeight: 1.2,
    trusted: true,
    active: true,
  },
  deepseek: {
    id: "deepseek-v4",
    name: "DeepSeek API docs",
    feedUrl: null,
    homepage: "https://api-docs.deepseek.com/news/news260424/",
    region: "global",
    kind: "official_blog",
    trustWeight: 1.1,
    trusted: true,
    active: true,
  },
  tufts: {
    id: "tufts-robotics",
    name: "Tufts Now",
    feedUrl: null,
    homepage:
      "https://now.tufts.edu/2026/03/17/new-ai-models-could-slash-energy-use-while-dramatically-improving-performance",
    region: "global",
    kind: "research",
    trustWeight: 1.1,
    trusted: true,
    active: true,
  },
  ucsd: {
    id: "ucsd-converter",
    name: "UC San Diego Today",
    feedUrl: null,
    homepage:
      "https://today.ucsd.edu/story/new-chip-design-could-boost-efficiency-of-power-management-in-data-centers",
    region: "global",
    kind: "research",
    trustWeight: 1.1,
    trusted: true,
    active: true,
  },
};

const sampleStories: Story[] = [
  {
    id: "sample-ai-seekho",
    headline: "Pakistan announces AI Seekho 2026",
    summary:
      "Pakistan's Ministry of IT and Telecom announced a national programme introducing participants to app and game development with Google AI Studio and Antigravity. The Ministry described hands-on learning and hackathons, with a PKR 2.5 million prize pool.",
    keyFacts: [
      { label: "Prize pool", value: "PKR 2.5 million" },
      { label: "Announced", value: "April 15, 2026" },
    ],
    section: "pakistan",
    aiImportance: 7,
    pakistanRelevance: 10,
    finalScore: 8.8,
    status: "candidate",
    firstSeenAt: "2026-05-01T08:00:00.000Z",
    lastUpdatedAt: "2026-05-01T08:00:00.000Z",
    sources: [sources.moitt],
  },
  {
    id: "sample-islamabad-declaration",
    headline: "Pakistan adopts the Islamabad AI Declaration",
    summary:
      "Pakistan adopted the Islamabad AI Declaration on Sovereign, Responsible, and Capability-Driven AI at the Indus AI Summit. The declaration sets out nine principles and is intended to guide future governance work.",
    keyFacts: [
      { label: "Principles", value: "Nine" },
      { label: "Adopted", value: "February 9, 2026" },
    ],
    section: "pakistan",
    aiImportance: 8,
    pakistanRelevance: 10,
    finalScore: 8.6,
    status: "candidate",
    firstSeenAt: "2026-05-01T08:00:00.000Z",
    lastUpdatedAt: "2026-05-01T08:00:00.000Z",
    sources: [sources.pda],
  },
  {
    id: "sample-deepseek-v4",
    headline: "DeepSeek releases V4 preview models",
    summary:
      "DeepSeek's April 2026 release notes describe V4-Pro and V4-Flash preview models, each with a listed one-million-token context window. The release notes also give total and active parameter counts for both variants.",
    keyFacts: [
      { label: "Context window", value: "1 million tokens" },
      { label: "Variants", value: "V4-Pro and V4-Flash" },
    ],
    section: "global",
    aiImportance: 8,
    pakistanRelevance: 5,
    finalScore: 8.1,
    status: "candidate",
    firstSeenAt: "2026-05-01T08:00:00.000Z",
    lastUpdatedAt: "2026-05-01T08:00:00.000Z",
    sources: [sources.deepseek],
  },
  {
    id: "sample-tufts-robotics",
    headline: "A Tufts robotics study tests a neuro-symbolic system",
    summary:
      "Tufts researchers reported a proof-of-concept neuro-symbolic system for robotic tasks. Its reported results apply to the tasks tested and do not establish a general estimate for AI energy use.",
    keyFacts: [
      { label: "Work type", value: "Proof of concept" },
      { label: "Scope", value: "Robotic tasks tested in the study" },
    ],
    section: "research",
    aiImportance: 7,
    pakistanRelevance: 4,
    finalScore: 7.5,
    status: "candidate",
    firstSeenAt: "2026-05-01T08:00:00.000Z",
    lastUpdatedAt: "2026-05-01T08:00:00.000Z",
    sources: [sources.tufts],
  },
  {
    id: "sample-ucsd-converter",
    headline: "UC San Diego tests a piezoelectric power converter",
    summary:
      "A UC San Diego team reported a laboratory prototype that converts 48 volts to 4.8 volts. The team measured a peak efficiency of 96.2 percent; the result concerns power conversion and does not measure total data-centre energy use.",
    keyFacts: [
      { label: "Input and output", value: "48 V to 4.8 V" },
      { label: "Peak efficiency", value: "96.2 percent" },
    ],
    section: "industry",
    aiImportance: 6,
    pakistanRelevance: 4,
    finalScore: 6.9,
    status: "candidate",
    firstSeenAt: "2026-05-01T08:00:00.000Z",
    lastUpdatedAt: "2026-05-01T08:00:00.000Z",
    sources: [sources.ucsd],
  },
];

export const mockIssue: Issue = {
  id: "sample-may-2026",
  slug: "may-2026",
  title: "May 2026 — Design reference",
  date: "2026-05-01",
  inThisIssue: [
    "Pakistan: AI Seekho 2026 and the Islamabad AI Declaration",
    "Global: GPT-5.5, Claude Opus 4.7, and DeepSeek V4",
    "Research: neuro-symbolic robotics and tested task results",
    "Industry: physical AI robotics and the open-weight race",
  ],
  stories: sampleStories,
  pdfUrl: null,
  coverUrl: null,
  isMock: true,
};
