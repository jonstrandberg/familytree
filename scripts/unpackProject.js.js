// scripts/unpackProject.js
import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'


export async function unpackProject(filePath, projectDir) {
const buf = await fs.readFile(filePath)
const zip = await JSZip.loadAsync(buf)


await fs.mkdir(projectDir, { recursive: true })
// db
const dbFile = zip.file('db.sqlite')
if (!dbFile) throw new Error('Invalid project: missing db.sqlite')
await fs.writeFile(path.join(projectDir, 'db.sqlite'), await dbFile.async('nodebuffer'))
// media
const mediaFolder = zip.folder('media')
if (mediaFolder) {
const out = path.join(projectDir, 'media')
await fs.mkdir(out, { recursive: true })
const files = Object.values(mediaFolder.files)
for (const f of files) {
if (!f.dir) {
const data = await f.async('nodebuffer')
await fs.writeFile(path.join(out, path.basename(f.name)), data)
}
}
}
}