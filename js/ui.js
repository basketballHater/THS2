// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

// ── Confirm dialog ───────────────────────────────────────────────────────────
function confirmDelete(msg = 'Are you sure you want to delete this record?') {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-msg').textContent = msg;
    overlay.classList.add('show');
    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    const cleanup = () => { overlay.classList.remove('show'); ok.onclick = cancel.onclick = null; };
    ok.onclick     = () => { cleanup(); resolve(true); };
    cancel.onclick = () => { cleanup(); resolve(false); };
  });
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function renderSidebar(activePage) {
  const pages = [
    { id: 'products', label: 'Products', icon: 'fa-box' },
    { id: 'suppliers', label: 'Suppliers', icon: 'fa-truck' },
    { id: 'clients', label: 'Clients', icon: 'fa-users' },
    { id: 'employees', label: 'employees', icon: 'fa-users' },
    { id: 'bankAccount', label: 'Bank Accounts', icon: 'fa-tags' },
    { id: 'orders',     label: 'Orders',     icon: 'fa-receipt' },

    /////////////////////////////////////////////////////////////////
  ];

  const links = pages.map(p => `
    <a href="#" class="nav-item ${activePage === p.id ? 'active' : ''}" data-page="${p.id}">
      <i class="fas ${p.icon}"></i> ${p.label}
    </a>`).join('');

  document.getElementById('sidebar-container').innerHTML = `
    <div class="permbar">
      <div class="left_sidebar">
        <div class="logo">
          <div class="gift">pet<span class="Ease">Hospital</span></div>
        </div>
        <nav class="nav-section">${links}</nav>
      </div>
    </div>`;

  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate(a.dataset.page);
    });
  });
}

// ── Generic table builder ─────────────────────────────────────────────────────
function buildTable(columns, rows, rowRenderer) {
  const ths = columns.map(c => `<th>${c}</th>`).join('');
  const trs = rows.length
    ? rows.map(rowRenderer).join('')
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:#999;padding:24px">No records found.</td></tr>`;
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

// ── Dashboard card builder ────────────────────────────────────────────────────
function buildDashboard(title, subtitle, cards) {
  const cardHtml = cards.map(c => `
    <a class="action-card" href="#" data-page="${c.page}">
      <div class="card-icon ${c.iconClass}"><i class="fas ${c.icon}"></i></div>
      <div class="card-label">${c.label}</div>
      <div class="card-desc">${c.desc}</div>
    </a>`).join('');

  return `
    <div class="page-header">
      <h1 class="page-title">${title}</h1>
      <p class="page-subtitle">${subtitle}</p>
    </div>
    <div class="action-cards">${cardHtml}</div>`;
}

// ── Form helpers ─────────────────────────────────────────────────────────────
function formVal(id) {
  return document.getElementById(id)?.value?.trim() ?? '';
}

function setContent(html) {
  document.getElementById('page-content').innerHTML = html;
  // Attach card navigation
  document.querySelectorAll('.action-card[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate(el.dataset.page);
    });
  });
}
