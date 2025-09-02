// electron/main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import * as DB from './db.js'

let win = null
let currentProjectPath = null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'electron', 'preload.js'),
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL || ''
  console.log('[main] VITE_DEV_SERVER_URL =', devUrl || '(empty)')

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[main] did-fail-load:', code, desc, 'url =', url)
  })

  if (devUrl) {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const file = path.join(app.getAppPath(), 'dist', 'index.html')
    console.log('[main] loading built file:', file)
    win.loadFile(file)
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

function assertOpen() {
  if (!currentProjectPath) throw new Error('No project is open. Call project:new or project:open first.')
}

function openProject(filePath) {
  DB.open(filePath) // creates if missing
  currentProjectPath = filePath
  if (win) win.webContents.send('status', { type: 'project', path: currentProjectPath })
  console.log('[main] project open at', currentProjectPath)
}

/* -------- Project commands -------- */

ipcMain.handle('project:new', async () => {
  try {
    const dir = app.getPath('userData')
    fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, `FamilyTree-${Date.now()}.ftdb`)
    openProject(filePath)
    return { ok: true, path: filePath }
  } catch (e) {
    console.error('project:new failed', e)
    return { ok: false, error: String(e) }
  }
})

ipcMain.handle('project:open', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Open Family Tree',
      properties: ['openFile'],
      filters: [{ name: 'Family Tree DB', extensions: ['ftdb', 'sqlite', 'db'] }],
    })
    if (canceled || !filePaths?.[0]) return { ok: false, canceled: true }
    openProject(filePaths[0])
    return { ok: true, path: filePaths[0] }
  } catch (e) {
    console.error('project:open failed', e)
    return { ok: false, error: String(e) }
  }
})

ipcMain.handle('project:saveAs', async () => {
  try {
    assertOpen()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save Family Tree As…',
      defaultPath: currentProjectPath,
      filters: [{ name: 'Family Tree DB', extensions: ['ftdb'] }],
    })
    if (canceled || !filePath) return { ok: false, canceled: true }
    fs.copyFileSync(currentProjectPath, filePath)
    return { ok: true, path: filePath }
  } catch (e) {
    console.error('project:saveAs failed', e)
    return { ok: false, error: String(e) }
  }
})

/* -------- DB commands -------- */

ipcMain.handle('db:listPeople', async () => {
  try {
    assertOpen()
    return DB.listPeople()
  } catch (e) {
    console.error('listPeople error', e)
    throw e
  }
})

ipcMain.handle('db:getPerson', async (_e, id) => {
  try {
    assertOpen()
    return DB.getPerson(id)
  } catch (e) {
    console.error('getPerson error', e)
    throw e
  }
})

ipcMain.handle('db:createPerson', async (_e, payload) => {
  try {
    assertOpen()
    return DB.createPerson(payload || {})
  } catch (e) {
    console.error('createPerson error', e)
    throw e
  }
})

ipcMain.handle('db:updatePerson', async (_e, payload) => {
  try {
    assertOpen()
    return DB.updatePerson(payload || {})
  } catch (e) {
    console.error('updatePerson error', e)
    throw e
  }
})
