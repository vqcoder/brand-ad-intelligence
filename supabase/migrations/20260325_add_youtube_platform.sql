-- Add 'youtube' (and future platforms) to the creatives platform check constraint
ALTER TABLE creatives DROP CONSTRAINT IF EXISTS creatives_platform_check;
ALTER TABLE creatives ADD CONSTRAINT creatives_platform_check
  CHECK (platform IN (
    'meta','google','tiktok','youtube','linkedin',
    'tv','ooh','print','podcast','email'
  ));
