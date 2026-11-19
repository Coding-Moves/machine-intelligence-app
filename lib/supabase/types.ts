export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EditorRole = "admin" | "editor";
export type EditionStatus = "draft" | "published";
export type SourceRegion = "pakistan" | "global";
export type SourceKind = "news" | "official_blog" | "research" | "government";
export type StorySection = "pakistan" | "global" | "research" | "industry";
export type StoryStatus = "candidate" | "approved" | "rejected" | "published";
export type ImageLicense =
  "press_kit" | "wikimedia_cc" | "own" | "source_og_needs_review";

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          name: string;
          feed_url: string;
          homepage: string;
          region: SourceRegion;
          kind: SourceKind;
          trust_weight: number;
          trusted: boolean;
          fetch_full_text: boolean;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          feed_url: string;
          homepage: string;
          region: SourceRegion;
          kind: SourceKind;
          trust_weight?: number;
          trusted?: boolean;
          fetch_full_text?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          feed_url?: string;
          homepage?: string;
          region?: SourceRegion;
          kind?: SourceKind;
          trust_weight?: number;
          trusted?: boolean;
          fetch_full_text?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          id: string;
          headline: string;
          title_fingerprint: string;
          summary: string | null;
          key_facts: Json;
          section: StorySection | null;
          ai_importance: number | null;
          ai_pakistan_relevance: number | null;
          is_ai_related: boolean | null;
          final_score: number | null;
          status: StoryStatus;
          reject_reason: string | null;
          first_seen_at: string;
          last_updated_at: string;
          needs_reprocess: boolean;
          edition_id: string | null;
          verification: Json | null;
          embedding: string | null;
        };
        Insert: {
          id?: string;
          headline: string;
          title_fingerprint: string;
          summary?: string | null;
          key_facts?: Json;
          section?: StorySection | null;
          ai_importance?: number | null;
          ai_pakistan_relevance?: number | null;
          is_ai_related?: boolean | null;
          final_score?: number | null;
          status?: StoryStatus;
          reject_reason?: string | null;
          first_seen_at?: string;
          last_updated_at?: string;
          needs_reprocess?: boolean;
          edition_id?: string | null;
          verification?: Json | null;
          embedding?: string | null;
        };
        Update: {
          id?: string;
          headline?: string;
          title_fingerprint?: string;
          summary?: string | null;
          key_facts?: Json;
          section?: StorySection | null;
          ai_importance?: number | null;
          ai_pakistan_relevance?: number | null;
          is_ai_related?: boolean | null;
          final_score?: number | null;
          status?: StoryStatus;
          reject_reason?: string | null;
          first_seen_at?: string;
          last_updated_at?: string;
          needs_reprocess?: boolean;
          edition_id?: string | null;
          verification?: Json | null;
          embedding?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stories_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "editions";
            referencedColumns: ["id"];
          },
        ];
      };
      articles: {
        Row: {
          id: string;
          source_id: string;
          url: string;
          url_hash: string;
          title: string;
          published_at: string | null;
          fetched_at: string;
          content_text: string;
          content_origin: "rss" | "article_page" | "rss_fallback";
          og_image_url: string | null;
          story_id: string | null;
        };
        Insert: {
          id?: string;
          source_id: string;
          url: string;
          url_hash: string;
          title: string;
          published_at?: string | null;
          fetched_at?: string;
          content_text?: string;
          content_origin?: "rss" | "article_page" | "rss_fallback";
          og_image_url?: string | null;
          story_id?: string | null;
        };
        Update: {
          id?: string;
          source_id?: string;
          url?: string;
          url_hash?: string;
          title?: string;
          published_at?: string | null;
          fetched_at?: string;
          content_text?: string;
          content_origin?: "rss" | "article_page" | "rss_fallback";
          og_image_url?: string | null;
          story_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      images: {
        Row: {
          id: string;
          story_id: string | null;
          storage_path: string;
          credit: string;
          license: ImageLicense;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id?: string | null;
          storage_path: string;
          credit: string;
          license: ImageLicense;
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string | null;
          storage_path?: string;
          credit?: string;
          license?: ImageLicense;
          approved?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "images_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      editors: {
        Row: {
          email: string;
          name: string;
          role: EditorRole;
          created_at: string;
        };
        Insert: {
          email: string;
          name: string;
          role?: EditorRole;
          created_at?: string;
        };
        Update: {
          email?: string;
          name?: string;
          role?: EditorRole;
          created_at?: string;
        };
        Relationships: [];
      };
      editions: {
        Row: {
          id: string;
          slug: string;
          title: string;
          status: EditionStatus;
          window_start: string | null;
          layout: Json;
          tex_path: string | null;
          tex_hash: string | null;
          pdf_path: string | null;
          pdf_tex_hash: string | null;
          cover_path: string | null;
          in_this_issue: string[];
          editor_note: string | null;
          editor_note_approved: boolean;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          status?: EditionStatus;
          window_start?: string | null;
          layout?: Json;
          tex_path?: string | null;
          tex_hash?: string | null;
          pdf_path?: string | null;
          pdf_tex_hash?: string | null;
          cover_path?: string | null;
          in_this_issue?: string[];
          editor_note?: string | null;
          editor_note_approved?: boolean;
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          status?: EditionStatus;
          window_start?: string | null;
          layout?: Json;
          tex_path?: string | null;
          tex_hash?: string | null;
          pdf_path?: string | null;
          pdf_tex_hash?: string | null;
          cover_path?: string | null;
          in_this_issue?: string[];
          editor_note?: string | null;
          editor_note_approved?: boolean;
          created_at?: string;
          published_at?: string | null;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          id: string;
          kind: string;
          started_at: string;
          finished_at: string | null;
          ok: boolean | null;
          details: Json;
          new_articles: number;
          new_stories: number;
          errors: Json;
        };
        Insert: {
          id?: string;
          kind: string;
          started_at?: string;
          finished_at?: string | null;
          ok?: boolean | null;
          details?: Json;
          new_articles?: number;
          new_stories?: number;
          errors?: Json;
        };
        Update: {
          id?: string;
          kind?: string;
          started_at?: string;
          finished_at?: string | null;
          ok?: boolean | null;
          details?: Json;
          new_articles?: number;
          new_stories?: number;
          errors?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_editor: { Args: Record<PropertyKey, never>; Returns: boolean };
      publish_draft_edition: {
        Args: { p_edition_id: string };
        Returns: string;
      };
      store_ingested_article: {
        Args: {
          p_source_id: string;
          p_url: string;
          p_url_hash: string;
          p_title: string;
          p_published_at: string | null;
          p_content_text: string;
          p_content_origin: "rss" | "article_page" | "rss_fallback";
          p_og_image_url: string | null;
          p_matching_story_id: string | null;
          p_title_fingerprint: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
