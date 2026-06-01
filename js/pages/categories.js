Router.register('categories', () => {
  renderSidebar('categories');
  setContent(buildDashboard('Categories', 'Manage all Item Categories', [
    { page: 'categories/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all categories' },
    { page: 'categories/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new category' },
  ]));
});

Router.register('categories/view', async () => {
  renderSidebar('categories');
  const res = await window.db.categories.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Category List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Category</button>
    </div>
    ${buildTable(
      ['ID', 'Name', 'Actions'],
      res.data,
      r => `<tr>
        <td>${r.id}</td>
        <td>${esc(r.name)}</td>
        <td class="action-cell">
          <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
          <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
        </td>
      </tr>`
    )}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('categories/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('categories/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this category? Items in this category may also be affected.')) return;
    const r = await window.db.categories.delete(Number(a.dataset.id));
    if (r.success) { toast('Category deleted'); Router.navigate('categories/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('categories/insert', () => {
  renderSidebar('categories');
  setContent(`
    <div class="page-header"><h1 class="page-title">Add Category</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Category Name</label><input id="name" placeholder="e.g. petFood" required></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Category</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('categories/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.categories.insert({ name: formVal('name') });
    if (r.success) { toast('Category added'); Router.navigate('categories/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('categories/edit', async ({ id }) => {
  renderSidebar('categories');
  const res = await window.db.categories.get(Number(id));
  if (!res.success || !res.data) return setContent('<p>Category not found.</p>');
  const cat = res.data;

  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Category</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Category Name</label><input id="name" value="${esc(cat.name)}" required></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Category</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('categories/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.categories.update({ id: Number(id), name: formVal('name') });
    if (r.success) { toast('Category updated'); Router.navigate('categories/view'); }
    else toast('Error: ' + r.error, true);
  };
});
