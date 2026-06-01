Router.register('hospitals', () => {
  renderSidebar('hospitals');
  setContent(buildDashboard('Hospitals', 'Manage hospital records and inventory', [
    { page: 'hospitals/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all hospital records' },
    { page: 'hospitals/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new hospital entry' },
  ]));
});

Router.register('hospitals/view', async () => {
  renderSidebar('hospitals');
  const res = await window.db.hospitals.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);
  const rows = res.data;

  const tableHtml = buildTable(
    ['ID', 'Name', 'Address', 'Contact Info', 'Actions'],
    rows,
    r => `<tr>
      <td>${r.id}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.address || '')}</td>
      <td>${esc(r.contact_info || '')}</td>
      <td class="action-cell">
        <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
        <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
      </td>
    </tr>`
  );

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Hospital List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Hospital</button>
    </div>
    ${tableHtml}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('hospitals/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('hospitals/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this hospital? All related orders and stock will also be removed.')) return;
    const r = await window.db.hospitals.delete(Number(a.dataset.id));
    if (r.success) { toast('Hospital deleted'); Router.navigate('hospitals/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('hospitals/insert', () => {
  renderSidebar('hospitals');
  setContent(`
    <div class="page-header"><h1 class="page-title">Add Hospital</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" placeholder="Hospital Name" required></div>
      <div class="form-group"><label>Address</label><textarea id="address" rows="3" placeholder="Address"></textarea></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" placeholder="7XXXXXXXX" minlength="9" maxlength="9"></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Hospital</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('hospitals/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.hospitals.insert({ name: formVal('name'), address: formVal('address'), contact: formVal('contact') });
    if (r.success) { toast('Hospital added'); Router.navigate('hospitals/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('hospitals/edit', async ({ id }) => {
  renderSidebar('hospitals');
  const res = await window.db.hospitals.get(Number(id));
  if (!res.success || !res.data) return setContent('<p>Hospital not found.</p>');
  const h = res.data;
  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Hospital</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" value="${esc(h.name)}" required></div>
      <div class="form-group"><label>Address</label><textarea id="address" rows="3">${esc(h.address || '')}</textarea></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" value="${esc(h.contact_info || '')}" minlength="9" maxlength="9"></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Hospital</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('hospitals/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.hospitals.update({ id: Number(id), name: formVal('name'), address: formVal('address'), contact: formVal('contact') });
    if (r.success) { toast('Hospital updated'); Router.navigate('hospitals/view'); }
    else toast('Error: ' + r.error, true);
  };
});
