// ── Escape helper (global) ────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Dashboard (home) ─────────────────────────────────────────────────────────
Router.register('dashboard', async () => {
  renderSidebar('dashboard');

  // Load summary stats
  const [hospRes, empRes, itemRes, orderRes, stockRes] = await Promise.all([
    window.db.hospitals.getAll(),
    window.db.employees.getAll(),
    window.db.items.getAll(),
    window.db.orders.getAll(),
    window.db.stock.getAll(),
  ]);

  const totalHospitals  = hospRes.success  ? hospRes.data.length  : '?';
  const totalEmployees  = empRes.success   ? empRes.data.length   : '?';
  const totalItems      = itemRes.success  ? itemRes.data.length  : '?';
  const totalOrders     = orderRes.success ? orderRes.data.length : '?';
  const activeOrders    = orderRes.success ? orderRes.data.filter(o => o.order_status === 'active').length : '?';
  const totalRevenue    = orderRes.success
    ? orderRes.data.reduce((sum, o) => sum + (o.total_amount * (100 - o.discount) / 100), 0)
    : 0;

  document.getElementById('sidebar-container').innerHTML = `
    <div class="permbar">
      <div class="left_sidebar">
        <div class="logo">
          <div class="gift">pet<span class="Ease">Hospital</span></div>
        </div>
        <nav class="nav-section">
          ${[
            { id: 'products',  label: 'Products',  icon: 'fa-hospital' },
            { id: 'hospitals',  label: 'Hospitals',  icon: 'fa-hospital' },
            { id: 'suppliers',  label: 'Suppliers',  icon: 'fa-hospital' },
            { id: 'employees',  label: 'Employeeees',  icon: 'fa-users' },
            { id: 'items',      label: 'Items',      icon: 'fa-box' },
            { id: 'recievers',  label: 'Receivers',  icon: 'fa-person-chalkboard' },
            { id: 'orders',     label: 'Orders',     icon: 'fa-receipt' },
            { id: 'categories', label: 'Categories', icon: 'fa-tags' },
            { id: 'stock',      label: 'Stock',      icon: 'fa-warehouse' },
            { id: 'charts',     label: 'Charts',     icon: 'fa-chart-bar' },
          ].map(p => `
            <a href="#" class="nav-item" data-page="${p.id}">
              <i class="fas ${p.icon}"></i> ${p.label}
            </a>`).join('')}
        </nav>
      </div>
    </div>`;

  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); Router.navigate(a.dataset.page); });
  });

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Welcome to Pet Hospital Management SystemBABABAB</p>
    </div>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e8f5e9"><i class="fas fa-hospital" style="color:#2d6a4f"></i></div>
        <div class="stat-info">
          <div class="stat-value">${totalHospitals}</div>
          <div class="stat-label">Hospitals</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#e3f2fd"><i class="fas fa-users" style="color:#1565c0"></i></div>
        <div class="stat-info">
          <div class="stat-value">${totalEmployees}</div>
          <div class="stat-label">Employees</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fff3e0"><i class="fas fa-box" style="color:#e65100"></i></div>
        <div class="stat-info">
          <div class="stat-value">${totalItems}</div>
          <div class="stat-label">Items</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fce4ec"><i class="fas fa-receipt" style="color:#c62828"></i></div>
        <div class="stat-info">
          <div class="stat-value">${totalOrders}</div>
          <div class="stat-label">Total Orders</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#e8f5e9"><i class="fas fa-circle-check" style="color:#2d6a4f"></i></div>
        <div class="stat-info">
          <div class="stat-value">${activeOrders}</div>
          <div class="stat-label">Active Orders</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#f3e5f5"><i class="fas fa-coins" style="color:#6a1b9a"></i></div>
        <div class="stat-info">
          <div class="stat-value">Rs. ${Math.round(totalRevenue).toLocaleString()}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>
    </div>

    <h2 class="section-title">Quick Access</h2>
    <div class="action-cards">
      ${[
        { page: 'hospitals',  icon: 'fa-hospital',           iconClass: 'icon-view',   label: 'Hospitals',  desc: 'View and manage hospitals' },
        { page: 'orders',     icon: 'fa-receipt',            iconClass: 'icon-insert', label: 'Orders',     desc: 'Create and track orders' },
        { page: 'items',      icon: 'fa-box',                iconClass: 'icon-view',   label: 'Items',      desc: 'Browse product inventory' },
        { page: 'stock',      icon: 'fa-warehouse',          iconClass: 'icon-insert', label: 'Stock',      desc: 'Manage hospital stock' },
        { page: 'charts',     icon: 'fa-chart-bar',          iconClass: 'icon-view',   label: 'Charts',     desc: 'View analytics & charts' },
        { page: 'employees',  icon: 'fa-users',              iconClass: 'icon-insert', label: 'Employees',  desc: 'Manage staff records' },
      ].map(c => `
        <a class="action-card" href="#" data-page="${c.page}">
          <div class="card-icon ${c.iconClass}"><i class="fas ${c.icon}"></i></div>
          <div class="card-label">${c.label}</div>
          <div class="card-desc">${c.desc}</div>
        </a>`).join('')}
    </div>`);

  document.querySelectorAll('.action-card[data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); Router.navigate(el.dataset.page); });
  });
});

// ── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('app-loading').style.display = 'none';
    document.getElementById('app').style.display = '';
    Router.navigate('dashboard');
  }, 300);
});
