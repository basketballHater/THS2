// ── orders.js ─────────────────────────────────────────────────────────────────
// Plug-and-play orders module following your existing Router pattern.
// Assumes the same globals: Router, renderSidebar, setContent, buildTable,
// buildDashboard, toast, confirmDelete, esc, formVal, window.db
//
// Wire up window.db.orders in your preload/ipc bridge (see ipc-orders.js).
// Also include invoice-builder.js in your HTML shell so buildInvoiceHtml() is available.

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
Router.register('orders', () => {
  renderSidebar('orders');
  setContent(buildDashboard('Orders', 'Create and manage client orders', [
    { page: 'orders/view',   icon: 'fa-list',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all orders' },
    { page: 'orders/create', icon: 'fa-plus',  iconClass: 'icon-insert', label: 'New Order', desc: 'Create a new order' },
  ]));
});

// ═════════════════════════════════════════════════════════════════════════════
// LIST VIEW
// ═════════════════════════════════════════════════════════════════════════════
Router.register('orders/view', async () => {
  renderSidebar('orders');

  const res = await window.db.orders.list();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  const orders = res.orders || [];

  // Count per status for the tab badges
  const count = s => orders.filter(o => o.status === s).length;

  setContent(`
    <div class="page-header">
      <div>
        <h1 class="page-title">Orders</h1>
        <p class="page-subtitle">Manage client orders and generate invoices</p>
      </div>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> New Order</button>
    </div>

    <div style="padding:0 30px 16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="tab-btn active" data-status="">All <span class="tab-count">${orders.length}</span></button>
      <button class="tab-btn" data-status="draft">Draft <span class="tab-count">${count('draft')}</span></button>
      <button class="tab-btn" data-status="confirmed">Confirmed <span class="tab-count">${count('confirmed')}</span></button>
      <button class="tab-btn" data-status="paid">Paid <span class="tab-count">${count('paid')}</span></button>
      <button class="tab-btn" data-status="void">Void <span class="tab-count">${count('void')}</span></button>
    </div>

    <div id="orders-table-wrap">
      ${buildOrdersTable(orders)}
    </div>


  `);

  document.getElementById('btn-add').onclick = () => Router.navigate('orders/create');

  // Tab filter
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.dataset.status;
      const filtered = status ? orders.filter(o => o.status === status) : orders;
      document.getElementById('orders-table-wrap').innerHTML = buildOrdersTable(filtered);
      bindOrderTableActions();
    };
  });

  bindOrderTableActions();
});

function buildOrdersTable(orders) {
  if (!orders.length) return `
    <div style="text-align:center;padding:60px 30px;color:#ccc">
      <i class="fas fa-file-invoice" style="font-size:48px;display:block;margin-bottom:16px"></i>
      <p style="font-size:15px;font-weight:600;color:#bbb">No orders found</p>
    </div>`;

  return buildTable(
    ['Order #', 'Client', 'Date', 'Sales Person', 'Prepared By', 'Status', 'Total', 'Profit', 'Actions'],
    orders,
    o => {
      const profitCls = o.total_profit >= 0 ? 'profit-pos' : 'profit-neg';
      const sign      = o.total_profit >= 0 ? '+' : '';
      return `<tr>
        <td><strong>#${String(o.id).padStart(4,'0')}</strong></td>
        <td>${esc(o.client_name)}</td>
        <td>${fmtDate(o.created_at)}</td>
        <td>${esc(o.sales_person_name)}</td>
        <td>${esc(o.prepared_by_name)}</td>
        <td>${badgeHtml(o.status)}</td>
        <td><strong>${fmtLKR(o.total_price)}</strong></td>
        <td class="${profitCls}">${sign}${fmtLKR(o.total_profit)}<br>
          <small>${sign}${(o.profit_pct||0).toFixed(1)}%</small></td>
        <td class="action-cell">
          <a href="#" class="btn-view"   data-id="${o.id}"><i class="fas fa-eye"></i> View</a>
          ${o.status !== 'void'
            ? `<a href="#" class="btn-delete" data-id="${o.id}"><i class="fas fa-ban"></i> Void</a>`
            : `<a href="#" class="btn-edit"   data-id="${o.id}"><i class="fas fa-copy"></i> Re-create</a>`}
          <a href="#" class="btn-stock"  data-id="${o.id}"><i class="fas fa-file-invoice"></i> Invoice</a>
        </td>
      </tr>`;
    }
  );
}

function bindOrderTableActions() {
  document.querySelectorAll('.btn-view').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('orders/detail', { id: a.dataset.id });
  });
  // Void button reuses btn-delete style
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('orders/void', { id: a.dataset.id });
  });
  // Re-create button reuses btn-edit style
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('orders/create', { cloneFrom: a.dataset.id });
  });
  document.querySelectorAll('.btn-stock').forEach(a => a.onclick = async e => {
    e.preventDefault(); await openInvoice(Number(a.dataset.id));
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// CREATE ORDER
// ═════════════════════════════════════════════════════════════════════════════
Router.register('orders/create', async ({ cloneFrom } = {}) => {
  renderSidebar('orders');

  const dd = await window.db.orders.dropdowns();
  if (!dd.success) return setContent(`<p class="error">Error loading data: ${dd.error}</p>`);

  // If cloning a voided order, fetch its data to pre-fill
  let clone = null;
  let cloneItems = {};
  if (cloneFrom) {
    const cr = await window.db.orders.get(Number(cloneFrom));
    if (cr.success) {
      clone = cr.order;
      cr.items.forEach(i => {
        const p = dd.products.find(x => x.id === i.product_id);
        if (p) cloneItems[p.id] = { product: p, qty: i.quantity };
      });
    }
  }

  setContent(`
    <div class="page-header">
      <h1 class="page-title">${clone ? 'Re-create Order' : 'New Order'}</h1>
      <button class="btn-secondary" id="btn-back"><i class="fas fa-arrow-left"></i> Back</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;padding:0 30px 40px;align-items:start">

      <!-- ── LEFT COLUMN ── -->
      <div>

        <!-- Client -->
        <div class="form-card" style="margin:0 0 16px">
          <div class="order-section-title"><i class="fas fa-user"></i> Client</div>
          <div class="form-group" style="margin:0">
            <label>Select Client</label>
            <select id="c_client">
              <option value="">— choose client —</option>
              ${dd.clients.map(c => `<option value="${c.id}" ${clone&&clone.client_id==c.id?'selected':''}>${esc(c.name)} — ${esc(c.designation||'')}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Products -->
        <div class="form-card" style="margin:0 0 16px">
          <div class="order-section-title"><i class="fas fa-boxes"></i> Products</div>
          <div style="position:relative;margin-bottom:10px">
            <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#aaa;font-size:13px"></i>
            <input id="productSearch" placeholder="Search by name, ID, brand…"
              style="width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:9px 13px 9px 36px;font-size:13px;font-family:inherit"/>
          </div>
          <div id="productsList" style="max-height:240px;overflow-y:auto;border:1.5px solid #f0f0f0;border-radius:10px"></div>

          <!-- Selected items summary -->
          <div id="selectedWrap" style="margin-top:14px;display:none;border:1.5px solid #f0f0f0;border-radius:10px;">
            <table class="tablelite" style="width:100%;border-collapse:collapse">
              <thead style="background:#032e3f">
                <tr>
                  <th style="padding:9px 12px;font-size:11px;color:#fff;font-weight:600;text-align:left">Product</th>
                  <th style="padding:9px 12px;font-size:11px;color:#fff;font-weight:600;text-align:right">Unit Price</th>
                  <th style="padding:9px 12px;font-size:11px;color:#fff;font-weight:600;text-align:center">Qty</th>
                  <th style="padding:9px 12px;font-size:11px;color:#fff;font-weight:600;text-align:right">Line Total</th>
                </tr>
              </thead>
              <tbody id="selectedTbody"></tbody>
              <tfoot>
                <tr style="background:#f9f9f9">
                  <td colspan="3" style="padding:9px 12px;font-size:12px;font-weight:700">Subtotal</td>
                  <td id="subtotalCell" style="padding:9px 12px;font-size:12px;font-weight:700;text-align:right">LKR 0.00</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Charges -->
        <div class="form-card" style="margin:0 0 16px">
          <div class="order-section-title"><i class="fas fa-percentage"></i> Pricing &amp; Charges</div>
          <div class="form-row">
            <div class="form-group">
              <label>Discount %</label>
              <div class="input-prefix"><span>%</span><input type="number" id="c_discount" min="0" max="100" step="0.01" value="${clone?clone.discount_rate:0}"/></div>
            </div>
            <div class="form-group">
              <label>NBT %</label>
              <div class="input-prefix"><span>%</span><input type="number" id="c_nbt" min="0" step="0.01" value="${clone?clone.nbt_rate:0}"/></div>
            </div>
            <div class="form-group">
              <label>VAT %</label>
              <div class="input-prefix"><span>%</span><input type="number" id="c_vat" min="0" step="0.01" value="${clone?clone.vat_rate:0}"/></div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Transport Cost (LKR)</label>
              <div class="input-prefix"><span>LKR</span><input type="number" id="c_transport" min="0" step="0.01" value="${clone?clone.transport:0}"/></div>
            </div>
            <div class="form-group">
              <label>Commission %</label>
              <div class="input-prefix"><span>%</span><input type="number" id="c_commission" min="0" step="0.01" value="${clone?clone.commission_rate:0}"/></div>
            </div>
          </div>
        </div>

        <!-- People & Bank -->
        <div class="form-card" style="margin:0">
          <div class="order-section-title"><i class="fas fa-users"></i> People &amp; Bank</div>
          <div class="form-row">
            <div class="form-group">
              <label>Prepared By</label>
              <select id="c_preparedBy">
                <option value="">— select employee —</option>
                ${dd.employees.map(e => `<option value="${e.id}" ${clone&&clone.prepared_by==e.id?'selected':''}>${esc(e.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Sales Person</label>
              <select id="c_salesPerson">
                <option value="">— select employee —</option>
                ${dd.employees.map(e => `<option value="${e.id}" ${clone&&clone.sales_person==e.id?'selected':''}>${esc(e.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Bank Account</label>
            <select id="c_bank">
              <option value="">— select account —</option>
              ${dd.bankAccounts.map(b => `<option value="${b.id}" ${clone&&clone.bank_account_id==b.id?'selected':''}>${esc(b.bank)} · ${esc(b.accountName)} (${esc(b.accountNumber)})</option>`).join('')}
            </select>
          </div>
        </div>

      </div><!-- /left col -->

      <!-- ── RIGHT COLUMN: live financials ── -->
      <div>
        <div style="background:linear-gradient(135deg,#032e3f,#054a63);border-radius:16px;padding:22px;color:#fff;position:sticky;top:20px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin-bottom:16px">
            <i class="fas fa-calculator"></i>&nbsp; Order Financials
          </div>

          <div class="fin-row-d"><span>Subtotal</span><span id="fp_subtotal">LKR 0.00</span></div>
          <div class="fin-row-d deduct-d"><span>Discount</span><span id="fp_discount">− LKR 0.00</span></div>
          <div class="fin-row-d add-d"><span>NBT</span><span id="fp_nbt">+ LKR 0.00</span></div>
          <div class="fin-row-d add-d"><span>VAT</span><span id="fp_vat">+ LKR 0.00</span></div>
          <div class="fin-row-d add-d"><span>Transport</span><span id="fp_transport">+ LKR 0.00</span></div>
          <div class="fin-row-d total-d"><span>Invoice Total</span><span id="fp_total">LKR 0.00</span></div>

          <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:12px">
            <span style="font-size:12px;opacity:.7">50% Advance</span>
            <span id="fp_advance" style="font-size:16px;font-weight:800">LKR 0.00</span>
          </div>

          <div style="height:16px"></div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin-bottom:16px">
            <i class="fas fa-chart-line"></i>&nbsp; Profit Summary
          </div>
          <div class="fin-row-d deduct-d"><span>Cost of Goods</span><span id="fp_cost">− LKR 0.00</span></div>
          <div class="fin-row-d deduct-d"><span>Commission</span><span id="fp_commission">− LKR 0.00</span></div>
          <div class="fin-row-d profit-d"><span>Net Profit</span><span id="fp_profit">LKR 0.00</span></div>
          <div class="fin-row-d profit-d"><span>Profit %</span><span id="fp_profitpct">0.00%</span></div>
        </div>
      </div>

    </div><!-- /grid -->

    <div style="padding:0 30px 20px;display:flex;gap:12px;justify-content:flex-end">
      <button class="btn-secondary" id="btn-cancel">Cancel</button>
      <button class="btn-primary"   id="btn-save"><i class="fas fa-save"></i> Save Order</button>
    </div>


  `);

  // ── Local state for this page ──
  let selectedItems = { ...cloneItems };

  document.getElementById('btn-back').onclick   = () => Router.navigate('orders/view');
  document.getElementById('btn-cancel').onclick = () => Router.navigate('orders/view');
  document.getElementById('btn-save').onclick   = saveOrder;

  // Wire up charge inputs
  ['c_discount','c_nbt','c_vat','c_transport','c_commission'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateFin);
  });

  // Wire up product search
  document.getElementById('productSearch').addEventListener('input', renderProductList);

  renderProductList();
  renderSelectedItems();
  updateFin();

  // ── Product toggle & qty (local, no window globals needed) ────────────────
  function toggleProduct(pid) {
    if (selectedItems[pid]) {
      delete selectedItems[pid];
    } else {
      const p = dd.products.find(x => x.id === pid);
      if (p) selectedItems[pid] = { product: p, qty: 1 };
    }
    renderProductList();
    renderSelectedItems();
    updateFin();
  }

  function updateQty(pid, val) {
    const q = Math.max(1, parseInt(val) || 1);
    if (selectedItems[pid]) {
      selectedItems[pid].qty = q;
      renderSelectedItems();
      updateFin();
    }
  }
  // ── Product list ──────────────────────────────────────────────────────────
  function renderProductList() {
    const q    = (document.getElementById('productSearch').value || '').toLowerCase();
    const list = document.getElementById('productsList');
    const filtered = dd.products.filter(p =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.productID||'').toLowerCase().includes(q) ||
      (p.brand||'').toLowerCase().includes(q) ||
      (p.model||'').toLowerCase().includes(q)
    );
    if (!filtered.length) {
      list.innerHTML = `<div style="padding:16px;text-align:center;font-size:12px;color:#aaa">No products found</div>`;
      return;
    }
    list.innerHTML = filtered.map(p => `
      <div class="product-row-d ${selectedItems[p.id] ? 'sel-d' : ''}" data-pid="${p.id}">
        <input type="checkbox" class="pcheck" ${selectedItems[p.id] ? 'checked' : ''}
          data-pid="${p.id}" id="pc_${p.id}"/>
        <div style="flex:1">
          <div class="pname-d">${esc(p.name)}</div>
          <div class="pmeta-d">${esc(p.productID)}${p.brand?' · '+esc(p.brand):''}${p.model?' · '+esc(p.model):''}</div>
        </div>
        <div class="pprice-d">
          ${fmtLKR(p.seling_price)}
          <small>Cost: ${fmtLKR(p.cost)}</small>
        </div>
        <input type="number" class="qty-d" min="1"
          value="${selectedItems[p.id] ? selectedItems[p.id].qty : 1}"
          id="qty_${p.id}"
          data-pid="${p.id}"
          ${selectedItems[p.id] ? '' : 'disabled'}/>
      </div>`).join('');

    // Bind events after each render
    list.querySelectorAll('.pcheck').forEach(cb => {
      cb.addEventListener('change', () => toggleProduct(parseInt(cb.dataset.pid)));
    });
    list.querySelectorAll('.qty-d').forEach(input => {
      input.addEventListener('change', () => updateQty(parseInt(input.dataset.pid), input.value));
      input.addEventListener('click',  e => e.stopPropagation());
    });
  }

  function renderSelectedItems() {
    const entries = Object.values(selectedItems);
    const wrap    = document.getElementById('selectedWrap');
    const tbody   = document.getElementById('selectedTbody');
    const stotal  = document.getElementById('subtotalCell');
    if (!entries.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    let total = 0;
    tbody.innerHTML = entries.map(({ product: p, qty }) => {
      const line = p.seling_price * qty;
      total += line;
      return `<tr>
        <td style="padding:8px 12px;font-size:12px">${esc(p.name)}</td>
        <td style="padding:8px 12px;font-size:12px;text-align:right">${fmtLKR(p.seling_price)}</td>
        <td style="padding:8px 12px;font-size:12px;text-align:center">${qty}</td>
        <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:700">${fmtLKR(line)}</td>
      </tr>`;
    }).join('');
    stotal.textContent = fmtLKR(total);
  }

  function updateFin() {
    const X    = Object.values(selectedItems).reduce((s, { product: p, qty }) => s + p.seling_price * qty, 0);
    const cost = Object.values(selectedItems).reduce((s, { product: p, qty }) => s + p.cost * qty, 0);
    const disc = parseFloat(document.getElementById('c_discount').value)  || 0;
    const nbt  = parseFloat(document.getElementById('c_nbt').value)       || 0;
    const vat  = parseFloat(document.getElementById('c_vat').value)       || 0;
    const tran = parseFloat(document.getElementById('c_transport').value) || 0;
    const comm = parseFloat(document.getElementById('c_commission').value)|| 0;

    const discAmt  = X * disc / 100;
    const discX    = X - discAmt;
    const nbtAmt   = X * nbt  / 100;
    const vatAmt   = X * vat  / 100;
    const commAmt  = discX * comm / 100;
    const total    = discX + nbtAmt + vatAmt + tran;
    const profit   = discX - cost - commAmt;
    const profitPct= discX > 0 ? (profit / discX) * 100 : 0;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('fp_subtotal',   fmtLKR(X));
    set('fp_discount',   `− ${fmtLKR(discAmt)}`);
    set('fp_nbt',        `+ ${fmtLKR(nbtAmt)}`);
    set('fp_vat',        `+ ${fmtLKR(vatAmt)}`);
    set('fp_transport',  `+ ${fmtLKR(tran)}`);
    set('fp_total',      fmtLKR(total));
    set('fp_advance',    fmtLKR(total / 2));
    set('fp_cost',       `− ${fmtLKR(cost)}`);
    set('fp_commission', `− ${fmtLKR(commAmt)}`);
    set('fp_profit',     fmtLKR(profit));
    set('fp_profitpct',  `${profitPct.toFixed(2)}%`);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function saveOrder() {
    const clientId = document.getElementById('c_client').value;
    const prepBy   = document.getElementById('c_preparedBy').value;
    const salesP   = document.getElementById('c_salesPerson').value;
    const items    = Object.values(selectedItems);

    if (!clientId)     return toast('Please select a client', true);
    if (!prepBy)       return toast('Please select "Prepared By" employee', true);
    if (!salesP)       return toast('Please select a Sales Person', true);
    if (!items.length) return toast('Add at least one product', true);

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

    const payload = {
      client_id:       parseInt(clientId),
      bank_account_id: parseInt(document.getElementById('c_bank').value) || null,
      prepared_by:     parseInt(prepBy),
      sales_person:    parseInt(salesP),
      discount_rate:   parseFloat(document.getElementById('c_discount').value)  || 0,
      transport:       parseFloat(document.getElementById('c_transport').value) || 0,
      commission_rate: parseFloat(document.getElementById('c_commission').value)|| 0,
      nbt_rate:        parseFloat(document.getElementById('c_nbt').value)       || 0,
      vat_rate:        parseFloat(document.getElementById('c_vat').value)       || 0,
      items: items.map(({ product: p, qty }) => ({ product_id: p.id, quantity: qty })),
    };

    const res = await window.db.orders.create(payload);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Order';

    if (!res.success) return toast('Error: ' + res.error, true);
    toast(`Order #${String(res.order_id).padStart(4,'0')} created successfully`);
    Router.navigate('orders/view');
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ORDER DETAIL (read-only)
// ═════════════════════════════════════════════════════════════════════════════
Router.register('orders/detail', async ({ id }) => {
  renderSidebar('orders');

  const res = await window.db.orders.get(Number(id));
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);
  const { order: o, items } = res;

  const discounted = o.subtotal_price - o.discount_amount;
  const advance    = o.total_price / 2;

  const voidBanner = o.status === 'void' ? `
    <div style="background:#fdecea;border-radius:10px;padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#d03c2e;font-weight:600;margin-bottom:20px">
      <i class="fas fa-ban"></i>
      Voided on ${fmtDate(o.voided_at)} — ${esc(o.void_reason || 'No reason given')}
    </div>` : '';

  setContent(`
    <div class="page-header">
      <div>
        <h1 class="page-title">Order #${String(o.id).padStart(4,'0')} &nbsp;${badgeHtml(o.status)}</h1>
        <p class="page-subtitle">Created ${fmtDate(o.created_at)}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-secondary" id="btn-back"><i class="fas fa-arrow-left"></i> Back</button>
        ${o.status !== 'void' ? `
          ${o.status === 'draft'     ? `<button class="btn-view"   id="btn-confirm"><i class="fas fa-check"></i> Confirm</button>` : ''}
          ${o.status === 'confirmed' ? `<button class="btn-view"   id="btn-paid"><i class="fas fa-dollar-sign"></i> Mark Paid</button>` : ''}
          <button class="btn-delete" id="btn-void"><i class="fas fa-ban"></i> Void</button>
          <button class="btn-primary" id="btn-invoice"><i class="fas fa-file-invoice"></i> Invoice</button>
        ` : `
          <button class="btn-edit" id="btn-recreate"><i class="fas fa-copy"></i> Re-create</button>
        `}
      </div>
    </div>

    <div style="padding:0 30px 40px;display:grid;grid-template-columns:1fr 1fr;gap:16px">

      ${voidBanner ? `<div style="grid-column:1/-1">${voidBanner}</div>` : ''}

      <!-- Client -->
      <div class="form-card" style="margin:0">
        <div class="order-section-title2">Client</div>
        <div class="di-row"><span class="di-l">Name</span><span class="di-v">${esc(o.client_name)}</span></div>
        <div class="di-row"><span class="di-l">Designation</span><span class="di-v">${esc(o.client_designation||'—')}</span></div>
        <div class="di-row"><span class="di-l">Contact</span><span class="di-v">${esc(o.client_contact||'—')}</span></div>
        <div class="di-row"><span class="di-l">Email</span><span class="di-v">${esc(o.client_email||'—')}</span></div>
        <div class="di-row"><span class="di-l">Address</span><span class="di-v">${esc(o.client_address||'—')}</span></div>
      </div>

      <!-- Team & Bank -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="form-card" style="margin:0">
          <div class="order-section-title2">Team</div>
          <div class="di-row"><span class="di-l">Prepared By</span><span class="di-v">${esc(o.prepared_by_name)}<br><small style="color:#aaa">${esc(o.prepared_by_contact||'')} ${esc(o.prepared_by_email||'')}</small></span></div>
          <div class="di-row"><span class="di-l">Sales Person</span><span class="di-v">${esc(o.sales_person_name)}<br><small style="color:#aaa">${esc(o.sales_person_contact||'')} ${esc(o.sales_person_email||'')}</small></span></div>
        </div>
        ${o.bank_name ? `
        <div class="form-card" style="margin:0">
          <div class="order-section-title2">Bank Account</div>
          <div class="di-row"><span class="di-l">Bank</span><span class="di-v">${esc(o.bank_name)}</span></div>
          <div class="di-row"><span class="di-l">Branch</span><span class="di-v">${esc(o.bank_branch||'—')}</span></div>
          <div class="di-row"><span class="di-l">Account Name</span><span class="di-v">${esc(o.bank_account_name||'—')}</span></div>
          <div class="di-row"><span class="di-l">Account No.</span><span class="di-v">${esc(o.bank_account_number||'—')}</span></div>
        </div>` : ''}
      </div>

      <!-- Items table — full width -->
      <div style="grid-column:1/-1">
        <div class="form-card" style="margin:0;max-width:100%">
          <div class="order-section-title2">Items Ordered</div>
          ${buildTable(
            ['Product', 'ID', 'Brand / Model', 'Unit Price', 'Qty', 'Line Total'],
            items,
            i => `<tr>
              <td><strong>${esc(i.product_name)}</strong></td>
              <td style="color:#aaa">${esc(i.product_id_no)}</td>
              <td>${esc(i.brand||'')} ${esc(i.model||'')}</td>
              <td>${fmtLKR(i.unit_price)}</td>
              <td>${i.quantity}</td>
              <td><strong>${fmtLKR(i.line_price)}</strong></td>
            </tr>`
          )}
        </div>
      </div>

      <!-- Price breakdown -->
      <div class="form-card" style="margin:0;max-width:100%">
        <div class="order-section-title2">Invoice Breakdown</div>
        ${fbRow('Subtotal',                     fmtLKR(o.subtotal_price),  '')}
        ${fbRow(`Discount (${o.discount_rate}%)`, `− ${fmtLKR(o.discount_amount)}`, 'color:#d03c2e')}
        ${fbRow('After Discount',               fmtLKR(discounted),        'font-weight:700')}
        ${fbRow(`NBT (${o.nbt_rate}%)`,          `+ ${fmtLKR(o.nbt_amount)}`, 'color:#185fa5')}
        ${fbRow(`VAT (${o.vat_rate}%)`,          `+ ${fmtLKR(o.vat_amount)}`, 'color:#185fa5')}
        ${fbRow('Transport',                    `+ ${fmtLKR(o.transport)}`,  'color:#185fa5')}
        <div style="border-top:2px solid #032e3f;margin:8px 0"></div>
        ${fbRow('Invoice Total',                fmtLKR(o.total_price),    'font-size:15px;font-weight:800;color:#032e3f')}
        ${fbRow('50% Advance Due',              fmtLKR(advance),           'color:#854f0b;font-weight:700')}
      </div>

      <!-- Profit breakdown -->
      <div class="form-card" style="margin:0;max-width:100%">
        <div class="order-section-title2">Profit Breakdown</div>
        ${fbRow('Revenue (after discount)',     fmtLKR(discounted),                    '')}
        ${fbRow('Cost of Goods',                `− ${fmtLKR(o.subtotal_cost)}`,        'color:#d03c2e')}
        ${fbRow(`Commission (${o.commission_rate}%)`, `− ${fmtLKR(o.commission_amount)}`, 'color:#d03c2e')}
        <div style="border-top:2px solid #032e3f;margin:8px 0"></div>
        ${fbRow('Net Profit',   fmtLKR(o.total_profit), `font-size:15px;font-weight:800;color:${o.total_profit>=0?'#0f6e56':'#d03c2e'}`)}
        ${fbRow('Profit %',     `${(o.profit_pct||0).toFixed(2)}%`, `font-weight:700;color:${o.profit_pct>=0?'#0f6e56':'#d03c2e'}`)}
      </div>

    </div>


  `);

  document.getElementById('btn-back').onclick = () => Router.navigate('orders/view');
  document.getElementById('btn-invoice')  ?.addEventListener('click', () => openInvoice(o.id, o, items));
  document.getElementById('btn-confirm')  ?.addEventListener('click', async () => {
    const r = await window.db.orders.setStatus({ orderId: o.id, status: 'confirmed' });
    if (r.success) { toast('Order confirmed'); Router.navigate('orders/detail', { id: o.id }); }
    else toast('Error: ' + r.error, true);
  });
  document.getElementById('btn-paid')     ?.addEventListener('click', async () => {
    const r = await window.db.orders.setStatus({ orderId: o.id, status: 'paid' });
    if (r.success) { toast('Order marked as paid'); Router.navigate('orders/detail', { id: o.id }); }
    else toast('Error: ' + r.error, true);
  });
  document.getElementById('btn-void')     ?.addEventListener('click', () => Router.navigate('orders/void', { id: o.id }));
  document.getElementById('btn-recreate') ?.addEventListener('click', () => Router.navigate('orders/create', { cloneFrom: o.id }));
});

// ═════════════════════════════════════════════════════════════════════════════
// VOID PAGE
// ═════════════════════════════════════════════════════════════════════════════
Router.register('orders/void', async ({ id }) => {
  renderSidebar('orders');

  setContent(`
    <div class="page-header">
      <h1 class="page-title" style="color:#d03c2e"><i class="fas fa-ban"></i> Void Order #${String(id).padStart(4,'0')}</h1>
    </div>
    <div class="form-card">
      <p style="font-size:13px;color:#555;margin-bottom:18px">
        This action cannot be undone. The order will be marked as <strong>void</strong>.
        You can re-create it as a new order afterward.
      </p>
      <div class="form-group">
        <label>Reason for voiding</label>
        <textarea id="voidReason" rows="4" placeholder="Explain why this order is being voided…"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn-secondary" id="btn-back">Cancel</button>
        <button class="btn-delete"    id="btn-confirm-void"><i class="fas fa-ban"></i> Void Order</button>
      </div>
    </div>
  `);

  document.getElementById('btn-back').onclick = () => Router.navigate('orders/detail', { id });
  document.getElementById('btn-confirm-void').onclick = async () => {
    const reason = document.getElementById('voidReason').value.trim();
    const r      = await window.db.orders.void({ orderId: Number(id), reason });
    if (r.success) { toast('Order voided'); Router.navigate('orders/view'); }
    else toast('Error: ' + r.error, true);
  };
});

// ═════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS (orders-specific, scoped to this file)
// ═════════════════════════════════════════════════════════════════════════════
function fmtLKR(n) {
  return 'LKR ' + (Number(n) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function badgeHtml(status) {
  const map = {
    draft:     ['badge-draft',    'fa-circle',       'Draft'],
    confirmed: ['badge-confirmed','fa-check-circle', 'Confirmed'],
    paid:      ['badge-paid',     'fa-check-double', 'Paid'],
    void:      ['badge-void',     'fa-ban',          'Void'],
  };
  const [cls, icon, label] = map[status] || ['badge-draft', 'fa-circle', status];
  return `<span class="badge ${cls}"><i class="fas ${icon}"></i> ${label}</span>`;
}

function fbRow(label, val, style = '') {
  return `<div class="fb-row"><span>${label}</span><span style="${style}">${val}</span></div>`;
}

async function openInvoice(orderId, orderData, itemsData) {
  // Fetch if not already provided (e.g. called from list view)
  let o = orderData, items = itemsData;
  if (!o) {
    const res = await window.db.orders.get(orderId);
    if (!res.success) return toast('Error loading order: ' + res.error, true);
    o = res.order; items = res.items;
  }
  const html = buildInvoiceHtml(o, items);  // from invoice-builder.js
  const win  = window.open('', '_blank', 'width=940,height=750');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 700);
  // PDF via Electron
  if (window.electronAPI?.savePdf) {
    await window.electronAPI.savePdf(orderId, html);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// window.db.orders BRIDGE (add to your preload / db-bridge file)
// ═════════════════════════════════════════════════════════════════════════════
/*
  In the same place you define window.db.clients, add:

  window.db.orders = {
    list:       ()       => ipcRenderer.invoke('orders:list'),
    get:        (id)     => ipcRenderer.invoke('orders:get', id),
    create:     (payload)=> ipcRenderer.invoke('orders:create', payload),
    setStatus:  (args)   => ipcRenderer.invoke('orders:setStatus', args),
    void:       (args)   => ipcRenderer.invoke('orders:void', args),
    dropdowns:  ()       => ipcRenderer.invoke('orders:dropdowns'),
  };
*/