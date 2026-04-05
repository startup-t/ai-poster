/**
 * parser.js
 * ─────────────────────────────────────────────────────────────────
 * Parses free-text product input + provides a demo fallback listing
 * that matches the updated MasterListing schema.
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Parses free-text key:value product input into a structured object.
 * The original text is preserved as `raw` — it is included verbatim
 * in the AI prompt and echoed back in listing.originalInput.
 */
export function parseProduct(text) {
  const obj = { raw: text }

  for (const line of text.split('\n')) {
    const match = line.match(/^([^:]+):\s*(.+)$/)
    if (!match) continue
    const key   = match[1].toLowerCase().trim()
    const value = match[2].trim()

    if (key.includes('product') || key.includes('name')) obj.name = value
    else if (key.includes('price'))       obj.price   = value
    else if (key.includes('stock'))       obj.stock   = value
    else if (key.includes('variant'))     obj.variants = value.split(',').map(s => s.trim())
    else if (key.includes('weight'))      obj.weight  = value
    else if (key.includes('image'))       obj.images  = value.split(',').map(s => s.trim())
    else if (key.includes('brand'))       obj.brand   = value
    else if (key.includes('sku'))         obj.sku     = value
    else if (key.includes('description')) obj.description = value
    else if (key.includes('dimension'))   obj.dimensions = value
    else if (key.includes('material'))    obj.material = value
    else if (key.includes('colour') || key.includes('color')) obj.colour = value
  }

  return obj
}

// ─── Helpers ────────────────────────────────────────────────────

function randSku() {
  return 'AI-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

function inferCategory(name = '') {
  const w = name.toLowerCase()
  if (['headphone', 'earphone', 'speaker', 'audio', 'earbuds'].some(k => w.includes(k)))
    return 'Electronics > Audio > Headphones & Earphones'
  if (['phone', 'tablet', 'laptop', 'computer', 'watch', 'camera'].some(k => w.includes(k)))
    return 'Electronics > Devices'
  if (['shirt', 'pants', 'shoes', 'bag', 'dress', 'jacket', 'tshirt', 't-shirt'].some(k => w.includes(k)))
    return 'Fashion & Apparel'
  if (['chair', 'desk', 'table', 'sofa', 'shelf', 'bed'].some(k => w.includes(k)))
    return 'Home & Living > Furniture'
  if (['serum', 'cream', 'lotion', 'skincare', 'sunscreen', 'mask'].some(k => w.includes(k)))
    return 'Health & Beauty > Skincare'
  return 'General Merchandise'
}

function wordCount(text = '') {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ─── Platform guidance fallback ─────────────────────────────────

function buildPlatformGuidance(product, listing) {
  const hasVariants     = !!(product.variants?.length)
  const hasSpecs        = Object.keys(listing.specs).length > 3
  const hasShortDesc    = wordCount(listing.shortDescription) >= 20
  const hasFullDesc     = wordCount(listing.fullDescription)  >= 100

  return [
    {
      platform: 'shopify',
      titleAdaptation: 'Lead with the brand name (if available) followed by the primary SEO keyword phrase.',
      descriptionTip: 'Use structured storytelling — open with the problem the product solves, then describe the solution. Longer descriptions (150–300 words) help Shopify SEO.',
      priorityFields: ['productTitle', 'fullDescription', 'tags'],
      ready: hasFullDesc && listing.tags.length >= 5,
      missingForPlatform: [
        !hasFullDesc      && 'Full description (150+ words)',
        !product.brand    && 'Brand name',
        listing.tags.length < 5 && 'More SEO tags',
      ].filter(Boolean),
    },
    {
      platform: 'shopee',
      titleAdaptation: 'Lead with the primary search keyword, then model name, then key feature. Shopee titles up to 120 characters.',
      descriptionTip: 'Shopee shoppers scan fast on mobile. Use short bullet points and repeat key search terms naturally across the first 3 lines.',
      priorityFields: ['productTitle', 'shortDescription', 'bullets', 'specs'],
      ready: hasShortDesc && listing.bullets.length >= 3,
      missingForPlatform: [
        !hasShortDesc && 'Short description (mobile hook)',
        listing.bullets.length < 3 && 'More bullet points',
      ].filter(Boolean),
    },
    {
      platform: 'lazada',
      titleAdaptation: 'Include the key specification in the title (e.g. colour, size, wattage). Lazada allows up to 255 characters.',
      descriptionTip: 'Lazada search rewards complete spec tables. Fill in every spec field you can. Use a feature-then-spec format in descriptions.',
      priorityFields: ['productTitle', 'fullDescription', 'specs'],
      ready: hasSpecs && hasFullDesc,
      missingForPlatform: [
        !hasSpecs    && 'More specifications (Lazada is spec-driven)',
        !hasFullDesc && 'Full description',
        !hasVariants && 'Variant/colour attributes',
      ].filter(Boolean),
    },
    {
      platform: 'tiktok',
      titleAdaptation: 'Keep the title under 60 characters — lead with the single biggest benefit or hook phrase.',
      descriptionTip: 'TikTok Shop buyers discover via video. The description should be punchy, emoji-friendly, and reinforce what a viewer just watched.',
      priorityFields: ['productTitle', 'shortDescription', 'bullets'],
      ready: hasShortDesc,
      missingForPlatform: [
        !hasShortDesc && 'Short description (video-friendly hook)',
      ].filter(Boolean),
    },
    {
      platform: 'woocommerce',
      titleAdaptation: 'Place the primary SEO keyword near the start of the title for on-page SEO signals.',
      descriptionTip: 'Longer-form content (300–400 words) helps WooCommerce rank organically. Use H2/H3 heading structure where possible and include the primary keyword once per section.',
      priorityFields: ['productTitle', 'fullDescription', 'tags', 'specs'],
      ready: hasFullDesc && listing.tags.length >= 6,
      missingForPlatform: [
        !hasFullDesc           && 'Full description (300+ words preferred for SEO)',
        listing.tags.length < 6 && 'More SEO tags',
      ].filter(Boolean),
    },
  ]
}

// ─── Main fallback listing ───────────────────────────────────────

/**
 * Generates a template-based MasterListing when no API key is available.
 * Mirrors the full schema returned by generateListingWithClaude().
 */
export function fallbackListing(product) {
  const name     = product.name     || 'Product'
  const brand    = product.brand    ? `${product.brand} ` : ''
  const variants = Array.isArray(product.variants)
    ? product.variants
    : product.variants ? [product.variants] : []
  const variantStr  = variants.join(', ')
  const category    = inferCategory(name)
  const primaryKw   = name.toLowerCase()
  const words       = name.split(' ').filter(w => w.length > 3).map(w => w.toLowerCase())

  // ── Titles ──────────────────────────────────────────────────
  const productTitle = [
    brand,
    name,
    variants.length ? `— ${variants[0]}${variants.length > 1 ? ' & More' : ''}` : '',
    '| Free Shipping Philippines',
  ].filter(Boolean).join(' ').trim().slice(0, 120)

  // ── Short description (20–50 words) ─────────────────────────
  const shortDescription =
    `Get the ${name}${brand ? ` by ${product.brand}` : ''} and experience quality that lasts. ` +
    (variants.length ? `Available in ${variantStr}. ` : '') +
    `Order now and enjoy fast local shipping across the Philippines.`

  // ── Full description (150–300 words for average product) ────
  const fullDescription = [
    `Introducing the ${name} — built for everyday performance and designed to last.` +
    (brand ? ` Proudly brought to you by ${product.brand}.` : ''),

    `Whether you're using it at home, at work, or on the go, the ${name} delivers consistent results you can count on. ` +
    (product.weight ? `At just ${product.weight}, it's easy to carry anywhere.` : 'Compact and practical for any lifestyle.') +
    (variants.length ? ` Choose from ${variantStr} to match your personal style.` : ''),

    `Quality is built into every detail. From the materials used to the care taken in production, ` +
    `this product is made to meet the demands of real everyday use. ` +
    `It's the kind of reliable performance that beginner and experienced buyers alike can appreciate.`,

    `Order the ${name} today and enjoy free shipping, easy returns, and seller warranty support. ` +
    `Stock is limited — add to cart now to secure yours.`,
  ].join('\n\n')

  // ── Bullets (min 5, benefit-first) ─────────────────────────
  const bullets = [
    `Reliable everyday performance — built to handle real-world use without compromise`,
    product.weight
      ? `Lightweight at ${product.weight} — comfortable to carry and use all day`
      : `Ergonomic and practical design — feels natural in daily use`,
    variants.length
      ? `Available in ${variants.length} colour option${variants.length > 1 ? 's' : ''} — ${variantStr} — to suit your style`
      : `Versatile design — works across a wide range of everyday scenarios`,
    `Seller warranty included — shop with confidence and full peace of mind`,
    `Fast shipping across the Philippines — receive your order quickly at your door`,
    product.brand
      ? `Genuine ${product.brand} product — authenticity guaranteed`
      : `Quality-checked before dispatch — every unit inspected before shipping`,
  ]

  // ── Specs ────────────────────────────────────────────────────
  const specs = {
    ...(product.brand     && { Brand:    product.brand }),
    ...(variants.length   && { Variants: variantStr }),
    ...(product.weight    && { Weight:   product.weight }),
    ...(product.dimensions && { Dimensions: product.dimensions }),
    ...(product.material  && { Material: product.material }),
    SKU:       product.sku   || randSku(),
    Stock:     product.stock || '—',
    Condition: 'Brand New',
    Warranty:  'Seller Warranty',
    Origin:    '(as labeled)',
  }

  // ── Tags ─────────────────────────────────────────────────────
  const tags = [
    ...words.slice(0, 4),
    'free shipping',
    'philippines',
    'quality',
    'bestseller',
    ...(product.brand ? [product.brand.toLowerCase()] : []),
    ...(variants.length ? ['multiple colours'] : []),
  ].filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 12)

  // ── Missing fields ───────────────────────────────────────────
  const missingFields = [
    !product.brand       && 'Brand name',
    !product.description && 'Seller product description',
    (!product.images || !product.images.length) && 'Product images',
    !product.sku         && 'SKU / product code',
    !product.dimensions  && 'Product dimensions',
  ].filter(Boolean)

  // ── Readiness ────────────────────────────────────────────────
  let readiness = 50
  if (product.price)   readiness += 10
  if (product.stock)   readiness += 8
  if (variants.length) readiness += 8
  if (product.weight)  readiness += 6
  if (product.brand)   readiness += 6
  if (product.sku)     readiness += 6
  if (product.images?.length) readiness += 6

  // ── Field sources ─────────────────────────────────────────────
  const fieldSources = {
    productTitle:     'ai-generated',
    shortDescription: 'ai-generated',
    fullDescription:  'ai-generated',
    bullets:          'ai-generated',
    specs:            'ai-inferred',
    tags:             'ai-generated',
    category:         'ai-inferred',
  }

  const listing = {
    // New schema
    productTitle,
    shortDescription,
    fullDescription,
    bullets,
    specs,
    tags,
    category,
    fieldSources,
    missingFields,
    originalInput: product.raw || '',
    readiness,

    // Backwards-compatible aliases
    seoTitle:    productTitle,
    description: shortDescription,
  }

  listing.platformGuidance = buildPlatformGuidance(product, listing)

  return listing
}
