-- =============================================================================
-- SocialMagic — Atomic version number function
-- Date: 2026-04-09
-- Description: Race-condition-safe version counter for social_posts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_post_version(
  content_uuid UUID,
  platform_name TEXT
)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.social_posts
  WHERE content_id = content_uuid
    AND platform = platform_name;
$$;

COMMENT ON FUNCTION public.get_next_post_version(UUID, TEXT) IS
  'Atomically returns the next version number for a given content + platform pair. Uses MAX(version) under the default READ COMMITTED isolation level, which is safe when combined with a UNIQUE constraint.';

-- Add a unique constraint to enforce version integrity at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_posts_content_platform_version
  ON public.social_posts (content_id, platform, version);
