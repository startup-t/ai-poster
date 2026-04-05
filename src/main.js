import './styles/main.css'
import { renderSidebar } from './components/Sidebar.js'
import { ListingChat } from './components/ListingChat.js'
import { ImageProcessor } from './components/ImageProcessor.js'
import { Publisher } from './components/Publisher.js'

class AIPosterApp {
  constructor() {
    this.activeTab = 'listing'
    this.connectedStores = []
    this.anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
    this.currentProduct = null
    this.currentListing = null

    this.listingChat = null
    this.imageProcessor = null
    this.publisher = null

    this.render()
    window.aiPosterApp = this
  }

  render() {
    const app = document.getElementById('app')

    app.innerHTML = `
      ${renderSidebar(this.activeTab, this.connectedStores, null)}
      <div class="main-content">
        <div class="topbar">
          <div class="topbar-title" id="topbarTitle">New listing</div>
          <button class="btn btn-sm" onclick="window.aiPosterApp?.clearCurrentTab()">Clear</button>
        </div>
        <div class="tab-content" id="tabContent"></div>
      </div>`

    // Attach nav click handlers
    app.querySelectorAll('.nav-item[data-tab]').forEach(el => {
      el.addEventListener('click', () => this.switchTab(el.dataset.tab))
    })

    this.initTab(this.activeTab)
  }

  switchTab(tab) {
    this.activeTab = tab
    const titles = {
      listing: 'New listing',
      images: 'Image processor',
      publish: 'Publisher',
      drafts: 'Drafts',
      channels: 'Channel settings'
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab)
    })

    document.getElementById('topbarTitle').textContent = titles[tab] || tab
    this.initTab(tab)
  }

  initTab(tab) {
    const content = document.getElementById('tabContent')
    content.innerHTML = ''

    if (tab === 'listing') {
      this.listingChat = new ListingChat(content, {
        anthropicKey: this.anthropicKey,
        onListingReady: (product, listing) => {
          this.currentProduct = product
          this.currentListing = listing
          this.publisher?.setProduct(product, listing)
        },
        onPublishRequest: (product, listing) => {
          this.currentProduct = product
          this.currentListing = listing
          this.switchTab('publish')
          this.publisher?.setProduct(product, listing)
        }
      })
    } else if (tab === 'images') {
      this.imageProcessor = new ImageProcessor(content)
    } else if (tab === 'publish' || tab === 'channels') {
      this.publisher = new Publisher(content, {
        onConnectedStoresChange: stores => {
          this.connectedStores = stores
          // Update sidebar store list
          const foot = document.querySelector('.sb-foot')
          if (foot) {
            const label = foot.querySelector('.sb-foot-label')
            foot.innerHTML = ''
            foot.appendChild(label)
            if (stores.length === 0) {
              foot.innerHTML += `<div class="store-chip" style="color:var(--color-text-tertiary)">None connected</div>`
            } else {
              stores.forEach(s => {
                foot.innerHTML += `<div class="store-chip"><div class="dot-green"></div>${s}</div>`
              })
            }
          }
        }
      })
      if (this.currentProduct) {
        this.publisher.setProduct(this.currentProduct, this.currentListing)
      }
    } else if (tab === 'drafts') {
      content.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--color-text-tertiary)">
          <div style="font-size:14px;font-weight:500;color:var(--color-text);margin-bottom:8px">Drafts</div>
          <div style="font-size:12px">Draft management with persistent storage coming soon.</div>
          <div style="font-size:11px;margin-top:4px">Generate a listing in the <strong>New listing</strong> tab to get started.</div>
        </div>`
    }
  }

  goToPublisher() {
    this.switchTab('publish')
  }

  clearCurrentTab() {
    this.initTab(this.activeTab)
  }
}

// Boot the app
new AIPosterApp()
