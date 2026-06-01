Router.register('items', () => {
  renderSidebar('items');
  setContent(buildDashboard('Items', 'Add and Edit Products', [
    { page: 'items/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all items' },
    { page: 'items/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new item' },
  ]));
});

Router.register('items/view', async () => {
  renderSidebar('items');
  const res = await window.db.items.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Item List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Item</button>
    </div>
    ${buildTable(
      ['ID', 'Name', 'Category', 'Total Stock', 'Reserved', 'Unit Price (Rs.)', 'Actions'],
      res.data,
      r => `<tr>
        <td>${r.id}</td>
        <td>${esc(r.item_name)}</td>
        <td>${esc(r.category_name)}</td>
        <td>${r.total_stock}</td>
        <td>${r.reserved_stock}</td>
        <td>Rs. ${Number(r.unit_price).toLocaleString()}</td>
        <td class="action-cell">
          <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
          <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
        </td>
      </tr>`
    )}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('items/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('items/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this item?')) return;
    const r = await window.db.items.delete(Number(a.dataset.id));
    if (r.success) { toast('Item deleted'); Router.navigate('items/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('items/insert', async () => {
  renderSidebar('items');
  const catRes = await window.db.categories.getAll();
  if (!catRes.success) return setContent('<p>Could not load categories.</p>');
  const catOptions = catRes.data.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

  setContent(`
    <div class="page-header"><h1 class="page-title">Add Item</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Item Name</label><input id="name" placeholder="Item Name" required></div>
      <div class="form-group"><label>Category</label>
        <select id="category">${catOptions}</select>
      </div>
      <div class="form-group"><label>Total Stock</label><input id="totalStock" type="number" min="0" placeholder="0" required></div>
      <div class="form-group"><label>Unit Price (Rs.)</label><input id="price" type="number" min="0" placeholder="0" required></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Item</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('items/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.items.insert({
      name: formVal('name'),
      category: Number(formVal('category')),
      unitPrice: Number(formVal('price')),
      totalStock: Number(formVal('totalStock')),
    });
    if (r.success) { toast('Item added'); Router.navigate('items/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('items/edit', async ({ id }) => {
  renderSidebar('items');
  const [itemRes, catRes] = await Promise.all([
    window.db.items.get(Number(id)),
    window.db.categories.getAll(),
  ]);
  if (!itemRes.success || !itemRes.data) return setContent('<p>Item not found.</p>');
  const item = itemRes.data;
  const catOptions = catRes.data.map(c =>
    `<option value="${c.id}" ${c.id == item.category_id ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('');

  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Item</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Item Name</label><input id="name" value="${esc(item.item_name)}" required></div>
      <div class="form-group"><label>Category</label><select id="category">${catOptions}</select></div>
      <div class="form-group"><label>Total Stock</label><input id="totalStock" type="number" min="0" value="${item.total_stock}" required></div>
      <div class="form-group"><label>Reserved Stock</label><input id="reservedStock" type="number" min="0" value="${item.reserved_stock}"></div>
      <div class="form-group"><label>Unit Price (Rs.)</label><input id="price" type="number" min="0" value="${item.unit_price}" required></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Item</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('items/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.items.update({
      id: Number(id),
      name: formVal('name'),
      category: Number(formVal('category')),
      unitPrice: Number(formVal('price')),
      totalStock: Number(formVal('totalStock')),
      reservedStock: Number(formVal('reservedStock')),
    });
    if (r.success) { toast('Item updated'); Router.navigate('items/view'); }
    else toast('Error: ' + r.error, true);
  };
});
