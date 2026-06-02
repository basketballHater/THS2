// ── pdf-handler.js ────────────────────────────────────────────────────────────
// Add these snippets to your Electron main process (main.js / index.js).
// Also includes the preload.js bridge so renderer can call ipc.invoke().

// ════════════════════════════════════════════════════════════════════════════
// 1.  PASTE THIS INTO YOUR main.js (requires: ipcMain, BrowserWindow, dialog, path)
// ════════════════════════════════════════════════════════════════════════════

/*
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
*/

// Save invoice as PDF — called from renderer via electronAPI.savePdf()
ipcMain.handle('invoice:savePdf', async (event, { orderId, html }) => {
  try {
    // Ask user where to save
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Invoice as PDF',
      defaultPath: path.join(app.getPath('documents'), `THS-Invoice-${String(orderId).padStart(5,'0')}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    // Create a hidden BrowserWindow to render the HTML and print to PDF
    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    // Load the invoice HTML as a data URL
    const dataUrl = 'data:text/html;charset=UTF-8,' + encodeURIComponent(html);
    await win.loadURL(dataUrl);

    // Allow a moment for fonts/styles to load
    await new Promise(r => setTimeout(r, 800));

    const pdfData = await win.webContents.printToPDF({
      pageSize:         'A4',
      printBackground:  true,
      marginsType:      1,   // no margins (our page handles its own padding)
      preferCSSPageSize: true,
    });

    win.destroy();

    const fs = require('fs');
    fs.writeFileSync(filePath, pdfData);

    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});


// ════════════════════════════════════════════════════════════════════════════
// 2.  preload.js  — expose safe IPC bridge to renderer
//     Make sure this file is referenced in your BrowserWindow config:
//       webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
// ════════════════════════════════════════════════════════════════════════════

/*
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // Generic invoke — used by orders.html for all orders:* channels
  invoke: (channel, ...args) => {
    const allowed = [
      'orders:create',
      'orders:list',
      'orders:get',
      'orders:setStatus',
      'orders:void',
      'orders:dropdowns',
      'invoice:savePdf',
    ];
    if (!allowed.includes(channel)) {
      return Promise.reject(new Error(`Channel "${channel}" not allowed`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  // Convenience wrapper used by invoice-builder.js
  savePdf: (orderId, html) => ipcRenderer.invoke('invoice:savePdf', { orderId, html }),
});
*/


// ════════════════════════════════════════════════════════════════════════════
// 3.  INTEGRATION CHECKLIST
// ════════════════════════════════════════════════════════════════════════════
/*
  Files to add to your project:
  ┌─────────────────────────────────┬────────────────────────────────────────┐
  │ File                            │ What to do                             │
  ├─────────────────────────────────┼────────────────────────────────────────┤
  │ schema.js                       │ Add db.run() calls AFTER existing ones │
  │ ipc-orders.js                   │ require() it in main.js after db ready │
  │ pdf-handler.js (this file)      │ require() it in main.js                │
  │ preload.js                      │ Copy the preload block above           │
  │ orders.html                     │ Add to your renderer pages             │
  │ invoice-builder.js              │ Keep alongside orders.html             │
  └─────────────────────────────────┴────────────────────────────────────────┘

  In main.js:
    // After db is initialised:
    require('./schema.js');         // or inline the db.run() calls
    require('./ipc-orders.js');
    require('./pdf-handler.js');

  In your BrowserWindow for the orders page:
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }

  In your sidebar nav (orders link):
    <a class="nav-item" href="orders.html">
      <i class="fa fa-file-invoice"></i> Orders
    </a>
*/
