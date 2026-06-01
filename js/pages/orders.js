Router.register('orders', () => {
  renderSidebar('orders');
  setContent(buildDashboard('Orders', 'Manage all orders', [
    { page: 'orders/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all orders' },
    { page: 'orders/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Create a new order' },
  ]));
});

Router.register('orders/view', async () => {
  renderSidebar('orders');
  const res = await window.db.orders.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  const rows = res.data.map(r => {
    const afterDiscount = (r.total_amount * (100 - r.discount) / 100).toFixed(2);
    const statusClass = r.order_status === 'active' ? 'badge-active' : 'badge-inactive';
    const paidClass   = r.payment_status === 'paid'  ? 'badge-active' : 'badge-pending';
    return `<tr>
      <td>${r.id}</td>
      <td>${esc(r.hospital_name)}</td>
      <td>${esc(r.employee_name)}</td>
      <td>${esc(r.reciever_name)}</td>
      <td>${esc(r.order_date ? r.order_date.substring(0,16) : '')}</td>
      <td><span class="badge ${statusClass}">${esc(r.order_status)}</span></td>
      <td>${esc(r.payment_method)}</td>
      <td><span class="badge ${paidClass}">${esc(r.payment_status)}</span></td>
      <td>${r.discount}%</td>
      <td>Rs. ${Number(r.total_amount).toLocaleString()}</td>
      <td>Rs. ${Number(afterDiscount).toLocaleString()}</td>
      <td class="action-cell">
        <a href="#" class="btn-view"   data-id="${r.id}"><i class="fas fa-eye"></i> Items</a>
        <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
        <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
      </td>
    </tr>`;
  });

  const tableHtml = `<table class="wide-table">
    <thead><tr>
      <th>ID</th><th>Hospital</th><th>Employee</th><th>Receiver</th>
      <th>Date</th><th>Status</th><th>Payment</th><th>Pay Status</th>
      <th>Discount</th><th>Total</th><th>After Discount</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.length ? rows.join('') : '<tr><td colspan="12" style="text-align:center;color:#999;padding:24px">No orders found.</td></tr>'}</tbody>
  </table>`;

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Order List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> New Order</button>
    </div>
    <div class="table-scroll">${tableHtml}</div>`);

  document.getElementById('btn-add').onclick = () => Router.navigate('orders/insert');
  document.querySelectorAll('.btn-view').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('orders/items', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('orders/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this order and all its items?')) return;
    const r = await window.db.orders.delete(Number(a.dataset.id));
    if (r.success) { toast('Order deleted'); Router.navigate('orders/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('orders/items', async ({ id }) => {
  renderSidebar('orders');
  const res = await window.db.orders.getItems(Number(id));
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  let grandTotal = 0;
  const rows = res.data.map(r => {
    const lineTotal = r.unit_price * r.quantity;
    grandTotal += lineTotal;
    return `<tr>
      <td>${r.item_id}</td>
      <td>${esc(r.item_name)}</td>
      <td>Rs. ${Number(r.unit_price).toLocaleString()}</td>
      <td>${r.quantity}</td>
      <td>Rs. ${Number(lineTotal).toLocaleString()}</td>
    </tr>`;
  });

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Order #${id} — Items</h1>
      <button class="btn-secondary" id="btn-back"><i class="fas fa-arrow-left"></i> Back to Orders</button>
    </div>
    <table>
      <thead><tr><th>Item ID</th><th>Item Name</th><th>Unit Price</th><th>Qty</th><th>Line Total</th></tr></thead>
      <tbody>${rows.join('') || '<tr><td colspan="5" style="text-align:center;color:#999;padding:24px">No items on this order.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;font-weight:600">Grand Total</td><td style="font-weight:600">Rs. ${Number(grandTotal).toLocaleString()}</td></tr></tfoot>
    </table>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('orders/view');
});

// ── Shared form builder for insert/edit ──────────────────────────────────────
async function renderOrderForm({ order = null, selectedItems = [], selectedQtys = {} } = {}) {
  const [hospRes, empRes, recRes, itemRes] = await Promise.all([
    window.db.hospitals.getAll(),
    window.db.employees.getAll(),
    window.db.recievers.getAll(),
    window.db.items.getAll(),
  ]);

  const selHosp = hospRes.data.map(h =>
    `<option value="${h.id}" ${order && h.id == order.hospital_id ? 'selected' : ''}>${esc(h.name)}</option>`).join('');
  const selEmp = empRes.data.map(e =>
    `<option value="${e.id}" ${order && e.id == order.employee_id ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
  const selRec = recRes.data.map(r =>
    `<option value="${r.id}" ${order && r.id == order.reciever_id ? 'selected' : ''}>${esc(r.reciever_name)}</option>`).join('');

  const itemRows = itemRes.data.map(item => {
    const checked = selectedItems.includes(item.id) ? 'checked' : '';
    const qty = selectedQtys[item.id] || 1;
    return `<tr>
      <td>
        <label class="item-check-label">
          <input type="checkbox" class="item-cb" data-id="${item.id}" data-price="${item.unit_price}" ${checked}>
          ${esc(item.item_name)}
          <span class="item-price-tag">Rs. ${Number(item.unit_price).toLocaleString()}</span>
        </label>
      </td>
      <td><input type="number" class="item-qty" data-id="${item.id}" value="${qty}" min="1" style="width:80px"></td>
    </tr>`;
  }).join('');

  const orderStatusSel = (val) => ['active','inactive'].map(s =>
    `<option value="${s}" ${order && order.order_status === s ? 'selected' : (s === 'active' && !order ? 'selected' : '')}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('');
  const payMethodSel = (val) => ['cash','cheque','online','credit'].map(m =>
    `<option value="${m}" ${order && order.payment_method === m ? 'selected' : ''}>${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join('');
  const payStatusSel = (val) => [['on placement','On Placement'],['on delivery','On Delivery']].map(([v,l]) =>
    `<option value="${v}" ${order && order.payment_status === v ? 'selected' : ''}>${l}</option>`).join('');

  return `
    <div class="form-group"><label>Hospital</label><select id="hospital">${selHosp}</select></div>
    <div class="form-group"><label>Employee</label><select id="employee">${selEmp}</select></div>
    <div class="form-group"><label>Receiver</label><select id="reciever">${selRec}</select></div>

    <div class="form-group">
      <label>Items <small style="color:#888;font-weight:400">(check to include, set quantity)</small></label>
      <table class="item-select-table">
        <thead><tr><th>Item</th><th>Qty</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Order Status</label><select id="orderStatus">${orderStatusSel()}</select></div>
      <div class="form-group"><label>Payment Method</label><select id="paymentMethod">${payMethodSel()}</select></div>
      <div class="form-group"><label>Payment Status</label><select id="paymentStatus">${payStatusSel()}</select></div>
      <div class="form-group"><label>Discount (%)</label><input id="discount" type="number" min="0" max="100" value="${order ? order.discount : 0}"></div>
    </div>

    <div class="order-total-preview" id="total-preview">
      Estimated Total: <strong id="total-val">Rs. 0</strong>
    </div>`;
}

function getSelectedItems() {
  const items = [];
  document.querySelectorAll('.item-cb:checked').forEach(cb => {
    const id = Number(cb.dataset.id);
    const qtyEl = document.querySelector(`.item-qty[data-id="${id}"]`);
    items.push({ id, qty: Number(qtyEl?.value || 1) });
  });
  return items;
}

function attachTotalPreview() {
  const update = () => {
    let total = 0;
    document.querySelectorAll('.item-cb:checked').forEach(cb => {
      const id = cb.dataset.id;
      const qty = Number(document.querySelector(`.item-qty[data-id="${id}"]`)?.value || 1);
      total += Number(cb.dataset.price) * qty;
    });
    const discount = Number(document.getElementById('discount')?.value || 0);
    const after = total * (100 - discount) / 100;
    document.getElementById('total-val').textContent =
      `Rs. ${Number(total).toLocaleString()} → Rs. ${Number(after.toFixed(2)).toLocaleString()} after ${discount}% discount`;
  };
  document.querySelectorAll('.item-cb, .item-qty, #discount').forEach(el => el.addEventListener('input', update));
  update();
}

Router.register('orders/insert', async () => {
  renderSidebar('orders');
  const formHtml = await renderOrderForm();
  setContent(`
    <div class="page-header"><h1 class="page-title">New Order</h1></div>
    <form class="form-card" id="form">
      ${formHtml}
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Create Order</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('orders/view');
  attachTotalPreview();
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const items = getSelectedItems();
    if (items.length === 0) return toast('Please select at least one item.', true);
    const r = await window.db.orders.insert({
      hospital: Number(formVal('hospital')),
      employee: Number(formVal('employee')),
      reciever: Number(formVal('reciever')),
      orderStatus: formVal('orderStatus'),
      paymentMethod: formVal('paymentMethod'),
      paymentStatus: formVal('paymentStatus'),
      discount: Number(formVal('discount')),
      items,
    });
    if (r.success) { toast('Order created'); Router.navigate('orders/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('orders/edit', async ({ id }) => {
  renderSidebar('orders');
  const [orderRes, selRes] = await Promise.all([
    window.db.orders.get(Number(id)),
    window.db.orders.getSelectedItems(Number(id)),
  ]);
  if (!orderRes.success || !orderRes.data) return setContent('<p>Order not found.</p>');

  const selectedItems = selRes.data.map(r => r.item_id);
  const selectedQtys = {};
  selRes.data.forEach(r => { selectedQtys[r.item_id] = r.quantity; });

  const formHtml = await renderOrderForm({ order: orderRes.data, selectedItems, selectedQtys });
  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Order #${id}</h1></div>
    <form class="form-card" id="form">
      ${formHtml}
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Order</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('orders/view');
  attachTotalPreview();
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const items = getSelectedItems();
    if (items.length === 0) return toast('Please select at least one item.', true);
    const r = await window.db.orders.update({
      id: Number(id),
      hospital: Number(formVal('hospital')),
      employee: Number(formVal('employee')),
      reciever: Number(formVal('reciever')),
      orderStatus: formVal('orderStatus'),
      paymentMethod: formVal('paymentMethod'),
      paymentStatus: formVal('paymentStatus'),
      discount: Number(formVal('discount')),
      items,
    });
    if (r.success) { toast('Order updated'); Router.navigate('orders/view'); }
    else toast('Error: ' + r.error, true);
  };
});
