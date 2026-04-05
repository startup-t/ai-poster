/**
 * listing.types.js
 * ─────────────────────────────────────────────────────────────────
 * Canonical schema for the AI Poster master listing object.
 *
 * One master listing is generated per product.
 * Platform-specific guidance is embedded inside platformGuidance[].
 * No separate per-platform listing is created.
 *
 * Field provenance labels
 *   "ai-generated"  → Claude wrote this from scratch
 *   "ai-inferred"   → Claude derived this from user input
 *   "user-provided" → copied verbatim from the seller's input
 * ─────────────────────────────────────────────────────────────────
 *
 * @typedef {Object} ListingFieldMeta
 * @property {'ai-generated'|'ai-inferred'|'user-provided'} source
 *
 * @typedef {Object} PlatformGuidance
 * @property {'shopify'|'shopee'|'lazada'|'tiktok'|'woocommerce'} platform
 * @property {string}   titleAdaptation     Short note on adapting the title
 * @property {string}   descriptionTip      Copy strategy for this platform
 * @property {string[]} priorityFields      Fields most important for this platform
 * @property {boolean}  ready               Whether the listing meets platform minimums
 * @property {string[]} missingForPlatform  Fields needed to reach "ready" on this platform
 *
 * @typedef {Object} MasterListing
 *
 * — Content fields —
 * @property {string}   productTitle        Ecommerce-ready title with natural keywords
 * @property {string}   shortDescription    20-50 words; mobile-first hook
 * @property {string}   fullDescription     150-400 words depending on product complexity
 * @property {string[]} bullets             Min 5, benefit-led, scannable
 * @property {Object}   specs               Key-value specification pairs
 * @property {string[]} tags                8-12 SEO-safe tags, no keyword stuffing
 * @property {string}   category            Canonical category path
 *
 * — Platform guidance —
 * @property {PlatformGuidance[]} platformGuidance  One entry per marketplace
 *
 * — Provenance —
 * @property {Object}   fieldSources        Maps each field name → provenance label
 * @property {string[]} missingFields       Fields the seller should add to improve score
 * @property {string}   originalInput       The seller's verbatim input, preserved
 *
 * — Scoring —
 * @property {number}   readiness           0-100 overall marketplace readiness score
 */

/**
 * Word-count targets by product type.
 * Used in the prompt and in the fallback generator.
 */
export const WORD_COUNT_TARGETS = {
  simple:      { min: 125, max: 150, label: 'Simple / apparel' },
  average:     { min: 150, max: 300, label: 'Average product' },
  complex:     { min: 300, max: 400, label: 'Complex / high-ticket' },
  shortDesc:   { min: 20,  max: 50,  label: 'Short description' },
  categoryDesc:{ min: 100, max: 300, label: 'Category description' },
}

/**
 * Platform strategy constants — referenced by the prompt and UI.
 */
export const PLATFORM_STRATEGY = {
  shopify: {
    name: 'Shopify',
    strategy: 'Brand + SEO keyword focus. Use structured storytelling. Longer-form descriptions work well for SEO.',
    titleStyle: 'Brand name first, then primary SEO keyword phrase.',
    maxTitleChars: 70,
  },
  shopee: {
    name: 'Shopee',
    strategy: 'Keyword-heavy titles and bullet-list friendly descriptions. Shoppers scan fast on mobile.',
    titleStyle: 'Lead with primary keyword, include model number and key feature.',
    maxTitleChars: 120,
  },
  lazada: {
    name: 'Lazada',
    strategy: 'Structured attributes and specification tables. Lazada search rewards complete spec data.',
    titleStyle: 'Keyword + key spec (e.g. colour, size, wattage) in the title.',
    maxTitleChars: 255,
  },
  tiktok: {
    name: 'TikTok Shop',
    strategy: 'Very short, benefit-led title. Description should be punchy and video-friendly.',
    titleStyle: 'Lead with the biggest benefit or hook phrase. Keep it under 60 characters.',
    maxTitleChars: 60,
  },
  woocommerce: {
    name: 'WooCommerce',
    strategy: 'SEO keyword focus throughout. Longer-form content helps organic ranking. Use H2/H3 structure.',
    titleStyle: 'Primary keyword near the start of the title for on-page SEO.',
    maxTitleChars: 60,
  },
}

/**
 * Minimum required fields for a listing to be considered "ready" per platform.
 */
export const PLATFORM_MINIMUMS = {
  shopify:    ['productTitle', 'fullDescription', 'specs', 'tags'],
  shopee:     ['productTitle', 'shortDescription', 'bullets', 'specs'],
  lazada:     ['productTitle', 'fullDescription', 'specs', 'bullets'],
  tiktok:     ['productTitle', 'shortDescription', 'bullets'],
  woocommerce:['productTitle', 'fullDescription', 'tags', 'specs'],
}
