// src/api.js
// Renderer-side wrapper over window.api to keep shapes consistent with the UI and DB.

function flattenPerson(resp) {
  // resp is { person, names[] } from db.getPerson
  if (!resp || !resp.person) return null
  const p = resp.person || {}
  const names = Array.isArray(resp.names) ? resp.names : []
  const primary = names[0] || {}
  return {
    id: p.id,
    given: primary.given || '',
    family: primary.family || '',
    birth_date: p.birth_date || '',
    death_date: p.death_date || '',
    occupation: p.occupation || '',
    sex: p.sex || 'U',
    notes: p.notes || '',
  }
}

export const api = {
  /* ---------- Project (preload already wraps with { ok, data|error }) ---------- */
  projectNew:    (...a) => window.api?.projectNew?.(...a),
  projectOpen:   (...a) => window.api?.projectOpen?.(...a),
  projectSaveAs: (...a) => window.api?.projectSaveAs?.(...a),

  /* ---------- People ---------- */

  // Used by App/PeopleList. DB already returns rows in the right shape.
  listPeople: async () => window.api?.listPeople?.(),

  // Form needs a flat object; we flatten { person, names[] } here.
  getPerson: async (id) => {
    const raw = await window.api?.getPerson?.(id)
    return flattenPerson(raw)
  },

  // App expects res.person.id after create -> keep pass-through.
  // DB accepts { given, family, birth_date?, occupation? }
  createPerson: async (payload = {}) => {
    return window.api?.createPerson?.({
      given:       payload.given || '',
      family:      payload.family || '',
      birth_date:  payload.birth_date || '',
      occupation:  payload.occupation || '',
    })
  },

  // Critical: send ONE object (includes id) and return { ok, data|error }
  updatePerson: async (id, data = {}) => {
    const payload = {
      id,
      given:       data.given ?? '',
      family:      data.family ?? '',
      birth_date:  data.birth_date ?? '',
      death_date:  data.death_date ?? '',
      occupation:  data.occupation ?? '',
      sex:         data.sex ?? 'U',
      notes:       data.notes ?? '',
    }
    try {
      const out = await window.api?.updatePerson?.(payload) // -> { person, names }
      return { ok: true, data: out }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  },

  // Optional status pings used by App
  onStatus: (fn) => window.api?.onStatus?.(fn),
}
