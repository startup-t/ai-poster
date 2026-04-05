/**
 * ListingChat.js
 * ─────────────────────────────────────────────────────────────────
 * Chat-based listing generation tab.
 * Renders the full MasterListing schema including:
 *   - productTitle, shortDescription, fullDescription
 *   - bullets (min 5), specs, tags
 *   - platformGuidance (5 platforms)
 *   - fieldSources provenance badges
 * ─────────────────────────────────────────────────────────────────
 */

import { parseProduct, fallbackListing } from '../utils/parser.js'
import { generateListingWithClaude } from '../api/claude.js'

const EXAMPLE = `Product: Wireless Noise-Cancelling Headphones Pro X
Price: ₱4,299
Stock: 150 units
Variants: Black, Midnight Blue, Rose Gold
Weight: 280g
Brand: SoundPro
Images: front.jpg, side.jpg, lifestyle.jpg`

// ─── Source badge helper ─────────────────────────────────────────

const SOURCE_BADGE = {
  'ai-generated':  { label: 'AI',       cls: 'badge-ai'   },
  'ai-inferred':   { label: 'Inferred', cls: 'badge-infer' },
  'user-provided': { label: 'Yours',    cls: 'badge-orig'  },
}

function sourceBadge(fieldName, fieldSources = {}) {
  const src = fieldSources[fieldName] || 'ai-generated'
  const b   = SOURCE_BADGE[src] || SOURCE_BADGE['ai-generated']
  return `<span class="badge ${b.cls}">${b.label}</span>`
}

// ─── Platform name display map ───────────────────────────────────

const PLATFORM_NAMES = {
  shopify:     'Shopify',
  shopee:      'Shopee',
  lazada:      'Lazada',
  tiktok:      'TikTok Shop',
  woocommerce: 'WooCommerce',
}

// ─── Class ──────────────────────────────────────────────────────

export class ListingChat {
  constructor(container, options = {}) {
    this.container      = container
    this.options        = options   // { onListingReady, onPublishRequest, anthropicKey }
    this.phase          = 'idle'
    this.currentProduct = null
    this.currentListing = null
    this.busy           = false
    this.render()
    this.addMessage('assistant', this.welcomeHtml())
  }

  // ── Render shell ───────────────────────────────────────────────

  render() {
    this.container.innerHTML = `
      <div class="chat-layout">
        <div class="api-bar">
          <label class="api-label">Anthropic API key</label>
          <input type="password" class="api-input" id="claudeKey"
            placeholder="sk-ant-api03-…"
            value="${import.meta.env.VITE_ANTHROPIC_API_KEY || ''}"
            autocomplete="off" />
          <div class="api-status" id="claudeStatus">
            <div class="status-dot dot-yellow"></div>
            <span>Demo mode</span>
          </div>
        </div>
        <div class="chat-area" id="chatArea"></div>
        <div class="input-area">
          <div class="hints" id="hintChips">
            <button class="hint-chip" data-hint="example">Try example product</button>
            <button class="hint-chip" data-hint="format">What format to use?</button>
            <button class="hint-chip" data-hint="stores">Which stores?</button>
          </div>
          <div class="input-wrap">
            <textarea id="msgInput" rows="1"
              placeholder="Product name, price, stock, variants, weight…"></textarea>
            <button class="send-btn" id="sendBtn">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
                <path d="M14.5 8l-13-6.5.5 5.5 8 1-8 1-.5 5.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`

    this.chatArea = this.container.querySelector('#chatArea')
    this.msgInput = this.container.querySelector('#msgInput')
    this.sendBtn  = this.container.querySelector('#sendBtn')
    const keyInput = this.container.querySelector('#claudeKey')

    keyInput.addEventListener('input', () => {
      this.options.anthropicKey = keyInput.value.trim()
      this.updateApiStatus(keyInput.value.trim())
    })
    this.msgInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send() }
    })
    this.msgInput.addEventListener('input', () => this.autoResize())
    this.sendBtn.addEventListener('click', () => this.send())

    this.container.querySelectorAll('.hint-chip').forEach(btn => {
      btn.addEventListener('click', () => this.fillHint(btn.dataset.hint))
    })

    if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
      this.updateApiStatus(import.meta.env.VITE_ANTHROPIC_API_KEY)
    }
  }

  updateApiStatus(key) {
    const el = this.container.querySelector('#claudeStatus')
    if (key.startsWith('sk-ant-')) {
      el.innerHTML = `<div class="status-dot dot-green"></div><span>Claude API ready</span>`
    } else if (key.length > 0) {
      el.innerHTML = `<div class="status-dot dot-red"></div><span>Invalid key format</span>`
    } else {
      el.innerHTML = `<div class="status-dot dot-yellow"></div><span>Demo mode</span>`
    }
  }

  autoResize() {
    this.msgInput.style.height = 'auto'
    this.msgInput.style.height = Math.min(this.msgInput.scrollHeight, 100) + 'px'
  }

  fillHint(type) {
    if (type === 'example') this.msgInput.value = EXAMPLE
    else if (type === 'format') this.msgInput.value = 'What format should I use?'
    else this.msgInput.value = 'Which stores will it publish to?'
    this.autoResize()
    this.msgInput.focus()
  }

  // ── Message helpers ───────────────────────────────────────────

  addMessage(role, html) {
    const div = document.createElement('div')
    div.className = `chat-msg ${role}`
    div.innerHTML = `
      <div class="chat-avatar ${role === 'assistant' ? 'av-ai' : 'av-user'}">
        ${role === 'assistant' ? 'AI' : 'U'}
      </div>
      <div class="chat-bubble ${role}">${html}</div>`
    this.chatArea.appendChild(div)
    this.chatArea.scrollTop = this.chatArea.scrollHeight
    return div
  }

  addTyping() {
    const div = document.createElement('div')
    div.className = 'chat-msg assistant'
    div.id = 'typingIndicator'
    div.innerHTML = `
      <div class="chat-avatar av-ai">AI</div>
      <div class="chat-bubble assistant">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>`
    this.chatArea.appendChild(div)
    this.chatArea.scrollTop = this.chatArea.scrollHeight
  }

  removeTyping() {
    const t = document.getElementById('typingIndicator')
    if (t) t.remove()
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)) }

  welcomeHtml() {
    return `<strong>Welcome to AI Poster.</strong>
      <p style="margin-top:6px;color:var(--color-text-secondary);font-size:12px">
        Send me your product details and I'll generate a full master listing —
        title, short &amp; full descriptions, bullet points, specs, tags, and
        platform guidance for Shopify, Shopee, Lazada, TikTok Shop, and WooCommerce.
      </p>
      <p style="margin-top:5px;font-size:11px;color:var(--color-text-tertiary)">
        Include: name, price, stock, variants, weight, brand, images.
      </p>`
  }

  // ── Message dispatch ──────────────────────────────────────────

  async send() {
    if (this.busy) return
    const text = this.msgInput.value.trim()
    if (!text) return
    this.msgInput.value = ''
    this.autoResize()
    this.container.querySelector('#hintChips').style.display = 'none'
    this.busy = true
    this.sendBtn.disabled = true

    this.addMessage('user', text.replace(/</g, '&lt;').replace(/\n/g, '<br>'))

    if (this.phase === 'awaiting') {
      if (/^go$/i.test(text.trim()) || /publish/i.test(text)) {
        this.options.onPublishRequest?.(this.currentProduct, this.currentListing)
        this.addMessage('assistant', `<span style="color:var(--color-text-secondary)">Opening publisher — select your channels and hit <strong>Publish now</strong>.</span>`)
        this.busy = false; this.sendBtn.disabled = false
        return
      }
      if (/change|edit|update|fix|revise/i.test(text)) {
        this.addMessage('assistant', `<span style="color:var(--color-text-secondary)">Sure — describe the changes and I'll regenerate.</span>`)
        this.phase = 'idle'; this.busy = false; this.sendBtn.disabled = false
        return
      }
    }

    if (this.phase === 'idle' || this.phase === 'done') {
      if (/format/i.test(text)) {
        this.addMessage('assistant', `Use this key-value format:<div class="code-block">Product: [name]<br>Price: [price]<br>Stock: [qty]<br>Brand: [brand]<br>Variants: [v1, v2]<br>Weight: [weight]<br>Images: [file1.jpg]</div>`)
        this.busy = false; this.sendBtn.disabled = false; return
      }
      if (/store/i.test(text)) {
        this.addMessage('assistant', `I generate platform guidance for all five: <strong>Shopify</strong>, <strong>TikTok Shop</strong>, <strong>Lazada</strong>, <strong>Shopee</strong>, and <strong>WooCommerce</strong>.`)
        this.busy = false; this.sendBtn.disabled = false; return
      }
      if (/example/i.test(text)) {
        this.addMessage('user', EXAMPLE.replace(/\n/g, '<br>'))
        await this.processProduct(parseProduct(EXAMPLE))
        this.busy = false; this.sendBtn.disabled = false; return
      }
      const product = parseProduct(text)
      if (!product.name) {
        this.addTyping(); await this.delay(700); this.removeTyping()
        this.addMessage('assistant', `I couldn't find a product name. Please include at least:<br><code>Product: Your Product Name</code>`)
        this.busy = false; this.sendBtn.disabled = false; return
      }
      await this.processProduct(product)
      this.busy = false; this.sendBtn.disabled = false; return
    }

    this.addMessage('assistant', `<span style="color:var(--color-text-secondary)">Send a new product, or type <strong>go</strong> to open the publisher.</span>`)
    this.busy = false; this.sendBtn.disabled = false
  }

  // ── Generation ────────────────────────────────────────────────

  async processProduct(product) {
    this.currentProduct = product
    const apiKey    = this.options.anthropicKey || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
    const useRealApi = apiKey.startsWith('sk-ant-')

    if (useRealApi) {
      this.addMessage('assistant', `<div class="status-row"><div class="spinner"></div>Sending to Claude API — generating master listing…</div>`)
      try {
        const listing = await generateListingWithClaude(product, apiKey)
        this.currentListing = listing
        this.options.onListingReady?.(product, listing)
        this.addMessage('assistant', this.renderDraft(product, listing, true))
        this.phase = 'awaiting'
      } catch (err) {
        this.addMessage('assistant', `<div class="err-bubble"><strong>API error:</strong> ${err.message}</div>`)
      }
    } else {
      this.addMessage('assistant', `<div class="status-row"><div class="spinner"></div>Generating listing (demo mode — add API key for real AI)…</div>`)
      await this.delay(1400)
      const listing = fallbackListing(product)
      this.currentListing = listing
      this.options.onListingReady?.(product, listing)
      this.addMessage('assistant', this.renderDraft(product, listing, false))
      this.phase = 'awaiting'
    }
  }

  // ── Draft renderer ────────────────────────────────────────────

  renderDraft(product, listing, isAi) {
    const fs = listing.fieldSources || {}

    // Readiness per platform
    const platformRows = (listing.platformGuidance || []).map(pg => {
      const pName  = PLATFORM_NAMES[pg.platform] || pg.platform
      const isOk   = pg.ready
      const missing = (pg.missingForPlatform || [])
      return `
        <div class="platform-row">
          <div class="platform-name">${pName}</div>
          <div class="platform-status ${isOk ? 'ps-ok' : 'ps-warn'}">
            ${isOk ? 'Ready' : 'Needs work'}
          </div>
          <div class="platform-tip">${pg.descriptionTip}</div>
          ${missing.length
            ? `<div class="platform-missing">${missing.map(m => `<span class="miss-item">${m}</span>`).join('')}</div>`
            : ''}
        </div>`
    }).join('')

    const specRows = Object.entries(listing.specs || {})
      .map(([k, v]) => `<div class="spec-row"><span class="spec-key">${k}</span><span class="spec-val">${v}</span></div>`)
      .join('')

    const missingRows = (listing.missingFields || []).length
      ? listing.missingFields.map(m => `<div class="missing-item"><div class="miss-dot"></div>${m}</div>`).join('')
      : `<span style="font-size:11px;color:#15803d">All required fields present</span>`

    const bullets = (listing.bullets || []).map(b => `<li>${b}</li>`).join('')
    const tags    = (listing.tags    || []).map(t => `<span class="tag">${t}</span>`).join('')

    // Marketplace readiness chips (legacy)
    const mktReady = {
      Shopify:     listing.readiness >= 75,
      'TikTok Shop': listing.readiness >= 65,
      Lazada:      listing.readiness >= 50,
      Shopee:      listing.readiness >= 50,
      WooCommerce: listing.readiness >= 60,
    }
    const mktChips = Object.entries(mktReady)
      .map(([k, v]) => `<span class="mkt-chip ${v ? 'chip-ok' : 'chip-warn'}">${k}</span>`)
      .join('')

    return `
      <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:6px">
        ${isAi ? '<strong>AI-generated</strong> master listing' : 'Demo listing (template-based)'} — review before publishing.
      </div>
      <div class="draft-card">
        <div class="draft-head">
          <span class="card-label">Master listing</span>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <span class="badge ${isAi ? 'badge-ai' : 'badge-demo'}">${isAi ? 'Claude AI' : 'Demo'}</span>
            <span class="badge badge-ok">${listing.readiness}% ready</span>
          </div>
        </div>
        <div class="draft-body">

          <!-- Original input -->
          <div class="field-group">
            <div class="field-label">Original input <span class="badge badge-orig">preserved</span></div>
            <div class="field-val muted code-block">${product.raw.replace(/</g, '&lt;')}</div>
          </div>
          <div class="sep"></div>

          <!-- Product title -->
          <div class="field-group">
            <div class="field-label">
              <div class="ai-dot"></div> Product title
              ${sourceBadge('productTitle', fs)}
            </div>
            <div class="field-val" style="font-weight:500">${listing.productTitle || listing.seoTitle}</div>
          </div>

          <!-- Short description -->
          <div class="field-group">
            <div class="field-label">
              <div class="ai-dot"></div> Short description
              ${sourceBadge('shortDescription', fs)}
              <span class="badge badge-meta">20–50 words · mobile-first</span>
            </div>
            <div class="field-val" style="color:var(--color-text-secondary)">${listing.shortDescription || listing.description}</div>
          </div>

          <!-- Full description -->
          <div class="field-group">
            <div class="field-label">
              <div class="ai-dot"></div> Full description
              ${sourceBadge('fullDescription', fs)}
              <span class="badge badge-meta">150–400 words</span>
            </div>
            <div class="field-val full-desc">${(listing.fullDescription || '').replace(/\n\n/g, '</p><p style="margin-top:8px">').replace(/^/, '<p>').replace(/$/, '</p>')}</div>
          </div>
          <div class="sep"></div>

          <!-- Bullet points -->
          <div class="field-group">
            <div class="field-label">
              <div class="ai-dot"></div> Key selling points
              ${sourceBadge('bullets', fs)}
              <span class="badge badge-meta">${(listing.bullets || []).length} bullets</span>
            </div>
            <ul class="bullet-list">${bullets}</ul>
          </div>
          <div class="sep"></div>

          <!-- Specs -->
          <div class="field-group">
            <div class="field-label">
              Specifications
              ${sourceBadge('specs', fs)}
            </div>
            <div class="specs-grid">${specRows}</div>
          </div>
          <div class="sep"></div>

          <!-- Tags -->
          <div class="field-group">
            <div class="field-label">
              <div class="ai-dot"></div> Tags
              ${sourceBadge('tags', fs)}
            </div>
            <div class="tags-row">${tags}</div>
          </div>

          <!-- Category -->
          <div class="field-group">
            <div class="field-label">
              Category
              ${sourceBadge('category', fs)}
            </div>
            <div class="field-val">${listing.category}</div>
          </div>
          <div class="sep"></div>

          <!-- Platform guidance -->
          <div class="field-group">
            <div class="field-label">Platform guidance <span class="badge badge-meta">5 marketplaces</span></div>
            <div class="platform-guidance-list">
              ${platformRows}
            </div>
          </div>
          <div class="sep"></div>

          <!-- Missing fields -->
          <div class="field-group">
            <div class="field-label">Missing fields</div>
            ${missingRows}
          </div>

          <!-- Overall readiness -->
          <div class="field-group">
            <div class="field-label">Overall marketplace readiness</div>
            <div class="readiness-track"><div class="readiness-fill" style="width:${listing.readiness}%"></div></div>
            <div class="readiness-labels"><span>${listing.readiness}%</span><span>100%</span></div>
            <div class="mkt-chips">${mktChips}</div>
          </div>

        </div>
      </div>

      <div class="approval-bar">
        <div>
          <div style="font-size:12px;font-weight:500;color:var(--color-text-primary)">Ready to publish?</div>
          <div style="font-size:11px;color:var(--color-text-secondary);margin-top:2px">
            Type <strong>go</strong> to open the publisher, or ask for changes.
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-danger"
            onclick="this.closest('.chat-bubble').querySelector('.approval-bar').innerHTML='<span style=color:var(--color-text-secondary)>What would you like to change?</span>'">
            Request changes
          </button>
          <button class="btn btn-sm btn-success" onclick="window.aiPosterApp?.goToPublisher()">
            Open publisher
          </button>
        </div>
      </div>`
  }
}
