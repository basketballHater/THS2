Router.register('employees', () => {
  renderSidebar('employees');
  setContent(buildDashboard('Employees', 'Add or edit Employee Details', [
    { page: 'employees/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all employees' },
    { page: 'employees/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new employee' },
  ]));
});

Router.register('employees/view', async () => {
  renderSidebar('employees');
  const res = await window.db.employees.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Employee List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Employee</button>
    </div>
    ${buildTable(
      ['ID', 'Name', 'Contact Info', 'Actions'],
      res.data,
      r => `<tr>
        <td>${r.id}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.contact_info)}</td>
        <td class="action-cell">
          <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
          <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
        </td>
      </tr>`
    )}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('employees/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('employees/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this employee?')) return;
    const r = await window.db.employees.delete(Number(a.dataset.id));
    if (r.success) { toast('Employee deleted'); Router.navigate('employees/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('employees/insert', () => {
  renderSidebar('employees');
  setContent(`
    <div class="page-header"><h1 class="page-title">Add Employee</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" placeholder="Employee Name" required></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" placeholder="7XXXXXXXX" minlength="9" maxlength="9" required></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Employee</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('employees/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.employees.insert({ name: formVal('name'), contact: formVal('contact') });
    if (r.success) { toast('Employee added'); Router.navigate('employees/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('employees/edit', async ({ id }) => {
  renderSidebar('employees');
  const res = await window.db.employees.get(Number(id));
  if (!res.success || !res.data) return setContent('<p>Employee not found.</p>');
  const emp = res.data;

  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Employee</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Name</label><input id="name" value="${esc(emp.name)}" required></div>
      <div class="form-group"><label>Contact Info</label>
        <div class="input-prefix"><span>+94</span><input id="contact" value="${esc(emp.contact_info)}" minlength="9" maxlength="9" required></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Update Employee</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('employees/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.employees.update({ id: Number(id), name: formVal('name'), contact: formVal('contact') });
    if (r.success) { toast('Employee updated'); Router.navigate('employees/view'); }
    else toast('Error: ' + r.error, true);
  };
});
