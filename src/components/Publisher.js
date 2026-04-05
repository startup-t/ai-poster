import { publishToShopify, testShopifyConnection } from '../api/shopify.js'
import { simulateTikTokPublish, simulateLazadaPublish, simulateShopeePublish } from '../api/marketplaces.js'

const CHANNELS = {
  shopify: { name: 'Shopify', abbr: 'SH', color: '#96bf48', live: true },
  tiktok: { name: 'TikTok Shop', abbr: 'TT', color: '#010101', live: false },
  lazada: { name: 'Lazada', abbr: 'LZ', color: '#F57224', live: false },
  shopee: { name: 'Shopee', abbr: 'SP', color: '#EE4D2D', live: false }
}

export class Publisher {
  constructor(container, { onConnectedStoresChange } = {}) {
    this.container = container
    this.onConnectedStoresChange = onConnectedStoresChange
    this.connected = {}
    this.publishResults = {}
    this.publishing = false
    this.stats = { published: 0, failed: 0, total: 0 }
    this.currentProduct = null
    this.currentListing = null
    this.render()
  }

  setProduct(product, listing) {
    this.currentProduct = product
    this.currentListing = listing
    this.renderProductPreview()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-wrap" style="padding:16px;display:flex;flex-direction:column;gap:14px">

        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="stat-card"><div class="stat-label">Connected</div><div class="stat-val" id="pubStatConn">0</div></div>
          <div class="stat-card"><div class="stat-label">Published</div><div class="stat-val" id="pubStatPub">0</div></div>
          <div class="stat-card"><div class="stat-label">Failed</div><div class="stat-val" id="pubStatFail">0</div></div>
          <div class="stat-card"><div class="stat-label">Total</div><div class="stat-val" id="pubStatTotal">0</div></div>
        </div>

        <div>
          <div class="section-label">Channel connections</div>
          <div class="channels-grid" id="channelsGrid"></div>
        </div>

        <div class="sep"></div>

        <div>
          <div class="section-label">Product to publish</div>
          <div class="product-preview-card" id="productPreview">
            <div style="font-size:12px;color:var(--color-text-tertiary);padding:12px">
              No product loaded — generate a listing first, then type <strong>go</strong> in the chat.
            </div>
          </div>
        </div>

        <div>
          <div class="section-label">Publish to channels</div>
          <div class="publish-panel">
            <div class="publish-panel-head">
              <div style="display:flex;align-items:center;gap:8px;flex:1">
                <input type="checkbox" id="selectAll" onchange="window.aiPosterApp?.publisher?.toggleAll(this.checked)">
                <label for="selectAll" style="font-size:12px;color:var(--color-text-secondary);cursor:pointer">Select all connected</label>
                <div id="chSelects" style="display:flex;gap:8px;flex-wrap:wrap;margin-left:8px"></div>
              </div>
              <button class="btn btn-sm btn-success" id="pubBtn" onclick="window.aiPosterApp?.publisher?.publishAll()" disabled>
                Publish now
              </button>
            </div>
            <div class="publish-rows" id="publishRows">
              <div style="font-size:12px;color:var(--color-text-tertiary);padding:10px">
                Connect at least one channel above, then publish.
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="section-label">Activity log</div>
          <div class="activity-log" id="activityLog">
            <div class="log-entry"><span class="log-ts">${this.ts()}</span><span class="log-info">Publisher ready.</span></div>
          </div>
        </div>

      </div>`

    this.renderChannelCards()
  }

  ts() { return new Date().toLocaleTimeString('en-GB', { hour12: false }) }
  rand() { return Math.random().toString(36).slice(2, 8).toUpperCase() }
  delay(ms) { return new Promise(r => setTimeout(r, ms)) }

  log(msg, type = 'info') {
    const log = document.getElementById('activityLog')
    const d = document.createElement('div')
    d.className = 'log-entry'
    d.innerHTML = `<span class="log-ts">${this.ts()}</span><span class="log-${type}">${msg}</span>`
    log.appendChild(d)
    log.scrollTop = log.scrollHeight
  }

  renderChannelCards() {
    const grid = document.getElementById('channelsGrid')
    if (!grid) return
    grid.innerHTML = Object.entries(CHANNELS).map(([id, ch]) => `
      <div class="channel-card ${this.connected[id] ? 'ch-connected' : ''}" id="chCard-${id}">
        <div class="ch-head">
          <div class="ch-icon" style="background:${ch.color};color:white">${ch.abbr}</div>
          <div class="ch-name">${ch.name}</div>
          <span class="badge ${this.connected[id] ? 'badge-ok' : 'badge-idle'}" id="chBadge-${id}">
            ${this.connected[id] ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <div class="ch-body">
          <div class="ch-field">
            <label>${id === 'shopify' ? 'Store domain' : id === 'shopee' ? 'Partner ID' : 'App key'}</label>
            <input type="text" id="chDomain-${id}"
              placeholder="${id === 'shopify' ? 'yourstore.myshopify.com' : id === 'tiktok' ? 'App key from developer portal' : id === 'lazada' ? 'App key from Open Platform' : 'Partner ID from Open Platform'}"
              value="${import.meta.env[`VITE_${id.toUpperCase()}_DOMAIN`] || ''}"
              oninput="document.getElementById('chBtn-${id}').disabled=!(this.value.trim()&&document.getElementById('chToken-${id}').value.trim())">
          </div>
          <div class="ch-field">
            <label>${id === 'shopify' ? 'Admin API access token' : 'Access token'}</label>
            <input type="password" id="chToken-${id}"
              placeholder="${id === 'shopify' ? 'shpat_…' : 'Access token…'}"
              value="${import.meta.env[`VITE_${id.toUpperCase()}_TOKEN`] || ''}"
              oninput="document.getElementById('chBtn-${id}').disabled=!(this.value.trim()&&document.getElementById('chDomain-${id}').value.trim())">
          </div>
          <div style="display:flex;gap:5px;margin-top:2px">
            <button class="btn btn-xs btn-primary" id="chBtn-${id}" disabled
              onclick="window.aiPosterApp?.publisher?.connectChannel('${id}')">Connect</button>
            <button class="btn btn-xs btn-danger" id="chDisc-${id}" style="display:none"
              onclick="window.aiPosterApp?.publisher?.disconnectChannel('${id}')">Disconnect</button>
            ${ch.live
              ? `<span class="badge badge-ok" id="chLive-${id}" style="display:none">Live API</span>`
              : `<span class="badge badge-warn" id="chLive-${id}" style="display:none">Simulated</span>`}
          </div>
        </div>
      </div>`).join('')
  }

  async connectChannel(id) {
    const domain = document.getElementById(`chDomain-${id}`).value.trim()
    const token = document.getElementById(`chToken-${id}`).value.trim()
    const btn = document.getElementById(`chBtn-${id}`)
    btn.textContent = 'Connecting…'; btn.disabled = true
    this.log(`Connecting to ${CHANNELS[id].name}…`)

    try {
      if (id === 'shopify') {
        const shopName = await testShopifyConnection(domain, token)
        this.connected[id] = { domain, token, shopName, live: true }
        this.log(`Connected to Shopify: ${shopName}`, 'ok')
      } else {
        await this.delay(800)
        this.connected[id] = { domain, token, live: false }
        this.log(`${CHANNELS[id].name} connected (simulated)`, 'warn')
      }
      this.setChannelConnected(id, true)
    } catch (err) {
      this.log(`${CHANNELS[id].name} error: ${err.message}`, 'err')
      btn.textContent = 'Connect'; btn.disabled = false
    }

    this.updateStats()
    this.renderChannelSelects()
    this.renderPublishRows()
    this.onConnectedStoresChange?.(Object.entries(this.connected).map(([id]) => CHANNELS[id].name))
  }

  disconnectChannel(id) {
    delete this.connected[id]
    this.setChannelConnected(id, false)
    this.log(`${CHANNELS[id].name} disconnected`)
    this.updateStats()
    this.renderChannelSelects()
    this.renderPublishRows()
    this.onConnectedStoresChange?.(Object.entries(this.connected).map(([id]) => CHANNELS[id].name))
  }

  setChannelConnected(id, isConn) {
    document.getElementById(`chCard-${id}`)?.classList.toggle('ch-connected', isConn)
    const badge = document.getElementById(`chBadge-${id}`)
    if (badge) { badge.textContent = isConn ? 'Connected' : 'Not connected'; badge.className = `badge ${isConn ? 'badge-ok' : 'badge-idle'}` }
    const btn = document.getElementById(`chBtn-${id}`)
    if (btn) { btn.style.display = isConn ? 'none' : ''; btn.textContent = 'Connect'; btn.disabled = false }
    const disc = document.getElementById(`chDisc-${id}`)
    if (disc) disc.style.display = isConn ? '' : 'none'
    const live = document.getElementById(`chLive-${id}`)
    if (live) live.style.display = isConn ? '' : 'none'
  }

  updateStats() {
    document.getElementById('pubStatConn').textContent = Object.keys(this.connected).length
    document.getElementById('pubStatPub').textContent = this.stats.published
    document.getElementById('pubStatFail').textContent = this.stats.failed
    document.getElementById('pubStatTotal').textContent = this.stats.total
  }

  renderChannelSelects() {
    const sel = document.getElementById('chSelects')
    if (!sel) return
    sel.innerHTML = Object.keys(this.connected).map(id => `
      <div style="display:flex;align-items:center;gap:4px">
        <input type="checkbox" id="sel-${id}" checked onchange="window.aiPosterApp?.publisher?.updatePublishBtn()">
        <label for="sel-${id}" style="font-size:11px;color:var(--color-text-secondary);cursor:pointer">${CHANNELS[id].name}</label>
      </div>`).join('')
    this.updatePublishBtn()
  }

  toggleAll(checked) {
    Object.keys(this.connected).forEach(id => {
      const cb = document.getElementById(`sel-${id}`)
      if (cb) cb.checked = checked
    })
    this.updatePublishBtn()
  }

  getSelected() {
    return Object.keys(this.connected).filter(id => document.getElementById(`sel-${id}`)?.checked)
  }

  updatePublishBtn() {
    const btn = document.getElementById('pubBtn')
    if (btn) btn.disabled = this.publishing || this.getSelected().length === 0
  }

  renderProductPreview() {
    const el = document.getElementById('productPreview')
    if (!el) return
    if (!this.currentProduct) return
    const p = this.currentProduct
    const l = this.currentListing || {}
    el.innerHTML = `
      <div class="product-preview-head">
        <span style="font-size:12px;font-weight:500;color:var(--color-text-primary)">${l.seoTitle || p.name || 'Unnamed product'}</span>
      </div>
      <div class="product-preview-body">
        <div class="pf"><div class="pf-key">Price</div><div class="pf-val">${p.price || '—'}</div></div>
        <div class="pf"><div class="pf-key">Stock</div><div class="pf-val">${p.stock || '—'}</div></div>
        <div class="pf"><div class="pf-key">Variants</div><div class="pf-val">${p.variants?.join(', ') || '—'}</div></div>
        <div class="pf"><div class="pf-key">Weight</div><div class="pf-val">${p.weight || '—'}</div></div>
        <div class="pf" style="grid-column:1/-1"><div class="pf-key">Category</div><div class="pf-val">${l.category || '—'}</div></div>
      </div>`
  }

  renderPublishRows() {
    const rows = document.getElementById('publishRows')
    if (!rows) return
    if (Object.keys(this.connected).length === 0) {
      rows.innerHTML = `<div style="font-size:12px;color:var(--color-text-tertiary);padding:10px">Connect at least one channel above, then publish.</div>`
      return
    }
    rows.innerHTML = Object.keys(this.connected).map(id => {
      const r = this.publishResults[id]
      let rowClass = '', status = '<span style="font-size:11px;color:var(--color-text-tertiary)">Ready</span>'
      if (r?.state === 'publishing') { rowClass = 'pub-row-publishing'; status = `<div class="spinner"></div><span style="font-size:11px;color:#854d0e">${r.step || 'Publishing…'}</span>` }
      else if (r?.state === 'done') { rowClass = 'pub-row-done'; status = `<span style="font-size:11px;color:#15803d;font-weight:500">Published</span><span class="pub-id">#${r.id}</span>${r.adminUrl ? `<a href="${r.adminUrl}" target="_blank" class="pub-link">View</a>` : ''}` }
      else if (r?.state === 'error') { rowClass = 'pub-row-error'; status = `<span style="font-size:11px;color:#991b1b">${r.error}</span>` }
      return `<div class="pub-row ${rowClass}" id="pubrow-${id}">
        <div class="ch-icon" style="background:${CHANNELS[id].color};color:white;width:22px;height:22px;border-radius:5px;font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${CHANNELS[id].abbr}</div>
        <div class="pub-ch-name">${CHANNELS[id].name}${this.connected[id]?.shopName ? ` — ${this.connected[id].shopName}` : ''}</div>
        <div class="pub-status">${status}</div>
      </div>`
    }).join('')
    this.updatePublishBtn()
  }

  updatePubRow(id) {
    const row = document.getElementById(`pubrow-${id}`)
    if (!row) return
    const r = this.publishResults[id]
    let rowClass = '', status = '<span style="font-size:11px;color:var(--color-text-tertiary)">Ready</span>'
    if (r?.state === 'publishing') { rowClass = 'pub-row-publishing'; status = `<div class="spinner"></div><span style="font-size:11px;color:#854d0e">${r.step || 'Publishing…'}</span>` }
    else if (r?.state === 'done') { rowClass = 'pub-row-done'; status = `<span style="font-size:11px;color:#15803d;font-weight:500">Published</span><span class="pub-id">#${r.id}</span>${r.adminUrl ? `<a href="${r.adminUrl}" target="_blank" class="pub-link">View</a>` : ''}` }
    else if (r?.state === 'error') { rowClass = 'pub-row-error'; status = `<span style="font-size:11px;color:#991b1b">${r.error}</span>` }
    row.className = `pub-row ${rowClass}`
    row.querySelector('.pub-status').innerHTML = status
  }

  async publishAll() {
    const selected = this.getSelected()
    if (!selected.length || !this.currentProduct) return
    this.publishing = true
    const btn = document.getElementById('pubBtn')
    if (btn) { btn.disabled = true; btn.textContent = 'Publishing…' }
    this.log(`Publishing to ${selected.length} channel(s)…`)

    for (const id of selected) {
      this.publishResults[id] = { state: 'publishing', step: 'Preparing payload…' }
      this.updatePubRow(id)
      await this.delay(300)
      await this.publishToChannel(id)
    }

    const done = selected.filter(id => this.publishResults[id]?.state === 'done').length
    const fail = selected.filter(id => this.publishResults[id]?.state === 'error').length
    this.stats.published += done; this.stats.failed += fail; this.stats.total += done
    this.publishing = false
    this.updateStats()
    if (btn) { btn.disabled = false; btn.textContent = 'Publish now' }
    this.updatePublishBtn()
    this.log(`Complete — ${done} published, ${fail} failed`, done > 0 ? 'ok' : 'err')
  }

  async publishToChannel(id) {
    const cred = this.connected[id]
    const product = { ...this.currentProduct, ...(this.currentListing || {}) }

    try {
      if (id === 'shopify' && cred.live) {
        const setStep = step => { this.publishResults[id].step = step; this.updatePubRow(id) }
        const steps = ['Building payload…', 'Uploading to Shopify…', 'Creating product…', 'Setting inventory…', 'Finalising…']
        for (const s of steps) { setStep(s); await this.delay(500) }
        const result = await publishToShopify(cred.domain, cred.token, product)
        this.publishResults[id] = { state: 'done', id: `SHO-${result.id}`, adminUrl: result.adminUrl, storeUrl: result.storeUrl }
        this.log(`Shopify: published — ID ${result.id}`, 'ok')
      } else {
        const setStep = step => { this.publishResults[id].step = step; this.updatePubRow(id) }
        const publisher = { tiktok: simulateTikTokPublish, lazada: simulateLazadaPublish, shopee: simulateShopeePublish }[id]
        const result = await publisher(cred, product, setStep)
        this.publishResults[id] = { state: 'done', id: result.id }
        this.log(`${CHANNELS[id].name}: published — ID ${result.id}`, 'ok')
      }
    } catch (err) {
      this.publishResults[id] = { state: 'error', error: err.message }
      this.log(`${CHANNELS[id].name}: failed — ${err.message}`, 'err')
    }
    this.updatePubRow(id)
  }
}
