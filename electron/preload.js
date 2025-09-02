// electron/preload.js  (CommonJS; see electron/package.json)
const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload] loaded');

const api = {
  // Project commands
  projectNew:    () => ipcRenderer.invoke('project:new'),
  projectOpen:   () => ipcRenderer.invoke('project:open'),
  projectSaveAs: () => ipcRenderer.invoke('project:saveAs'),

  // DB commands
  listPeople:    () => ipcRenderer.invoke('db:listPeople'),
  getPerson:     (id) => ipcRenderer.invoke('db:getPerson', id),
  createPerson:  (payload) => ipcRenderer.invoke('db:createPerson', payload),
  updatePerson:  (payload) => ipcRenderer.invoke('db:updatePerson', payload),

  // Optional: subscribe to status messages from main
  onStatus: (cb) => {
    const handler = (_e, msg) => { try { cb && cb(msg); } catch {}
    };
    ipcRenderer.on('status', handler);
    return () => ipcRenderer.removeListener('status', handler);
  }
};

contextBridge.exposeInMainWorld('api', api);
