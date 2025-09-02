// electron/preload.js
// Make sure your BrowserWindow uses:
// webPreferences: { contextIsolation: true, nodeIntegration: false, preload: <path-to-this-file> }

const { contextBridge, ipcRenderer } = require('electron')

// Wrap invoke so renderer always gets { ok, data?, error? }
const wrap = (p) =>
  Promise.resolve(p)
    .then((data) => ({ ok: true, data }))
    .catch((err) => ({
      ok: false,
      error: (err && (err.message || err.toString())) || 'Unknown error',
    }))

contextBridge.exposeInMainWorld('api', {
  // Project
  projectNew:  () => wrap(ipcRenderer.invoke('project:new')),
  projectOpen: () => wrap(ipcRenderer.invoke('project:open')),
  projectSaveAs: () => ipcRenderer.invoke('project:saveAs'),

  // DB
  listPeople:   () => ipcRenderer.invoke('db:listPeople'),
  getPerson:    (id) => ipcRenderer.invoke('db:getPerson', id),
  createPerson: (payload) => ipcRenderer.invoke('db:createPerson', payload),
  updatePerson: (payload) => ipcRenderer.invoke('db:updatePerson', payload),

  // Optional status stream
  onStatus: (cb) => {
    if (typeof cb !== 'function') return () => {}
    const handler = (_e, msg) => { try { cb(msg) } catch {} }
    ipcRenderer.on('status', handler)
    return () => ipcRenderer.removeListener('status', handler)
  },
})

