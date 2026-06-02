Router.register('clients', () => {
  renderSidebar('clients');
  setContent(buildDashboard('Clients', 'Add or edit Client Details', [
    { page: 'clients/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all clients' },
    { page: 'clients/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new client' },
  ]));
});

Router.register('clients/view', async () => {
  renderSidebar('clients');
  const res = await window.db.clients.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Client List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Client</button>
    </div>
    ${buildTable(
      ['ID', 'Name', 'Designation', 'Address', 'Contact Info', 'Email', 'Actions'],
      res.data,
      r => `<tr>
        <td>${r.id}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.designation)}</td>
        <td>${esc(r.address)}</td>
        <td>${esc(r.contact)}</td>
        <td>${esc(r.email)}</td>
        <td class="action-cell">
          <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
          <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
        </td>
      </tr>`
    )}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('clients/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('clients/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this client?')) return;
    const r = await window.db.clients.delete(Number(a.dataset.id));
    if (r.success) { toast('Client deleted'); Router.navigate('clients/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('clients/insert', () => {
  renderSidebar('clients');
  setContent(`
    <div class="page-header"><h1 class="page-title">Add Client</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" placeholder="Client Name" required></div>
      <div class="form-group"><label>Designation</label><input id="designation" placeholder="Client Designation" required></div>
      <div class="form-group"><label>Address</label><textarea id="address" placeholder="Client Address" required></textarea></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" placeholder="7XXXXXXXX" minlength="9" maxlength="9" required></div>
      </div>
      <div class="form-group"><label>Email</label><input type="email" id="email" placeholder="Client Email" required></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Client</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('clients/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.clients.insert({ 
      name: formVal('name'), 
      designation: formVal('designation'), 
      address: formVal('address'), 
      contact: formVal('contact'), 
      email: formVal('email')});
    if (r.success) { toast('Client added'); Router.navigate('clients/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('clients/edit', async ({ id }) => {
  renderSidebar('clients');
  const res = await window.db.clients.get(Number(id));
  if (!res.success || !res.data) return setContent('<p>Client not found.</p>');
  const emp = res.data;

  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Client</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" placeholder="Client Name" value="${esc(emp.name)}" required></div>
      <div class="form-group"><label>Designation</label><input id="designation" placeholder="Client Designation" value="${esc(emp.designation)}" required></div>
      <div class="form-group"><label>Address</label><textarea id="address" placeholder="Client Address" required>${esc(emp.address)}</textarea></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" placeholder="7XXXXXXXX" minlength="9" maxlength="9" value="${esc(emp.contact)}" required></div>
      </div>
      <div class="form-group"><label>Email</label><input type="email" id="email" placeholder="Client Email" value="${esc(emp.email)}" required></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Client</button>
      </div>
    </form>
    `);

  document.getElementById('btn-back').onclick = () => Router.navigate('clients/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.clients.update({ 
      id: Number(id),
      name: formVal('name'), 
      designation: formVal('designation'), 
      address: formVal('address'), 
      contact: formVal('contact'), 
      email: formVal('email')});
      
    if (r.success) { toast('Client updated'); Router.navigate('clients/view'); }
    else toast('Error: ' + r.error, true);
  };
});
