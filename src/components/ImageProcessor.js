import { removeBackground, addWhiteBackground, simulateRemoval } from '../api/removebg.js'

export class ImageProcessor {
  constructor(container) {
    this.container = container
    this.images = []
    this.creditsUsed = 0
    this.apiKey = import.meta.env.VITE_REMOVEBG_API_KEY || ''
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-wrap">
        <div class="api-bar">
          <label class="api-label">Remove.bg API key</label>
          <input type="password" class="api-input" id="rbgKey"
            placeholder="Your Remove.bg API key…"
            value="${this.apiKey}" autocomplete="off" />
          <div class="api-status" id="rbgStatus">
            <div class="status-dot dot-yellow"></div>
            <span>Demo mode — live removal requires a key</span>
          </div>
        </div>

        <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Queued</div><div class="stat-val" id="statQ">0</div></div>
            <div class="stat-card"><div class="stat-label">Processed</div><div class="stat-val" id="statD">0</div></div>
            <div class="stat-card"><div class="stat-label">Credits used</div><div class="stat-val" id="statC">0</div></div>
          </div>

          <div class="drop-zone" id="dropZone">
            <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" multiple style="display:none" />
            <div class="drop-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="drop-title">Drop product images here</div>
            <div class="drop-sub">JPG, PNG, WebP — up to 10 images</div>
            <button class="btn btn-sm" id="browseBtn">Browse files</button>
          </div>

          <div id="processBar" style="display:none">
            <div class="process-bar">
              <div style="font-size:12px;color:var(--color-text-secondary)">
                <span id="processCount" style="font-weight:500;color:var(--color-text-primary)">0 images</span> ready
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-sm btn-danger" id="clearBtn">Clear queue</button>
                <button class="btn btn-sm btn-primary" id="processBtn">Remove backgrounds</button>
              </div>
            </div>
          </div>

          <div id="imageQueue"></div>
        </div>
      </div>`

    const rbgKey = this.container.querySelector('#rbgKey')
    rbgKey.addEventListener('input', () => {
      this.apiKey = rbgKey.value.trim()
      this.updateStatus()
    })

    const fileInput = this.container.querySelector('#fileInput')
    const dropZone = this.container.querySelector('#dropZone')

    this.container.querySelector('#browseBtn').addEventListener('click', e => {
      e.stopPropagation()
      fileInput.click()
    })
    dropZone.addEventListener('click', () => fileInput.click())
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over') })
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
    dropZone.addEventListener('drop', e => {
      e.preventDefault()
      dropZone.classList.remove('drag-over')
      this.addFiles(Array.from(e.dataTransfer.files))
    })
    fileInput.addEventListener('change', e => { this.addFiles(Array.from(e.target.files)); e.target.value = '' })

    this.container.querySelector('#clearBtn').addEventListener('click', () => this.clearQueue())
    this.container.querySelector('#processBtn').addEventListener('click', () => this.processAll())

    this.updateStatus()
  }

  updateStatus() {
    const el = this.container.querySelector('#rbgStatus')
    if (this.apiKey.length > 4) {
      el.innerHTML = `<div class="status-dot dot-green"></div><span>API key set — live removal enabled</span>`
    } else {
      el.innerHTML = `<div class="status-dot dot-yellow"></div><span>Demo mode — live removal requires a key</span>`
    }
  }

  addFiles(files) {
    const valid = files.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
      .slice(0, Math.max(0, 10 - this.images.length))

    valid.forEach(file => {
      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)
      const img = { id, file, name: file.name, size: file.size, state: 'queued', originalUrl: null, resultUrl: null }
      this.images.push(img)

      const reader = new FileReader()
      reader.onload = e => {
        img.originalUrl = e.target.result
        this.renderRow(id)
      }
      reader.readAsDataURL(file)
    })

    this.renderQueue()
    this.updateStats()
  }

  fmtSize(b) {
    return b > 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + 'MB' : (b / 1024).toFixed(0) + 'KB'
  }

  updateStats() {
    this.container.querySelector('#statQ').textContent = this.images.filter(i => i.state === 'queued').length
    this.container.querySelector('#statD').textContent = this.images.filter(i => i.state === 'done').length
    this.container.querySelector('#statC').textContent = this.creditsUsed
    const processBar = this.container.querySelector('#processBar')
    const processCount = this.container.querySelector('#processCount')
    processBar.style.display = this.images.length ? 'block' : 'none'
    processCount.textContent = `${this.images.length} image${this.images.length === 1 ? '' : 's'}`
  }

  clearQueue() {
    this.images = []
    this.container.querySelector('#imageQueue').innerHTML = ''
    this.updateStats()
  }

  renderQueue() {
    const queue = this.container.querySelector('#imageQueue')
    this.images.forEach(img => {
      if (!document.getElementById('row_' + img.id)) {
        const div = document.createElement('div')
        div.id = 'row_' + img.id
        queue.appendChild(div)
      }
      this.renderRow(img.id)
    })
  }

  renderRow(id) {
    const img = this.images.find(i => i.id === id)
    if (!img) return
    const row = document.getElementById('row_' + id)
    if (!row) return

    const stateLabel = { queued: 'Queued', processing: 'Processing…', done: 'Done', error: 'Error' }[img.state]
    const stateClass = { queued: 'badge-idle', processing: 'badge-warn', done: 'badge-ok', error: 'badge-err' }[img.state]

    const origThumb = img.originalUrl
      ? `<img src="${img.originalUrl}" class="thumb" alt="original">`
      : `<div class="thumb thumb-placeholder"><div class="spinner"></div></div>`

    const resultThumb = img.resultUrl
      ? `<img src="${img.resultUrl}" class="thumb thumb-checker" alt="processed">`
      : `<div class="thumb thumb-checker thumb-placeholder">
          ${img.state === 'processing' ? '<div class="spinner"></div>' : '<span style="font-size:9px;color:var(--color-text-tertiary)">Pending</span>'}
        </div>`

    const downloadHtml = img.state === 'done' && img.resultUrl
      ? `<a class="download-link" href="${img.resultUrl}" download="${img.name.replace(/\.[^.]+$/, '')}_nobg.png">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
          </svg>Download PNG</a>`
      : ''

    const progressHtml = img.state === 'processing'
      ? `<div class="progress-wrap">
          <div class="progress-track"><div class="progress-fill" id="prog_${id}" style="width:${img.progress || 0}%"></div></div>
          <div class="progress-label" id="progLabel_${id}">${img.progressLabel || 'Uploading…'}</div>
        </div>`
      : ''

    const errorHtml = img.state === 'error'
      ? `<div class="err-inline">${img.error || 'Processing failed.'}</div>`
      : ''

    row.innerHTML = `
      <div class="img-row">
        <div class="img-row-head">
          <span class="img-name">${img.name}</span>
          <span style="font-size:10px;color:var(--color-text-tertiary)">${this.fmtSize(img.size)}</span>
          <span class="badge ${stateClass}">${stateLabel}</span>
          <button class="btn btn-xs" onclick="document.getElementById('row_${id}').remove()">✕</button>
        </div>
        <div class="img-row-body">
          <div class="thumb-wrap"><div class="thumb-label">Original</div>${origThumb}</div>
          <div class="thumb-wrap"><div class="thumb-label">Result</div>${resultThumb}</div>
          <div class="img-meta">
            <div class="meta-row"><span class="meta-key">File</span><span class="meta-val">${img.name}</span></div>
            <div class="meta-row"><span class="meta-key">Size</span><span class="meta-val">${this.fmtSize(img.size)}</span></div>
            <div class="meta-row"><span class="meta-key">Status</span><span class="meta-val">${stateLabel}</span></div>
            ${progressHtml}${downloadHtml}${errorHtml}
          </div>
        </div>
      </div>`
  }

  async processAll() {
    const queued = this.images.filter(i => i.state === 'queued')
    if (!queued.length) return
    const btn = this.container.querySelector('#processBtn')
    btn.disabled = true; btn.textContent = 'Processing…'
    for (const img of queued) await this.processImage(img.id)
    btn.disabled = false; btn.textContent = 'Remove backgrounds'
    this.updateStats()
  }

  async processImage(id) {
    const img = this.images.find(i => i.id === id)
    if (!img) return
    img.state = 'processing'; img.progress = 10; img.progressLabel = 'Uploading…'
    this.renderRow(id)

    const setProgress = (p, label) => {
      img.progress = p; img.progressLabel = label
      const fill = document.getElementById('prog_' + id)
      const lbl = document.getElementById('progLabel_' + id)
      if (fill) fill.style.width = p + '%'
      if (lbl) lbl.textContent = label
    }

    try {
      if (this.apiKey.length > 4) {
        setProgress(30, 'Processing with Remove.bg AI…')
        const blob = await removeBackground(img.file, this.apiKey)
        setProgress(90, 'Finalising…')
        img.resultUrl = URL.createObjectURL(blob)
      } else {
        await simulateRemoval((p, label) => setProgress(p, label))
        img.resultUrl = await addWhiteBackground(img.originalUrl)
      }
      img.state = 'done'; img.progress = 100
      this.creditsUsed++
    } catch (err) {
      img.state = 'error'; img.error = err.message
    }
    this.renderRow(id)
    this.updateStats()
  }
}
