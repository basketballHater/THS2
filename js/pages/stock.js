Router.register('stock', () => {
  renderSidebar('stock');
  setContent(buildDashboard('Stock', 'Manage hospital stock levels', [
    { page: 'stock/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all stock records' },
    { page: 'stock/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new stock entry' },
  ]));
});

Router.register('stock/view', async () => {
  renderSidebar('stock');
  const res = await window.db.stock.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Stock List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Stock</button>
    </div>
    ${buildTable(
      ['Hospital', 'Item', 'Quantity', 'Last Updated', 'Actions'],
      res.data,
      r => `<tr>
        <td>${esc(r.hospital_name)}</td>
        <td>${esc(r.item_name)}</td>
        <td>${r.quantity}</td>
        <td>${r.last_updated ? esc(r.last_updated.substring(0,16)) : '-'}</td>
        <td class="action-cell">
          <a href="#" class="btn-edit"   data-hid="${r.hospital_id}" data-iid="${r.item_id}"><i class="fas fa-pen"></i> Edit</a>
          <a href="#" class="btn-delete" data-hid="${r.hospital_id}" data-iid="${r.item_id}"><i class="fas fa-trash"></i> Delete</a>
        </td>
      </tr>`
    )}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('stock/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault();
    Router.navigate('stock/edit', { hospitalId: a.dataset.hid, itemId: a.dataset.iid });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this stock entry?')) return;
    const r = await window.db.stock.delete(Number(a.dataset.hid), Number(a.dataset.iid));
    if (r.success) { toast('Stock entry deleted'); Router.navigate('stock/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('stock/insert', async () => {
  renderSidebar('stock');
  const [hospRes, itemRes] = await Promise.all([
    window.db.hospitals.getAll(),
    window.db.items.getAll(),
  ]);
  const hospOptions = hospRes.data.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('');
  const itemOptions = itemRes.data.map(i => `<option value="${i.id}">${esc(i.item_name)}</option>`).join('');

  setContent(`
    <div class="page-header"><h1 class="page-title">Add Stock</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Hospital</label><select id="hospital">${hospOptions}</select></div>
      <div class="form-group"><label>Item</label><select id="item">${itemOptions}</select></div>
      <div class="form-group"><label>Quantity</label><input id="quantity" type="number" min="0" placeholder="0" required></div>
      <p class="form-hint">Note: If a stock entry already exists for this hospital/item combination, the quantity will be added to the existing amount.</p>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Stock</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('stock/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.stock.insert({
      hospital: Number(formVal('hospital')),
      item: Number(formVal('item')),
      quantity: Number(formVal('quantity')),
    });
    if (r.success) { toast('Stock added'); Router.navigate('stock/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('stock/edit', async ({ hospitalId, itemId }) => {
  renderSidebar('stock');
  const [stockRes, hospRes, itemRes] = await Promise.all([
    window.db.stock.get(Number(hospitalId), Number(itemId)),
    window.db.hospitals.getAll(),
    window.db.items.getAll(),
  ]);
  if (!stockRes.success || !stockRes.data) return setContent('<p>Stock entry not found.</p>');
  const s = stockRes.data;

  const hospOptions = hospRes.data.map(h =>
    `<option value="${h.id}" ${h.id == s.hospital_id ? 'selected' : ''}>${esc(h.name)}</option>`).join('');
  const itemOptions = itemRes.data.map(i =>
    `<option value="${i.id}" ${i.id == s.item_id ? 'selected' : ''}>${esc(i.item_name)}</option>`).join('');

  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Stock</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Hospital</label><select id="hospital" disabled>${hospOptions}</select></div>
      <div class="form-group"><label>Item</label><select id="item" disabled>${itemOptions}</select></div>
      <div class="form-group"><label>Quantity</label><input id="quantity" type="number" min="0" value="${s.quantity}" required></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Stock</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('stock/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.stock.update({
      hospitalId: Number(hospitalId),
      itemId: Number(itemId),
      quantity: Number(formVal('quantity')),
    });
    if (r.success) { toast('Stock updated'); Router.navigate('stock/view'); }
    else toast('Error: ' + r.error, true);
  };
});
