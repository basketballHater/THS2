// ── invoice-builder.js ────────────────────────────────────────────────────────
// Included by orders.html via <script src="invoice-builder.js">
// Exports a single function: buildInvoiceHtml(order, items)
// The invoice matches THS branding (teal #0a4d5c, red accent #d03c2e)

function buildInvoiceHtml(o, items) {
  const invoiceNo  = `THS-${String(o.id).padStart(5,'0')}`;
  const dateStr    = new Date(o.created_at).toLocaleDateString('en-LK',{year:'numeric',month:'long',day:'numeric'});
  const discounted = o.subtotal_price - o.discount_amount;
  const advance    = o.total_price / 2;

  // ── Item rows ──────────────────────────────────────────────────────────────
  const itemRows = items.map((item, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>
        <div class="item-name">${esc(item.product_name)}</div>
        <div class="item-meta">${esc(item.product_id_no)}${item.brand ? ' · ' + esc(item.brand) : ''}${item.model ? ' · ' + esc(item.model) : ''}</div>
      </td>
      <td class="num">${item.quantity}</td>
      <td class="money">${fmtNum(item.unit_price)}</td>
      <td class="money bold">${fmtNum(item.line_price)}</td>
    </tr>`).join('');

  // ── Calculation steps ──────────────────────────────────────────────────────
  const calcRows = [
    { label: 'Sub Total',                                         val: fmtNum(o.subtotal_price),   cls: '' },
    { label: `Discount (${o.discount_rate}%)`,                    val: `− ${fmtNum(o.discount_amount)}`, cls: 'deduct' },
    { label: 'After Discount',                                    val: fmtNum(discounted),          cls: 'mid' },
    { label: `NBT (${o.nbt_rate}%)`,                              val: `+ ${fmtNum(o.nbt_amount)}`, cls: 'add' },
    { label: `VAT (${o.vat_rate}%)`,                              val: `+ ${fmtNum(o.vat_amount)}`, cls: 'add' },
    { label: 'Transport',                                         val: `+ ${fmtNum(o.transport)}`,  cls: 'add' },
  ].filter(r => {
    // hide zero rows (except subtotal & after-discount)
    if (r.label === 'Sub Total' || r.label === 'After Discount') return true;
    return !r.val.includes('0.00') || r.val === fmtNum(0);
  });

  const calcRowsHtml = calcRows.map(r => `
    <tr class="calc-row ${r.cls}">
      <td>${r.label}</td>
      <td class="money">${r.val}</td>
    </tr>`).join('');

  // ── Bank details (optional) ────────────────────────────────────────────────
  const bankSection = o.bank_name ? `
    <div class="bank-box">
      <div class="bank-title"><span class="dot"></span> Bank Transfer Details (50% Advance)</div>
      <div class="bank-grid">
        <div><span class="bl">Bank</span><span class="bv">${esc(o.bank_name)}</span></div>
        <div><span class="bl">Branch</span><span class="bv">${esc(o.bank_branch || '—')}</span></div>
        <div><span class="bl">Account Name</span><span class="bv">${esc(o.bank_account_name || '—')}</span></div>
        <div><span class="bl">Account No.</span><span class="bv">${esc(o.bank_account_number || '—')}</span></div>
      </div>
      <div class="advance-row">
        <span>Advance Amount Due (50%)</span>
        <span class="advance-val">${fmtLKR(advance)}</span>
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

  :root {
    --teal:   #0a4d5c;
    --teal2:  #0d6678;
    --red:    #d03c2e;
    --light:  #f4f8f9;
    --border: #dce8ec;
    --text:   #1a2e35;
    --muted:  #7a9aa5;
  }

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #e8eff2;
    color: var(--text);
    padding: 30px 20px;
    font-size: 13px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    background: #fff;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 0;
    box-shadow: 0 8px 40px rgba(0,0,0,.12);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }

  /* ── Header ── */
  .inv-header {
    background: var(--teal);
    padding: 0;
    display: flex;
    align-items: stretch;
    min-height: 130px;
  }

  .header-logo {
    background: var(--teal2);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 32px;
    min-width: 180px;
    border-right: 1px solid rgba(255,255,255,.12);
  }

  .logo-circle {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,.5);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    margin-bottom: 8px;
  }
  .logo-abbr {
    font-family: 'EB Garamond', serif;
    font-size: 22px; font-weight: 700;
    color: #fff; letter-spacing: 2px;
    line-height: 1;
  }
  .logo-name {
    font-size: 9px; color: rgba(255,255,255,.7);
    text-align: center; letter-spacing: .5px;
    margin-top: 6px; text-transform: uppercase;
    line-height: 1.4;
  }

  .header-info {
    flex: 1;
    padding: 22px 28px;
    display: flex; flex-direction: column; justify-content: center;
  }
  .company-name {
    font-family: 'EB Garamond', serif;
    font-size: 26px; font-weight: 700; color: #fff; letter-spacing: .5px;
  }
  .company-meta {
    display: flex; gap: 22px; margin-top: 10px; flex-wrap: wrap;
  }
  .company-meta span {
    font-size: 11px; color: rgba(255,255,255,.65);
    display: flex; align-items: center; gap: 5px;
  }
  .company-meta .icon { opacity: .7; font-size: 10px; }

  .header-invoice {
    display: flex; flex-direction: column;
    align-items: flex-end; justify-content: center;
    padding: 22px 28px; text-align: right;
    min-width: 160px;
  }
  .inv-label {
    font-size: 10px; color: rgba(255,255,255,.55);
    text-transform: uppercase; letter-spacing: .1em;
  }
  .inv-number {
    font-family: 'EB Garamond', serif;
    font-size: 28px; font-weight: 700;
    color: #fff; margin-top: 4px; letter-spacing: 1px;
  }
  .inv-date {
    font-size: 11px; color: rgba(255,255,255,.6); margin-top: 8px;
  }

  /* ── Status strip ── */
  .status-strip {
    background: var(--red);
    height: 4px;
  }

  /* ── Body ── */
  .inv-body { padding: 28px 32px; }

  /* ── Parties ── */
  .parties {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 20px; margin-bottom: 26px;
  }
  .party-box {
    background: var(--light);
    border-radius: 10px; padding: 16px 18px;
    border: 1px solid var(--border);
  }
  .party-label {
    font-size: 10px; font-weight: 700; color: var(--red);
    text-transform: uppercase; letter-spacing: .1em;
    margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
  }
  .party-label::after { content:''; flex:1; height:1px; background:var(--border); }
  .party-name { font-size: 15px; font-weight: 700; color: var(--teal); font-family:'EB Garamond',serif; }
  .party-desig { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .party-detail { font-size: 12px; color: var(--text); margin-top: 8px; line-height: 1.7; }
  .party-detail span { color: var(--muted); margin-right: 4px; font-size: 10px; }

  /* ── Team row ── */
  .team-row {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 20px; margin-bottom: 26px;
  }
  .team-box {
    border-radius: 10px; padding: 12px 16px;
    border: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
  }
  .team-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--teal); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; flex-shrink: 0;
    font-family: 'EB Garamond', serif;
  }
  .team-info .ti-role { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .team-info .ti-name { font-size: 13px; font-weight: 700; color: var(--teal); margin-top: 1px; }
  .team-info .ti-contact { font-size: 11px; color: var(--muted); margin-top: 2px; }

  /* ── Items table ── */
  .section-title {
    font-size: 11px; font-weight: 700; color: var(--teal);
    text-transform: uppercase; letter-spacing: .1em;
    margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
  }
  .section-title::after { content:''; flex:1; height:1px; background:var(--border); }

  table.items {
    width: 100%; border-collapse: collapse;
    margin-bottom: 24px; border-radius: 10px; overflow: hidden;
    border: 1px solid var(--border);
  }
  table.items thead tr { background: var(--teal); }
  table.items thead th {
    padding: 10px 14px; text-align: left;
    font-size: 11px; color: #fff; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase;
  }
  table.items thead th.money { text-align: right; }
  table.items thead th.num   { text-align: center; }
  table.items tbody tr { border-bottom: 1px solid var(--border); }
  table.items tbody tr:last-child { border-bottom: none; }
  table.items tbody tr:nth-child(even) { background: var(--light); }
  table.items tbody td { padding: 10px 14px; font-size: 12px; }
  table.items tbody td.money { text-align: right; font-variant-numeric: tabular-nums; }
  table.items tbody td.num   { text-align: center; color: var(--muted); }
  table.items tbody td.bold  { font-weight: 700; }
  .item-name { font-weight: 600; color: var(--teal); }
  .item-meta { font-size: 10px; color: var(--muted); margin-top: 2px; }

  /* ── Calculation block ── */
  .calc-section {
    display: flex; justify-content: flex-end; margin-bottom: 24px;
  }
  .calc-table { width: 320px; }
  table.calc {
    width: 100%; border-collapse: collapse;
    border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  }
  table.calc .calc-row td {
    padding: 8px 16px; font-size: 13px; border-bottom: 1px solid var(--border);
  }
  table.calc .calc-row:last-child td { border-bottom: none; }
  table.calc .calc-row td.money { text-align: right; font-variant-numeric: tabular-nums; }
  table.calc .calc-row.deduct td.money { color: var(--red); }
  table.calc .calc-row.add    td.money { color: #185fa5; }
  table.calc .calc-row.mid    td       { background: #f0f7f9; font-weight: 600; font-size: 12px; color: var(--muted); }
  table.calc .total-row td {
    padding: 12px 16px; background: var(--teal); color: #fff;
    font-size: 15px; font-weight: 700;
  }
  table.calc .total-row td.money { text-align: right; font-size: 17px; }
  table.calc .advance-row td {
    padding: 9px 16px; background: #fff3e0; font-size: 12px;
    font-weight: 600; color: #854f0b;
  }
  table.calc .advance-row td.money { text-align: right; font-size: 14px; color: #854f0b; }

  /* ── Bank box ── */
  .bank-box {
    background: var(--light);
    border: 1px solid var(--border);
    border-radius: 10px; padding: 16px 18px;
    margin-bottom: 24px;
  }
  .bank-title {
    font-size: 11px; font-weight: 700; color: var(--teal);
    text-transform: uppercase; letter-spacing: .1em;
    margin-bottom: 12px; display: flex; align-items: center; gap: 7px;
  }
  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--red); display: inline-block;
  }
  .bank-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .bank-grid > div { display: flex; flex-direction: column; gap: 2px; }
  .bl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing:.05em; }
  .bv { font-size: 13px; font-weight: 600; color: var(--teal); }
  .advance-row {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 14px; padding-top: 12px;
    border-top: 1px dashed var(--border);
    font-size: 13px; font-weight: 600; color: var(--text);
  }
  .advance-val { font-size: 16px; font-weight: 800; color: var(--red); }

  /* ── Notes / Footer ── */
  .inv-notes {
    font-size: 11px; color: var(--muted); line-height: 1.7;
    border-top: 1px dashed var(--border); padding-top: 16px;
    margin-bottom: 20px;
  }
  .inv-footer {
    background: var(--teal);
    padding: 14px 32px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 11px; color: rgba(255,255,255,.55);
  }
  .inv-footer strong { color: rgba(255,255,255,.85); }

  /* ── Print ── */
  @media print {
    body { background: #fff; padding: 0; }
    .page { box-shadow: none; width: 100%; min-height: auto; border-radius: 0; }
    @page { margin: 0; size: A4; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="inv-header">
    <div class="header-logo">
      <div class="logo-circle">
        <div class="logo-abbr">THS</div>
      </div>
      <div class="logo-name">The Hotel<br>Supplier</div>
    </div>
    <div class="header-info">
      <div class="company-name">The Hotel Supplier</div>
      <div class="company-meta">
        <span><span class="icon">📍</span> 50/15, Sir James Peiris Mawatha, Colombo 00200</span>
        <span><span class="icon">📞</span> (011) 2 330 009</span>
        <span><span class="icon">🌐</span> LKMRD.lk</span>
      </div>
    </div>
    <div class="header-invoice">
      <div class="inv-label">Invoice</div>
      <div class="inv-number">${invoiceNo}</div>
      <div class="inv-date">${dateStr}</div>
    </div>
  </div>
  <div class="status-strip"></div>

  <div class="inv-body">

    <!-- Client & Billing parties -->
    <div class="parties">
      <div class="party-box">
        <div class="party-label">Bill To</div>
        <div class="party-name">${esc(o.client_name)}</div>
        <div class="party-desig">${esc(o.client_designation || '')}</div>
        <div class="party-detail">
          ${o.client_address ? `<div><span>📍</span>${esc(o.client_address)}</div>` : ''}
          ${o.client_contact ? `<div><span>📞</span>${esc(o.client_contact)}</div>` : ''}
          ${o.client_email   ? `<div><span>✉</span>${esc(o.client_email)}</div>`   : ''}
        </div>
      </div>
      <div class="party-box" style="background:#fff">
        <div class="party-label">Invoice Details</div>
        <div class="party-detail" style="line-height:2">
          <div><span>Order Status</span> <strong>${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</strong></div>
          <div><span>Invoice No.</span> <strong>${invoiceNo}</strong></div>
          <div><span>Date</span> <strong>${dateStr}</strong></div>
        </div>
      </div>
    </div>

    <!-- Team -->
    <div class="team-row">
      <div class="team-box">
        <div class="team-avatar">${initials(o.prepared_by_name)}</div>
        <div class="team-info">
          <div class="ti-role">Prepared By</div>
          <div class="ti-name">${esc(o.prepared_by_name)}</div>
          <div class="ti-contact">${esc(o.prepared_by_contact||'')} ${esc(o.prepared_by_email||'')}</div>
        </div>
      </div>
      <div class="team-box">
        <div class="team-avatar">${initials(o.sales_person_name)}</div>
        <div class="team-info">
          <div class="ti-role">Sales Person</div>
          <div class="ti-name">${esc(o.sales_person_name)}</div>
          <div class="ti-contact">${esc(o.sales_person_contact||'')} ${esc(o.sales_person_email||'')}</div>
        </div>
      </div>
    </div>

    <!-- Items -->
    <div class="section-title">Items Ordered</div>
    <table class="items">
      <thead><tr>
        <th class="num" style="width:36px">#</th>
        <th>Product</th>
        <th class="num" style="width:50px">Qty</th>
        <th class="money" style="width:110px">Unit Price</th>
        <th class="money" style="width:120px">Line Total</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Calculation -->
    <div class="calc-section">
      <div class="calc-table">
        <table class="calc">
          ${calcRowsHtml}
          <tr class="total-row">
            <td>Total Invoice Amount</td>
            <td class="money">${fmtLKR(o.total_price)}</td>
          </tr>
          <tr class="advance-row">
            <td>50% Advance Required</td>
            <td class="money">${fmtLKR(advance)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Bank details -->
    ${bankSection}

    <!-- Notes -->
    <div class="inv-notes">
      <strong>Notes:</strong> Please make the 50% advance payment to the bank account above to confirm your order.
      The remaining balance is due upon delivery. For any queries, please contact us at (011) 2 330 009 or visit LKMRD.lk.
    </div>

  </div><!-- /inv-body -->

  <!-- Footer -->
  <div class="inv-footer">
    <span>Thank you for choosing <strong>The Hotel Supplier</strong></span>
    <span>${invoiceNo} &nbsp;·&nbsp; ${dateStr}</span>
    <span>LKMRD.lk</span>
  </div>

</div><!-- /page -->
</body>
</html>`;
}

// ── Invoice utilities ─────────────────────────────────────────────────────────
function fmtNum(n) {
  return (Number(n)||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function fmtLKR(n) {
  return 'LKR ' + fmtNum(n);
}
function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
}
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
