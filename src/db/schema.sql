CREATE TABLE IF NOT EXISTS person (
id TEXT PRIMARY KEY,
sex TEXT CHECK (sex IN ('M','F','U')) DEFAULT 'U',
birth_date TEXT,
birth_place_id TEXT,
death_date TEXT,
death_place_id TEXT,
notes TEXT,
created_at TEXT NOT NULL,
updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS person_name (
id TEXT PRIMARY KEY,
person_id TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
given TEXT,
family TEXT,
suffix TEXT,
prefix TEXT,
nickname TEXT,
is_primary INTEGER DEFAULT 0
);


CREATE INDEX IF NOT EXISTS idx_personname_family_given ON person_name(family, given);