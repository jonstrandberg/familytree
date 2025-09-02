// src/ui/PersonForm.jsx
import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function PersonForm({ id, onSaved }) {
  const [form, setForm] = useState({
    given: '',
    family: '',
    birth_date: '',
    death_date: '',
    occupation: '',
    sex: 'U',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const p = await api.getPerson(id) // flattened in api.js
        if (!live || !p) return
        setForm({
          given: p.given || '',
          family: p.family || '',
          birth_date: p.birth_date || '',
          death_date: p.death_date || '',
          occupation: p.occupation || '',
          sex: p.sex || 'U',
          notes: p.notes || '',
        })
      } catch (e) {
        if (live) setError(String(e?.message || e))
      }
    }
    if (id) load()
    return () => { live = false }
  }, [id])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await api.updatePerson(id, form) // sends one object with id + DB keys
      if (!res?.ok) throw new Error(res?.error || 'Save failed')
      onSaved && onSaved()
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'grid', gap: 10 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Edit person</h3>

      {error && (
        <div style={{ background: '#7f1d1d', color: '#fff', padding: 8, borderRadius: 8 }}>
          {error}
        </div>
      )}

      <label style={{ display: 'grid', gap: 4 }}>
        <span>Given name</span>
        <input value={form.given} onChange={e => update('given', e.target.value)} />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span>Family name</span>
        <input value={form.family} onChange={e => update('family', e.target.value)} />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span>Birth</span>
        <input
          value={form.birth_date}
          onChange={e => update('birth_date', e.target.value)}
          placeholder="YYYY or free text"
        />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span>Death</span>
        <input
          value={form.death_date}
          onChange={e => update('death_date', e.target.value)}
          placeholder="YYYY or free text"
        />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span>Occupation</span>
        <input value={form.occupation} onChange={e => update('occupation', e.target.value)} />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span>Notes</span>
        <textarea
          rows={5}
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

