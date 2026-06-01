Router.register('recievers', () => {
  renderSidebar('recievers');
  setContent(buildDashboard('Receivers', 'Keep track of receiving staff', [
    { page: 'recievers/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all receivers' },
    { page: 'recievers/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new receiver' },
  ]));
});

Router.register('recievers/view', async () => {
  renderSidebar('recievers');
  const res = await window.db.recievers.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Receiver List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Receiver</button>
    </div>
    ${buildTable(
      ['ID', 'Name', 'Hospital', 'Contact Info', 'Actions'],
      res.data,
      r => `<tr>
        <td>${r.id}</td>
        <td>${esc(r.reciever_name)}</td>
        <td>${esc(r.hospital_name)}</td>
        <td>${esc(r.contact_info)}</td>
        <td class="action-cell">
          <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
          <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
        </td>
      </tr>`
    )}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('recievers/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('recievers/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this receiver?')) return;
    const r = await window.db.recievers.delete(Number(a.dataset.id));
    if (r.success) { toast('Receiver deleted'); Router.navigate('recievers/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('recievers/insert', async () => {
  renderSidebar('recievers');
  const hospRes = await window.db.hospitals.getAll();
  if (!hospRes.success) return setContent('<p>Could not load hospitals.</p>');
  const hospOptions = hospRes.data.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('');

  setContent(`
    <div class="page-header"><h1 class="page-title">Add Receiver</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" placeholder="Receiver Name" required></div>
      <div class="form-group"><label>Hospital</label><select id="hospital">${hospOptions}</select></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" placeholder="7XXXXXXXX" minlength="9" maxlength="9" required></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Receiver</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('recievers/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.recievers.insert({ name: formVal('name'), hospital: Number(formVal('hospital')), contact: formVal('contact') });
    if (r.success) { toast('Receiver added'); Router.navigate('recievers/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('recievers/edit', async ({ id }) => {
  renderSidebar('recievers');
  const [recRes, hospRes] = await Promise.all([
    window.db.recievers.get(Number(id)),
    window.db.hospitals.getAll(),
  ]);
  if (!recRes.success || !recRes.data) return setContent('<p>Receiver not found.</p>');
  const rec = recRes.data;
  const hospOptions = hospRes.data.map(h =>
    `<option value="${h.id}" ${h.id == rec.hospital_id ? 'selected' : ''}>${esc(h.name)}</option>`
  ).join('');

  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Receiver</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" value="${esc(rec.reciever_name)}" required></div>
      <div class="form-group"><label>Hospital</label><select id="hospital">${hospOptions}</select></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" value="${esc(rec.contact_info)}" minlength="9" maxlength="9" required></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Receiver</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('recievers/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.recievers.update({ id: Number(id), name: formVal('name'), hospital: Number(formVal('hospital')), contact: formVal('contact') });
    if (r.success) { toast('Receiver updated'); Router.navigate('recievers/view'); }
    else toast('Error: ' + r.error, true);
  };
});
