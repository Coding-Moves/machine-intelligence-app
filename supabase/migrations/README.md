# Supabase migrations

Add ordered SQL migrations in this directory and apply them with the Supabase CLI. Keep schema changes reproducible; do not edit a deployed database by hand.

The current publication workflow depends on migrations `202611190002_reprocess_updated_stories.sql`, `202611190003_trusted_source_allowlist.sql`, and `202611190004_guarded_edition_publish.sql`. Apply all three before enabling twice-daily ingest and the publish controls.
