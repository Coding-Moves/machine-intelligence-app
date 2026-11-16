export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EditorRole = "admin" | "editor";
export type EditionStatus = "draft" | "published";

export interface Database {
  public: {
    Tables: {
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
          pdf_path: string | null;
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
          pdf_path?: string | null;
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
          pdf_path?: string | null;
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
        };
        Insert: {
          id?: string;
          kind: string;
          started_at?: string;
          finished_at?: string | null;
          ok?: boolean | null;
          details?: Json;
        };
        Update: {
          id?: string;
          kind?: string;
          started_at?: string;
          finished_at?: string | null;
          ok?: boolean | null;
          details?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_editor: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
