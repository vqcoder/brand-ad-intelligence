/**
 * ScrapeCreators API base URL.
 * All route files must import from here — never hardcode this string.
 */
export const SC_BASE_URL = 'https://api.scrapecreators.com'

export type ScoringDimension = {
  key: string
  label: string
  weight: number
  guidance: string
}

export const SCORING_CONFIG: Record<string, {
  dimensions: ScoringDimension[]
}> = {
  meta: {
    dimensions: [
      { key: 'hook',       label: 'Hook',        weight: 0.20,
        guidance: 'Does it grab attention on first glance or in the first 3 seconds?' },
      { key: 'brand_fit',  label: 'Brand Fit',   weight: 0.20,
        guidance: 'Does it feel unmistakably like this brand?' },
      { key: 'audience',   label: 'Audience',     weight: 0.20,
        guidance: 'Does it speak directly to the right customer?' },
      { key: 'message',    label: 'Message',      weight: 0.15,
        guidance: 'Is the core message or CTA clear?' },
      { key: 'format_fit', label: 'Format Fit',   weight: 0.15,
        guidance: 'Is it optimised for Feed/Reel/Story format?' },
      { key: 'production', label: 'Production',   weight: 0.10,
        guidance: 'Is the visual quality at brand standard?' },
    ],
  },
  tiktok: {
    dimensions: [
      { key: 'hook',       label: 'Hook',        weight: 0.30,
        guidance: 'Does it stop the scroll in the first 1-2 seconds? Would you keep watching?' },
      { key: 'brand_fit',  label: 'Brand Fit',   weight: 0.15,
        guidance: 'Does it feel authentic to the brand without being too polished?' },
      { key: 'audience',   label: 'Audience',     weight: 0.20,
        guidance: 'Does it match the TikTok audience — tone, language, cultural references?' },
      { key: 'message',    label: 'Message',      weight: 0.15,
        guidance: 'Is the message clear without needing sound?' },
      { key: 'format_fit', label: 'Format Fit',   weight: 0.10,
        guidance: 'Does it feel native to TikTok — pacing, aspect ratio, style?' },
      { key: 'production', label: 'Production',   weight: 0.10,
        guidance: 'Raw/authentic often wins — is the production level appropriate?' },
    ],
  },
  youtube: {
    dimensions: [
      { key: 'hook',       label: 'Hook',        weight: 0.25,
        guidance: 'Would you watch past the 5-second skip point? What earns the view?' },
      { key: 'brand_fit',  label: 'Brand Fit',   weight: 0.20,
        guidance: 'Does it build brand identity over the full duration?' },
      { key: 'audience',   label: 'Audience',     weight: 0.20,
        guidance: 'Is it relevant to the audience watching this type of content?' },
      { key: 'message',    label: 'Message',      weight: 0.15,
        guidance: 'Is the key message delivered before someone would skip?' },
      { key: 'format_fit', label: 'Format Fit',   weight: 0.10,
        guidance: 'Pre-roll vs mid-roll vs brand film — is the length and pacing right?' },
      { key: 'production', label: 'Production',   weight: 0.10,
        guidance: 'YouTube viewers expect higher production — does it meet that bar?' },
    ],
  },
  google: {
    dimensions: [
      { key: 'hook',       label: 'Headline',    weight: 0.30,
        guidance: 'Is the headline compelling and keyword-relevant?' },
      { key: 'brand_fit',  label: 'Brand Fit',   weight: 0.15,
        guidance: 'Does the copy sound like the brand?' },
      { key: 'audience',   label: 'Relevance',   weight: 0.25,
        guidance: 'Does it match the search intent of the target audience?' },
      { key: 'message',    label: 'CTA',         weight: 0.20,
        guidance: 'Is the call to action clear and compelling?' },
      { key: 'format_fit', label: 'Ad Copy',     weight: 0.10,
        guidance: 'Is the description copy effective within character limits?' },
      { key: 'production', label: 'N/A',         weight: 0.00,
        guidance: 'Not applicable for text ads' },
    ],
  },
}

/** Default fallback for unknown platforms */
export const DEFAULT_SCORING = SCORING_CONFIG.meta
