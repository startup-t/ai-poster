/**
 * Sidebar component — navigation and connected store list.
 */
export function renderSidebar(activeTab, connectedStores, onTabChange) {
  const navItems = [
    { id: 'listing', label: 'New listing', icon: docIcon() },
    { id: 'images', label: 'Image processor', icon: imageIcon() },
    { id: 'publish', label: 'Publisher', icon: publishIcon() },
    { id: 'drafts', label: 'Drafts', icon: draftIcon() }
  ]

  return `
    <aside class="sidebar">
      <div class="sb-head">
        <div class="logo">
          <div class="logo-mark">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/>
              <rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
          </div>
          <div>
            <div class="logo-name">AI Poster</div>
            <div class="logo-sub">Listing agent</div>
          </div>
        </div>
      </div>

      <nav class="sb-nav">
        <div class="nav-sec">Workspace</div>
        ${navItems.map(item => `
          <div class="nav-item ${activeTab === item.id ? 'active' : ''}" data-tab="${item.id}">
            ${item.icon}
            ${item.label}
          </div>
        `).join('')}

        <div class="nav-sec" style="margin-top:8px">Channels</div>
        <div class="nav-item ${activeTab === 'channels' ? 'active' : ''}" data-tab="channels">
          ${settingsIcon()} Channel settings
        </div>
      </nav>

      <div class="sb-foot">
        <div class="sb-foot-label">Connected stores</div>
        ${connectedStores.length === 0
          ? '<div class="store-chip" style="color:var(--color-text-tertiary)">None connected</div>'
          : connectedStores.map(s => `
              <div class="store-chip">
                <div class="dot-green"></div>${s}
              </div>`).join('')
        }
      </div>
    </aside>`
}

function docIcon() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.5 1h11A1.5 1.5 0 0115 2.5v11A1.5 1.5 0 0113.5 15h-11A1.5 1.5 0 011 13.5v-11A1.5 1.5 0 012.5 1zm0 1a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-11zM4 5h8v1H4zm0 3h5v1H4zm0 3h3v1H4z"/>
  </svg>`
}

function imageIcon() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.002 5.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
    <path d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0014.5 2h-13zm13 1a.5.5 0 01.5.5v6l-3.775-1.947a.5.5 0 00-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 00-.63.062L1.002 12v.54A.505.505 0 011 12.5v-9a.5.5 0 01.5-.5h13z"/>
  </svg>`
}

function publishIcon() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm.5 5V4h-1v4H5l3 3 3-3H8.5z"/>
  </svg>`
}

function draftIcon() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1a2 2 0 012 2v.5h2.5A1.5 1.5 0 0114 5v8.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5V5a1.5 1.5 0 011.5-1.5H6V3a2 2 0 012-2zm0 1a1 1 0 00-1 1v.5h2V3a1 1 0 00-1-1z"/>
  </svg>`
}

function settingsIcon() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/>
    <path d="M9.796 1.343a.96.96 0 01.961.965l.003.65c.625.315 1.193.75 1.679 1.267l.56-.205a.96.96 0 011.201.463l.732 1.269a.96.96 0 01-.234 1.215l-.533.414c.028.24.04.484.04.728s-.012.487-.04.728l.533.414a.96.96 0 01.234 1.215l-.732 1.269a.96.96 0 01-1.201.463l-.56-.205c-.486.517-1.054.952-1.679 1.267l-.003.65a.96.96 0 01-.961.965H6.204a.96.96 0 01-.961-.965l-.003-.65c-.625-.315-1.193-.75-1.679-1.267l-.56.205a.96.96 0 01-1.201-.463l-.732-1.269a.96.96 0 01.234-1.215l.533-.414a6.957 6.957 0 01-.04-.728c0-.244.013-.487.04-.728l-.533-.414a.96.96 0 01-.234-1.215l.732-1.269a.96.96 0 011.201-.463l.56.205c.486-.517 1.054-.952 1.679-1.267l.003-.65a.96.96 0 01.961-.965H9.796z"/>
  </svg>`
}
