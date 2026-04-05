/**
 * claude.js
 * ─────────────────────────────────────────────────────────────────
 * Calls the Anthropic API to generate a master product listing.
 *
 * Output schema: MasterListing (see src/utils/listing.types.js)
 *   — One master listing, not separate per-platform listings.
 *   — Platform-specific guidance embedded in platformGuidance[].
 *   — Every field labelled ai-generated, ai-inferred, or user-provided.
 * ─────────────────────────────────────────────────────────────────
 */

import { PLATFORM_STRATEGY } from '../utils/listing.types.js'

const SYSTEM_PROMPT = `
You are an expert e-commerce copywriter and SEO specialist for Philippine online sellers.
Your job is to create a single master product listing plus platform guidance for five marketplaces.

NON-NEGOTIABLE RULES — violating any of these is not allowed:
1. Never invent certifications, awards, or regulatory claims (e.g. FDA, CE, ISO) unless the seller provides them.
2. Never invent medical, legal, safety, or compliance claims.
3. Preserve every piece of original user input verbatim in originalInput.
4. Clearly label every field: "ai-generated", "ai-inferred", or "user-provided".
   - ai-generated  = you wrote this content from scratch
   - ai-inferred   = you logically derived it from the input (e.g. category from product name)
   - user-provided = copied directly from what the seller typed
5. Keep keyword usage natural. Do not stuff keywords. One to two uses of the primary keyword per paragraph maximum.
6. Write for beginner sellers and mobile shoppers — plain language, short sentences, scannable.

CONTENT RULES:

Product title:
  - Strong e-commerce-ready title with natural primary keywords
  - Include brand name if provided; do not invent a brand
  - No fake urgency or excessive punctuation

Short description (shortDescription):
  - 20 to 50 words
  - Mobile-first hook — the one reason a buyer should click
  - One or two short sentences only

Full description (fullDescription):
  - Simple products/apparel: 125 to 150 words
  - Average products: 150 to 300 words
  - Complex/high-ticket items: 300 to 400 words
  - Lead with the biggest benefit, not a spec list
  - Maximum 3 to 4 sentences per paragraph
  - Include primary keyword naturally once per paragraph
  - End with a soft call-to-action
  - Do NOT copy the bullet points into the description

Bullet points (bullets):
  - Minimum 5 bullets, maximum 8
  - Format each as: "Benefit — supporting detail"
  - Benefit first, then the supporting feature
  - Each bullet under 20 words
  - No two bullets should repeat the same core idea

Specifications (specs):
  - Key-value pairs from user input or reasonably inferred
  - Include weight, dimensions, colour/variants, condition, warranty, stock where available
  - Do NOT invent technical specs that cannot be reasonably derived

Tags (tags):
  - 8 to 12 tags
  - Mix of: primary keyword, category terms, use-case terms, audience terms
  - No duplicate ideas across tags
  - No hashtag symbols

Platform guidance (platformGuidance):
  Generate exactly five platform objects, one per marketplace:
  - shopify:     Brand + SEO keyword; structured storytelling; longer descriptions help SEO
  - shopee:      Keyword-heavy title; bullet-list friendly; mobile shoppers scan fast
  - lazada:      Structured attributes; specification tables; complete spec data boosts search
  - tiktok:      Very short benefit title (max 60 chars); punchy, video-friendly description
  - woocommerce: SEO keyword focus throughout; longer-form content; H2/H3 structure recommended

RETURN FORMAT — return ONLY this JSON object, no markdown, no backticks, no extra text:
{
  "productTitle":      "string",
  "shortDescription":  "string (20-50 words)",
  "fullDescription":   "string (125-400 words depending on complexity)",
  "bullets":           ["string", "string", "string", "string", "string"],
  "specs":             { "key": "value" },
  "tags":              ["string"],
  "category":          "string",
  "platformGuidance":  [
    {
      "platform": "shopify",
      "titleAdaptation": "string — one sentence on adapting the title",
      "descriptionTip": "string — one to two sentences of copy strategy",
      "priorityFields": ["productTitle", "fullDescription", "tags"],
      "ready": true,
      "missingForPlatform": []
    },
    { "platform": "shopee", "titleAdaptation": "...", "descriptionTip": "...", "priorityFields": [...], "ready": true, "missingForPlatform": [] },
    { "platform": "lazada", "titleAdaptation": "...", "descriptionTip": "...", "priorityFields": [...], "ready": true, "missingForPlatform": [] },
    { "platform": "tiktok", "titleAdaptation": "...", "descriptionTip": "...", "priorityFields": [...], "ready": true, "missingForPlatform": [] },
    { "platform": "woocommerce", "titleAdaptation": "...", "descriptionTip": "...", "priorityFields": [...], "ready": true, "missingForPlatform": [] }
  ],
  "fieldSources": {
    "productTitle":     "ai-generated",
    "shortDescription": "ai-generated",
    "fullDescription":  "ai-generated",
    "bullets":          "ai-generated",
    "specs":            "ai-inferred",
    "tags":             "ai-generated",
    "category":         "ai-inferred"
  },
  "missingFields":  ["string"],
  "originalInput":  "string — verbatim seller input",
  "readiness":      75
}
`.trim()

function buildUserPrompt(product) {
  const variantsStr = product.variants
    ? (Array.isArray(product.variants) ? product.variants.join(', ') : product.variants)
    : '(not provided)'
  const imagesStr = product.images
    ? (Array.isArray(product.images) ? product.images.join(', ') : product.images)
    : '(none)'

  const lines = [
    `Product name:  ${product.name || '(not provided)'}`,
    `Price:         ${product.price || '(not provided)'}`,
    `Stock:         ${product.stock || '(not provided)'}`,
    `Variants:      ${variantsStr}`,
    `Weight:        ${product.weight || '(not provided)'}`,
    `Brand:         ${product.brand || '(not provided)'}`,
    `SKU:           ${product.sku || '(not provided)'}`,
    `Images:        ${imagesStr}`,
    product.description ? `Seller description: ${product.description}` : null,
    product.raw ? `\nOriginal input (preserve verbatim in originalInput field):\n${product.raw}` : null,
  ].filter(Boolean).join('\n')

  return `Generate a master product listing for the following product.\n\n${lines}`
}

function parseClaudeResponse(rawText) {
  const clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  const listing = JSON.parse(clean)

  // Ensure all five platforms are present
  const PLATFORMS = ['shopify', 'shopee', 'lazada', 'tiktok', 'woocommerce']
  const existing = new Set((listing.platformGuidance || []).map(p => p.platform))
  PLATFORMS.forEach(platform => {
    if (!existing.has(platform)) {
      listing.platformGuidance = listing.platformGuidance || []
      listing.platformGuidance.push({
        platform,
        titleAdaptation: `Adapt the title for ${platform}.`,
        descriptionTip: '',
        priorityFields: ['productTitle', 'fullDescription', 'specs'],
        ready: false,
        missingForPlatform: ['Platform guidance not generated'],
      })
    }
  })

  listing.platformGuidance.sort(
    (a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform)
  )

  // Backwards-compatible aliases so existing UI code doesn't break
  listing.seoTitle      = listing.productTitle  || listing.seoTitle
  listing.description   = listing.shortDescription || listing.description
  listing.bullets       = listing.bullets       || []
  listing.tags          = listing.tags          || []
  listing.specs         = listing.specs         || {}
  listing.missingFields = listing.missingFields || []
  listing.fieldSources  = listing.fieldSources  || {}
  listing.readiness     = typeof listing.readiness === 'number' ? listing.readiness : 70

  return listing
}

/**
 * Calls claude-sonnet-4-20250514 and returns a MasterListing object.
 * @param {Object} product  - Parsed product from parser.js
 * @param {string} apiKey   - Anthropic API key (sk-ant-...)
 * @returns {Promise<MasterListing>}
 */
export async function generateListingWithClaude(product, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(product) }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Anthropic API error ${response.status}`)
  }

  const data = await response.json()
  const rawText = data.content.map(c => c.text || '').join('')

  try {
    return parseClaudeResponse(rawText)
  } catch (parseErr) {
    throw new Error(`Claude returned invalid JSON: ${rawText.slice(0, 300)}`)
  }
}
