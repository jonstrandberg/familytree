// electron/db.js
import Database from 'better-sqlite3'

let db = null

export function open(databasePath) {
  if (db) db.close()
  db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  init()
}

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY,
      birth_date TEXT DEFAULT '',
      death_date TEXT DEFAULT '',
      occupation TEXT DEFAULT '',
      sex TEXT DEFAULT 'U',
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS names (
      id INTEGER PRIMARY KEY,
      person_id INTEGER NOT NULL,
      given TEXT DEFAULT '',
      family TEXT DEFAULT '',
      is_primary INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE,
      UNIQUE(person_id, is_primary)
    );
  `)
}

function assertOpen() {
  if (!db) throw new Error('No project is open. Call project:new or project:open first.')
}

export function listPeople() {
  assertOpen()
  return db.prepare(`
    SELECT p.id,
           COALESCE(n.given,'')  AS given,
           COALESCE(n.family,'') AS family,
           COALESCE(p.birth_date,'') AS birth_date,
           COALESCE(p.death_date,'') AS death_date,
           COALESCE(p.occupation,'') AS occupation
    FROM people p
    LEFT JOIN names n
      ON n.person_id = p.id AND n.is_primary = 1
    ORDER BY family, given, p.id
  `).all()
}

export function getPerson(id) {
  assertOpen()
  const person = db.prepare(`SELECT * FROM people WHERE id = ?`).get(id)
  const names  = db.prepare(`
    SELECT id, given, family, is_primary
    FROM names
    WHERE person_id = ?
    ORDER BY is_primary DESC, id
  `).all(id)
  return { person, names }
}

export function createPerson({ given = '', family = '', birth_date = '', occupation = '' } = {}) {
  assertOpen()
  const tx = db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO people (birth_date, death_date, occupation, sex, notes)
      VALUES (?, '', ?, 'U', '')
    `).run(birth_date, occupation)
    const pid = res.lastInsertRowid
    db.prepare(`
      INSERT INTO names (person_id, given, family, is_primary)
      VALUES (?, ?, ?, 1)
    `).run(pid, given, family)
    return pid
  })
  const id = tx()
  return getPerson(id)
}

export function updatePerson({
  id,
  given = '',
  family = '',
  birth_date = '',
  death_date = '',
  occupation = '',
  sex = 'U',
  notes = ''
}) {
  assertOpen()
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE people
         SET birth_date = ?, death_date = ?, occupation = ?, sex = ?, notes = ?
       WHERE id = ?
    `).run(birth_date, death_date, occupation, sex, notes, id)

    db.prepare(`
      INSERT INTO names (person_id, given, family, is_primary)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(person_id, is_primary)
      DO UPDATE SET given = excluded.given, family = excluded.family
    `).run(id, given, family)
  })
  tx()
  return getPerson(id)
}
