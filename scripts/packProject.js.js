// scripts/packProject.js
import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'


export async function packProject(projectDir, outFile) {
const zip = new JSZip()
const dbPath = path.join(projectDir, 'db.sqlite')
const mediaDir = path.join(projectDir, 'media')


const dbBuffer = await fs.readFile(dbPath)
zip.file('db.sqlite', dbBuffer)


// include media folder if exists
try {
const entries = await fs.readdir(mediaDir)
for (const name of entries) {
const p = path.join(mediaDir, name)
const buf = await fs.readFile(p)
zip.folder('media').file(name, buf)
}
} catch {}


const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
await fs.writeFile(outFile, content)
}