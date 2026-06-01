Router.register('charts', async () => {
  renderSidebar('charts');
  setContent(`
    <div class="page-header">
      <h1 class="page-title">Charts & Analytics</h1>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <h2 class="chart-title">Orders by Hospital</h2>
        <canvas id="chart-orders-hospital" height="260"></canvas>
      </div>
      <div class="chart-card">
        <h2 class="chart-title">Revenue by Hospital</h2>
        <canvas id="chart-revenue-hospital" height="260"></canvas>
      </div>
      <div class="chart-card">
        <h2 class="chart-title">Orders by Status</h2>
        <canvas id="chart-orders-status" height="260"></canvas>
      </div>
      <div class="chart-card">
        <h2 class="chart-title">Stock by Hospital</h2>
        <canvas id="chart-stock-hospital" height="260"></canvas>
      </div>
      <div class="chart-card wide">
        <h2 class="chart-title">Top Items by Quantity Ordered</h2>
        <canvas id="chart-top-items" height="220"></canvas>
      </div>
    </div>`);

  const [analyticsRes, stockRes] = await Promise.all([
    window.db.analytics.orders(),
    window.db.analytics.stock(),
  ]);

  if (!analyticsRes.success) return;
  const { orders, orderItems } = analyticsRes.data;

  // ── Palette ──────────────────────────────────────────────────────────────
  const COLORS = [
    '#2d6a4f','#40916c','#52b788','#74c69d',
    '#95d5b2','#b7e4c7','#d8f3dc','#1b4332',
  ];
  const alpha = (hex, a) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  };

  // ── Aggregations ─────────────────────────────────────────────────────────
  const ordersByHosp = {}, revenueByHosp = {}, ordersByStatus = {}, itemQtys = {};

  for (const o of orders) {
    ordersByHosp[o.hospital_name]  = (ordersByHosp[o.hospital_name]  || 0) + 1;
    revenueByHosp[o.hospital_name] = (revenueByHosp[o.hospital_name] || 0) +
      (o.total_amount * (100 - o.discount) / 100);
    ordersByStatus[o.order_status] = (ordersByStatus[o.order_status] || 0) + 1;
    for (const item of (orderItems[o.id] || [])) {
      itemQtys[item.item_name] = (itemQtys[item.item_name] || 0) + item.quantity;
    }
  }

  const stockByHosp = {};
  if (stockRes.success) {
    for (const s of stockRes.data) {
      stockByHosp[s.hospital_name] = (stockByHosp[s.hospital_name] || 0) + s.quantity;
    }
  }

  // ── Generic draw helpers ──────────────────────────────────────────────────
  function drawBar(canvasId, labels, values, colorArr, yLabel = '') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 500;
    canvas.width  = W;
    canvas.height = parseInt(canvas.getAttribute('height'));
    const H = canvas.height;
    const pad = { top: 24, right: 20, bottom: 52, left: 64 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top  - pad.bottom;

    const max = Math.max(...values, 1);
    const barW = Math.max(18, cw / (labels.length * 1.6));
    const gap  = cw / labels.length;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#e8ede9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ch - (ch * i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(yLabel + Math.round(max * i / 4).toLocaleString(), pad.left - 8, y + 4);
    }

    // Bars
    labels.forEach((label, i) => {
      const x = pad.left + gap * i + gap / 2 - barW / 2;
      const barH = (values[i] / max) * ch;
      const y = pad.top + ch - barH;
      ctx.fillStyle = colorArr[i % colorArr.length];
      roundRect(ctx, x, y, barW, barH, 5);
      ctx.fill();

      // Label
      ctx.fillStyle = '#444'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      const words = label.split(' ');
      words.forEach((w, wi) => ctx.fillText(w, x + barW / 2, pad.top + ch + 16 + wi * 13));

      // Value on top
      ctx.fillStyle = '#2d6a4f'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(values[i].toLocaleString(), x + barW / 2, y - 5);
    });
  }

  function drawPie(canvasId, labels, values, colorArr) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const W = canvas.offsetWidth || 400;
    canvas.width  = W;
    canvas.height = parseInt(canvas.getAttribute('height'));
    const H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) { ctx.fillStyle='#aaa'; ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.fillText('No data', W/2, H/2); return; }

    const cx = W * 0.38, cy = H / 2, r = Math.min(cx, cy) - 16;
    let angle = -Math.PI / 2;

    values.forEach((v, i) => {
      const slice = (v / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = colorArr[i % colorArr.length];
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      angle += slice;
    });

    // Legend
    const lx = W * 0.72, ly0 = cy - (labels.length * 20) / 2;
    labels.forEach((label, i) => {
      const ly = ly0 + i * 22;
      ctx.fillStyle = colorArr[i % colorArr.length];
      ctx.fillRect(lx - 20, ly - 9, 14, 14);
      ctx.fillStyle = '#333'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      const pct = ((values[i] / total) * 100).toFixed(1);
      ctx.fillText(`${label} (${pct}%)`, lx - 2, ly + 3);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (h < r) r = h;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Draw all charts ───────────────────────────────────────────────────────
  setTimeout(() => {
    // Orders by hospital
    const ohLabels = Object.keys(ordersByHosp);
    drawBar('chart-orders-hospital', ohLabels, ohLabels.map(k => ordersByHosp[k]), COLORS);

    // Revenue by hospital
    const rhLabels = Object.keys(revenueByHosp);
    drawBar('chart-revenue-hospital', rhLabels, rhLabels.map(k => Math.round(revenueByHosp[k])), COLORS, 'Rs.');

    // Orders by status (pie)
    const osLabels = Object.keys(ordersByStatus);
    drawPie('chart-orders-status', osLabels, osLabels.map(k => ordersByStatus[k]),
      ['#2d6a4f','#e74c3c','#f39c12','#3498db']);

    // Stock by hospital (bar)
    const shLabels = Object.keys(stockByHosp);
    drawBar('chart-stock-hospital', shLabels, shLabels.map(k => stockByHosp[k]), COLORS);

    // Top items by qty ordered
    const sortedItems = Object.entries(itemQtys).sort((a,b) => b[1]-a[1]).slice(0, 8);
    drawBar('chart-top-items', sortedItems.map(x=>x[0]), sortedItems.map(x=>x[1]), COLORS);
  }, 50);
});
