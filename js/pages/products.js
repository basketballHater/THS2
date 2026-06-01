// ── Products dashboard ────────────────────────────────────────────────────────
Router.register('products', () => {
    renderSidebar('products');
    setContent(buildDashboard('Products', 'Manage your product catalogue', [
        { page: 'products/view',   icon: 'fa-eye',  iconClass: 'icon-view',   label: 'View',   desc: 'Browse all products' },
        { page: 'products/insert', icon: 'fa-plus', iconClass: 'icon-insert', label: 'Add Product',    desc: 'Add a new product' },
    ]));
});

// ── View all ──────────────────────────────────────────────────────────────────
Router.register('products/view', async () => {
    renderSidebar('products');
    const res = await window.db.products.getAll();
    if (!res.success) return setContent(`<p class="error">Error: ${res.error}</p>`);

    setContent(`
        <div class="page-header">
            <h1 class="page-title">Products</h1>
            <button class="btn-primary" id="btn-add">
                <i class="fas fa-plus"></i> Add Product
            </button>
        </div>

        ${buildTable(
            ['ID', 'Product ID', 'Name', 'Brand', 'Model', 'Selling Price', 'Cost', 'Stock', 'Specs', 'Supplier', 'Actions'],
            res.data,
            r => `<tr>
                <td>${r.id}</td>
                <td>${esc(r.productID)}</td>
                <td>${esc(r.name)}</td>
                <td>${esc(r.brand   || '—')}</td>
                <td>${esc(r.model   || '—')}</td>
                <td>Rs. ${r.seling_price.toLocaleString()}</td>
                <td>Rs. ${r.cost.toLocaleString()}</td>
                <td>${r.stock_qty}</td>
                <td>${esc(r.supplier_name || '—')}</td>
                <td>${r.specs}</td>
                <td class="action-cell">
                    <a href="#" class="btn-edit"   data-id="${r.id}"><i class="fas fa-pen"></i> Edit</a>
                    <a href="#" class="btn-stock"   data-id="${r.id}"><i class="fas fa-archive"></i> Add Stock</a>
                    <a href="#" class="btn-delete" data-id="${r.id}"><i class="fas fa-trash"></i> Delete</a>
                </td>
            </tr>`
        )}`);

    document.getElementById('btn-add').onclick = () => Router.navigate('products/insert');

    document.querySelectorAll('.btn-edit').forEach(a => a.onclick = e => {
        e.preventDefault();
        Router.navigate('products/edit', { id: a.dataset.id });
    });

    document.querySelectorAll('.btn-stock').forEach(a => a.onclick = e => {
        e.preventDefault();
        Router.navigate('products/addStock', { id: a.dataset.id });
    });

    document.querySelectorAll('.btn-delete').forEach(a => a.onclick = async e => {
        e.preventDefault();
        if (!await confirmDelete('Delete this product?')) return;
        const r = await window.db.products.delete(Number(a.dataset.id));
        if (r.success) { toast('Product deleted'); Router.navigate('products/view'); }
        else toast('Error: ' + r.error, true);
    });
});



// ── Add Stock all ──────────────────────────────────────────────────────────────────
Router.register('products/addStock', async ({ id }) => {
    renderSidebar('products');
    const [prodRes, supRes] = await Promise.all([
        window.db.products.get(Number(id)),
        window.db.suppliers.getAll(),
    ]);

    if (!prodRes.success || !prodRes.data) return setContent('<p>Product not found.</p>');
    const p = prodRes.data;

    setContent(`
        <div class="page-header">
            <h1 class="page-title">Edit Product</h1>
        </div>
        <form class="form-card" id="form">
            <div class="form-group">
                <label>Quantity</label>
                <input id="quantity" type="number" min="0" required>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">Add Quantity</button>
            </div>
        </form>`);

    document.getElementById('form').onsubmit = async e => {
        e.preventDefault();
        const r = await window.db.products.addStock({
            quantity:    formVal('quantity'),
            id:         p.id,
        });

        if (r.success) { toast('Stock Added'); Router.navigate('products/view'); }
        else toast('Error: ' + r.error, true);
    };
});



// ── Insert ────────────────────────────────────────────────────────────────────
Router.register('products/insert', async () => {
    renderSidebar('products');

    const supRes = await window.db.suppliers.getAll();
    const supOptions = (supRes.data || []).map(s =>
        `<option value="${s.id}">${esc(s.name)}</option>`).join('');

    setContent(`
        <div class="page-header">
            <h1 class="page-title">Add Product</h1>
        </div>
        <form class="form-card" id="form">
            <div class="form-group">
                <label>Product ID</label>
                <input id="productID" placeholder="e.g. PRD-001" required>
            </div>
            <div class="form-group">
                <label>Name</label>
                <input id="name" placeholder="Product name" required>
            </div>
            <div class="form-group">
                <label>Brand</label>
                <input id="brand" placeholder="Brand">
            </div>
            <div class="form-group">
                <label>Country</label>
                <input id="country" placeholder="Country of origin">
            </div>
            <div class="form-group">
                <label>Model</label>
                <input id="model" placeholder="Model number">
            </div>
            <div class="form-group">
                <label>Selling Price (Rs.)</label>
                <input id="seling_price" type="number" min="0" placeholder="0" required>
            </div>
            <div class="form-group">
                <label>Cost (Rs.)</label>
                <input id="cost" type="number" min="0" placeholder="0" required>
            </div>
            <div class="form-group">
                <label>Initial Stock</label>
                <input id="stock_qty" type="number" min="0" placeholder="0" required>
            </div>
            <div class="form-group">
                <label for="specs">Specs</label>
                <textarea id="specs" required></textarea>
            </div>
            <div class="form-group">
                <label>Supplier</label>
                <select id="supplier_id">
                    <option value="">— None —</option>
                    ${supOptions}
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
                <button type="submit" class="btn-primary">Save Product</button>
            </div>
        </form>`);

    document.getElementById('btn-back').onclick = () => Router.navigate('products/view');

    document.getElementById('form').onsubmit = async e => {
        e.preventDefault();
        const r = await window.db.products.insert({
            productID:    formVal('productID'),
            name:         formVal('name'),
            brand:        formVal('brand'),
            country:      formVal('country'),
            model:        formVal('model'),
            seling_price: Number(formVal('seling_price')),
            cost:         Number(formVal('cost')),
            stock_qty:    Number(formVal('stock_qty')),
            specs:        formVal('specs'),
            supplier_id:  formVal('supplier_id') || null,
        });
        if (r.success) { toast('Product added'); Router.navigate('products/view'); }
        else toast('Error: ' + r.error, true);
    };
});

Router.register('products/edit', async ({ id }) => {
    renderSidebar('products');

    const [prodRes, supRes] = await Promise.all([
        window.db.products.get(Number(id)),
        window.db.suppliers.getAll(),
    ]);

    if (!prodRes.success || !prodRes.data) return setContent('<p>Product not found.</p>');
    const p = prodRes.data;

    const supOptions = (supRes.data || []).map(s =>
        `<option value="${s.id}" ${s.id === p.supplier_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('');

    setContent(`
        <div class="page-header">
            <h1 class="page-title">Edit Product</h1>
        </div>
        <form class="form-card" id="form">
            <div class="form-group">
                <label>Product ID</label>
                <input id="productID" value="${esc(p.productID)}" required>
            </div>
            <div class="form-group">
                <label>Name</label>
                <input id="name" value="${esc(p.name)}" required>
            </div>
            <div class="form-group">
                <label>Brand</label>
                <input id="brand" value="${esc(p.brand || '')}">
            </div>
            <div class="form-group">
                <label>Country</label>
                <input id="country" value="${esc(p.country || '')}">
            </div>
            <div class="form-group">
                <label>Model</label>
                <input id="model" value="${esc(p.model || '')}">
            </div>
            <div class="form-group">
                <label>Selling Price (Rs.)</label>
                <input id="seling_price" type="number" min="0" value="${p.seling_price}" required>
            </div>
            <div class="form-group">
                <label>Cost (Rs.)</label>
                <input id="cost" type="number" min="0" value="${p.cost}" required>
            </div>
            <div class="form-group">
                <label>Stock Quantity</label>
                <input id="stock_qty" type="number" min="0" value="${p.stock_qty}" required>
            </div>
            <div class="form-group">
                <label for="specs">Specs</label>
                <textarea id="specs" required>${p.specs}</textarea>
            </div>
            <div class="form-group">
                <label>Supplier</label>
                <select id="supplier_id">
                    <option value="">— None —</option>
                    ${supOptions}
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="btn-back">Cancel</button>
                <button type="submit" class="btn-primary">Update Product</button>
            </div>
        </form>`);

    document.getElementById('btn-back').onclick = () => Router.navigate('products/view');

    document.getElementById('form').onsubmit = async e => {
        e.preventDefault();
        const r = await window.db.products.update({
            id:           Number(id),
            productID:    formVal('productID'),
            name:         formVal('name'),
            brand:        formVal('brand'),
            country:      formVal('country'),
            model:        formVal('model'),
            seling_price: Number(formVal('seling_price')),
            cost:         Number(formVal('cost')),
            stock_qty:    Number(formVal('stock_qty')),
            specs:        formVal('specs'),
            supplier_id:  formVal('supplier_id') || null,
        });
        if (r.success) { toast('Product updated'); Router.navigate('products/view'); }
        else toast('Error: ' + r.error, true);
    };
});