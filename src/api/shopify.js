/**
 * Publishes a product to Shopify using the Admin REST API (2024-01).
 *
 * NOTE: Direct browser → Shopify API calls require CORS to be enabled on
 * your Shopify store, which is not available for all setups. For production,
 * route these calls through your own backend server.
 *
 * For local testing, Shopify allows direct API calls from localhost if you use
 * a Custom App token (shpat_...) with the correct scopes:
 *   write_products, read_products, write_inventory
 */
export async function publishToShopify(domain, token, product) {
  const payload = {
    product: {
      title: product.seoTitle || product.name,
      body_html: `<p>${product.description}</p>`,
      vendor: product.brand || 'AI Poster',
      product_type: (product.category || '').split('>').pop().trim(),
      tags: (product.tags || []).join(','),
      variants: (product.variants || ['Default']).map(variant => ({
        title: variant,
        price: (product.price || '0').replace(/[^0-9.]/g, ''),
        inventory_quantity: Math.floor(
          parseInt(product.stock || '0') / Math.max((product.variants || []).length, 1)
        ),
        inventory_management: 'shopify',
        fulfillment_service: 'manual',
        requires_shipping: true,
        weight: parseFloat(product.weight || '0'),
        weight_unit: 'g'
      })),
      options: product.variants
        ? [{ name: 'Color', values: product.variants }]
        : [{ name: 'Title', values: ['Default Title'] }]
    }
  }

  const response = await fetch(`https://${domain}/admin/api/2024-01/products.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      typeof err.errors === 'string'
        ? err.errors
        : JSON.stringify(err.errors) || `Shopify HTTP ${response.status}`
    )
  }

  const data = await response.json()
  return {
    id: data.product?.id,
    handle: data.product?.handle,
    adminUrl: `https://${domain}/admin/products/${data.product?.id}`,
    storeUrl: `https://${domain}/products/${data.product?.handle}`
  }
}

/**
 * Tests Shopify credentials by fetching basic shop info.
 * Returns the shop name on success.
 */
export async function testShopifyConnection(domain, token) {
  const response = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Connection failed — HTTP ${response.status}. Check your domain and token.`)
  }

  const data = await response.json()
  return data.shop?.name || domain
}
