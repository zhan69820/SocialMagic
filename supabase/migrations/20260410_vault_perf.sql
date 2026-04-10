-- =============================================================================
-- SocialMagic — Vault Performance Indexes
-- Date: 2026-04-10
-- Description: Composite indexes for common vault query patterns
-- =============================================================================

-- Vault listing: all posts for a user, newest first
CREATE INDEX IF NOT EXISTS idx_posts_profile_created
  ON public.social_posts (profile_id, created_at DESC);

-- Content lookup by profile for access control checks
CREATE INDEX IF NOT EXISTS idx_contents_profile_created
  ON public.contents (profile_id, created_at DESC);
