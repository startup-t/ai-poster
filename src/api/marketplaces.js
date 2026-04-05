/**
 * Simulated marketplace publishers for TikTok Shop, Lazada, and Shopee.
 *
 * These marketplaces require OAuth 2.0 server-side flows that cannot be
 * completed directly from the browser. In a production app you would:
 *   1. Redirect the user through the marketplace's OAuth flow on your backend
 *   2. Store the access token server-side
 *   3. Make signed API calls from your server
 *
 * The simulate functions below mimic the publish pipeline with realistic
 * steps and occasional failures (10% error rate) for demo purposes.
 * Replace each simulate* function with a real backend API call.
 */

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function randomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

/**
 * Simulates TikTok Shop product creation via the TikTok Open API.
 * Real endpoint: POST https://open-api.tiktokglobalshop.com/product/202309/products
 */
export async function simulateTikTokPublish(credentials, product, onStep) {
  const steps = [
    'Authenticating with TikTok Open API…',
    'Building TikTok product schema…',
    'Uploading product images…',
    'Calling createProduct endpoint…',
    'Setting price and stock…'
  ]

  for (const step of steps) {
    onStep(step)
    await delay(600)
  }

  if (Math.random() < 0.1) throw new Error('Rate limit exceeded — retry in 60 seconds')

  return { id: `TT-${randomId()}`, platform: 'TikTok Shop' }
}

/**
 * Simulates Lazada product creation via the Lazada Open Platform API.
 * Real endpoint: POST https://api.lazada.com/rest/product/create
 */
export async function simulateLazadaPublish(credentials, product, onStep) {
  const steps = [
    'Authenticating with Lazada Open Platform…',
    'Mapping to Lazada category tree…',
    'Validating product attributes…',
    'Calling CreateProduct API…',
    'Setting SKU and inventory…'
  ]

  for (const step of steps) {
    onStep(step)
    await delay(600)
  }

  if (Math.random() < 0.1) throw new Error('Category mapping failed — check product category')

  return { id: `LZ-${randomId()}`, platform: 'Lazada' }
}

/**
 * Simulates Shopee product creation via the Shopee Open Platform API.
 * Real endpoint: POST https://partner.shopeemobile.com/api/v2/product/add_item
 */
export async function simulateShopeePublish(credentials, product, onStep) {
  const steps = [
    'Authenticating with Shopee Open Platform…',
    'Fetching category attributes…',
    'Mapping logistics channels…',
    'Calling add_item API…',
    'Setting tier variations…'
  ]

  for (const step of steps) {
    onStep(step)
    await delay(600)
  }

  if (Math.random() < 0.1) throw new Error('Shop not authorized — re-connect your Shopee account')

  return { id: `SP-${randomId()}`, platform: 'Shopee' }
}
