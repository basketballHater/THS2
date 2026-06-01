// ── Suppliers dashboard ───────────────────────────────────────────────────────
Router.register('suppliers', () => {
    renderSidebar('suppliers');
    setContent(buildDashboard('Suppliers', 'Manage your suppliers', [
        { page: 'suppliers/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all suppliers' },
        { page: 'suppliers/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Add',    desc: 'Add a new supplier' },
    ]));
});

// ── View all ──────────────────────────────────────────────────────────────────
Router.register('suppliers/view', async () => {
    renderSidebar('suppliers');
    const res = await window.db.suppliers.getAll();
    if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

    setContent(`
        <div class="page-header">
            <h1 class="page-title">Suppliers</h1>
            <button class="btn-primary" id="btn-add">
                <i class="fas fa-plus"></i> Add Supplier
            </button>
        </div>
        ${buildTable(
            ['ID', 'Name', 'Contact', 'Email', 'Address', 'Actions'],
            res.data,
            r => `<tr>
                <td>${r.id}</td>
                <td>${esc(r.name)}</td>
                <td>${esc(r.contact || '—')}</td>
                <td>${esc(r.email   || '—')}</td>
                <td>${esc(r.address || '—')}</td>
                <td class="action-cell">
                    <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
                    <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
                </td>
            </tr>`
        )}`);

    document.getElementById('btn-add').onclick = () => Router.navigate('suppliers/insert');

    document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
        e.preventDefault();
        Router.navigate('suppliers/edit', { id: a.dataset.id });
    });

    document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
        e.preventDefault();
        if (!await confirmDelete('Delete this supplier?')) return;
        const r = await window.db.suppliers.delete(Number(a.dataset.id));
        if (r.success) { toast('Supplier deleted'); Router.navigate('suppliers/view'); }
        else toast('Error: ' + r.error, true);
    });
});

// ── Insert ────────────────────────────────────────────────────────────────────
Router.register('suppliers/insert', () => {
    renderSidebar('suppliers');
    setContent(`
        <div class="page-header">
            <h1 class="page-title">Add Supplier</h1>
        </div>
        <form class="form-card" id="form">
            <div class="form-group">
                <label>Name</label>
                <input id="name" placeholder="Supplier name" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
                <button type="submit" class="btn-primary">Save Supplier</button>
            </div>
        </form>`);

    document.getElementById('btn-back').onclick = () => Router.navigate('suppliers/view');

    document.getElementById('form').onsubmit = async e => {
        e.preventDefault();
        const r = await window.db.suppliers.insert({
            name:    formVal('name'),
        });
        if (r.success) { toast('Supplier added'); Router.navigate('suppliers/view'); }
        else toast('Error: ' + r.error, true);
    };
});

// ── Edit ──────────────────────────────────────────────────────────────────────
Router.register('suppliers/edit', async ({ id }) => {
    renderSidebar('suppliers');
    const res = await window.db.suppliers.get(Number(id));
    if (!res.success || !res.data) return setContent('<p>Supplier not found.</p>');
    const s = res.data;

    setContent(`
        <div class="page-header">
            <h1 class="page-title">Edit Supplier</h1>
        </div>
        <form class="form-card" id="form">
            <div class="form-group">
                <label>Name</label>
                <input id="name" value="${esc(s.name)}" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
                <button type="submit" class="btn-primary">Update Supplier</button>
            </div>
        </form>`);

    document.getElementById('btn-back').onclick = () => Router.navigate('suppliers/view');

    document.getElementById('form').onsubmit = async e => {
        e.preventDefault();
        const r = await window.db.suppliers.update({
            id:      Number(id),
            name:    formVal('name'),
        });
        if (r.success) { toast('Supplier updated'); Router.navigate('suppliers/view'); }
        else toast('Error: ' + r.error, true);
    };
});