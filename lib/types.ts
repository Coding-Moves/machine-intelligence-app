import type { MagazineSectionId } from "@/config/magazine";

export type Section = MagazineSectionId;
export type StoryStatus = "candidate" | "approved" | "rejected" | "published";
export type SourceKind = "news" | "official_blog" | "research" | "government";
export type SourceRegion = "pakistan" | "global";

export interface Source {
  id: string;
  name: string;
  feedUrl: string;
  homepage: string;
  region: SourceRegion;
  kind: SourceKind;
  trustWeight: number;
  active: boolean;
}

export interface KeyFact {
  label: string;
  value: string;
  sourceArticleId?: string;
}

export interface Story {
  id: string;
  headline: string;
  summary: string;
  keyFacts: KeyFact[];
  section: Section;
  aiImportance: number;
  pakistanRelevance: number;
  finalScore: number;
  status: StoryStatus;
  rejectReason?: string;
  firstSeenAt: string;
  lastUpdatedAt: string;
  sources: Source[];
}

export interface Edition {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  windowStart: string;
  layout: Record<string, unknown>;
  texPath: string | null;
  pdfPath: string | null;
  coverPath: string | null;
  inThisIssue: string[];
  editorNote: string | null;
  editorNoteApproved: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export interface Issue {
  id: string;
  slug: string;
  title: string;
  date: string;
  inThisIssue: string[];
  stories: Story[];
  pdfUrl: string | null;
  coverUrl: string | null;
  isMock: boolean;
}
