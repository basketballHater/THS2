Router.register('bankAccount', () => {
  renderSidebar('bankAccount');
  setContent(buildDashboard('bankAccount', 'Add or edit Bank Account Details', [
    { page: 'bankAccount/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all bank accounts' },
    { page: 'bankAccount/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Insert', desc: 'Add a new bank account' },
  ]));
});

Router.register('bankAccount/view', async () => {
  renderSidebar('bankAccount');
  const res = await window.db.bankAccount.getAll();
  if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

  setContent(`
    <div class="page-header">
      <h1 class="page-title">Bank Account List</h1>
      <button class="btn-primary" id="btn-add"><i class="fas fa-plus"></i> Add Bank Account</button>
    </div>
    ${buildTable(
      ['ID', 'Bank', 'Account Name', 'Account Number', 'Branch', 'Actions'],
      res.data,
      r => `<tr>
        <td>${r.id}</td>
        <td>${esc(r.bank)}</td>
        <td>${esc(r.accountName)}</td>
        <td>${esc(r.accountNumber)}</td>
        <td>${esc(r.branch)}</td>
        <td class="action-cell">
          <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
          <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
        </td>
      </tr>`
    )}`);

  document.getElementById('btn-add').onclick = () => Router.navigate('bankAccount/insert');
  document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
    e.preventDefault(); Router.navigate('bankAccount/edit', { id: a.dataset.id });
  });
  document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
    e.preventDefault();
    if (!await confirmDelete('Delete this bank account?')) return;
    const r = await window.db.bankAccount.delete(Number(a.dataset.id));
    if (r.success) { toast('Bank account deleted'); Router.navigate('bankAccount/view'); }
    else toast('Error: ' + r.error, true);
  });
});

Router.register('bankAccount/insert', () => {
  renderSidebar('bankAccount');
  setContent(`
    <div class="page-header"><h1 class="page-title">Add Bank Account</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Bank</label><input id="bank" placeholder="Sampath Bank" required></div>
      <div class="form-group"><label>Account Name</label><input id="accountName" placeholder="Bank Account Holder's Name" required></div>
      <div class="form-group"><label>Account Number</label><input id="accountNumber" placeholder="Bank Account Number" required></div>
      <div class="form-group"><label>Bank Branch</label><input id="branch" placeholder="kelaniya" required></div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Bank Account</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('bankAccount/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.bankAccount.insert({ 
      bank: formVal('bank'), 
      accountName: formVal('accountName'), 
      accountNumber: formVal('accountNumber'), 
      branch: formVal('branch'), 
      });
    if (r.success) { toast('Bank account added'); Router.navigate('bankAccount/view'); }
    else toast('Error: ' + r.error, true);
  };
});

Router.register('bankAccount/edit', async ({ id }) => {
  renderSidebar('bankAccount');
  const res = await window.db.bankAccount.get(Number(id));
  if (!res.success || !res.data) return setContent('<p>Bank Account not found.</p>');
  const bnk = res.data;

  setContent(`
    <div class="page-header"><h1 class="page-title">Edit Bank Account</h1></div>
    <form class="form-card" id="form">
      <div class="form-group"><label>Bank</label><input id="bank" placeholder="Sampath Bank" value="${esc(bnk.bank)}"  required></div>
      <div class="form-group"><label>Account Name</label><input id="accountName" placeholder="Bank Account Holder's Name" value="${esc(bnk.accountName)}"  required></div>
      <div class="form-group"><label>Account Number</label><input id="accountNumber" placeholder="Bank Account Number" value="${esc(bnk.accountNumber)}"  required></div>
      <div class="form-group"><label>Bank Branch</label><input id="branch" placeholder="kelaniya" value="${esc(bnk.branch)}"  required></div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
        <button type="submit" class="btn-primary">Save Bank Account</button>
      </div>
    </form>`);

  document.getElementById('btn-back').onclick = () => Router.navigate('bankAccount/view');
  document.getElementById('form').onsubmit = async e => {
    e.preventDefault();
    const r = await window.db.bankAccount.update({ 
      id: Number(id),
      bank: formVal('bank'), 
      accountName: formVal('accountName'), 
      accountNumber: formVal('accountNumber'), 
      branch: formVal('branch')});
      
    if (r.success) { toast('Bank Account updated'); Router.navigate('bankAccount/view'); }
    else toast('Error: ' + r.error, true);
  };
});
