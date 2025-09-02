import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function PersonForm({ id, projectOpen = false, onSaved }) {
  const [person, setPerson] = useState(null)
  const [primary, setPrimary] = useState({ given: '', family: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    // do not hit DB until a project is open and we have a valid id
    if (!projectOpen || !id) {
      setPerson(null)
      return
    }

    ;(async () => {
      try {
        const res = await api?.getPerson?.(id)
        if (cancelled) return
        const p = res?.person || { id, sex: 'U' }
        setPerson(p)
        const nm = (res?.names?.find(n => n.is_primary)) || {}
        setPrimary({
          given: nm.given ?? p.given ?? '',
          family: nm.family ?? p.family ?? ''
        })
        setError(null)
      } catch (e) {
        console.error('getPerson failed', e)
        if (!cancelled) {
          setError('Could not load person.')
          setPerson({ id, sex: 'U' })
        }
      }
    })()

    return () => { cancelled = true }
  }, [id, projectOpen])

  if (!projectOpen) return <p>Opening project…</p>
  if (!person) return <p>Loading…</p>

  const onChange = (k, v) => setPerson(p => ({ ...p, [k]: v }))

  const save = async () => {
    try {
      setSaving(true)
      setSavedMsg('')
      const res = await api?.updatePerson?.({
        id: person.id,
        given: primary.given,
        family: primary.family,
        birth_date: person.birth_date || '',
        death_date: person.death_date || '',
        sex: person.sex || 'U',
        occupation: person.occupation || '',
        notes: person.notes || ''
      })
      if (res?.person) setPerson(res.person)
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 1200)
      onSaved?.(res?.person)
    } catch (e) {
      console.error('updatePerson failed', e)
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
      <h2>Edit person</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>Given name
          <input
            value={primary.given}
            onChange={e => setPrimary(s => ({ ...s, given: e.target.value }))}
          />
        </label>

        <label>Family name
          <input
            value={primary.family}
            onChange={e => setPrimary(s => ({ ...s, family: e.target.value }))}
          />
        </label>

        <label>Birth date
          <input
            value={person.birth_date || ''}
            onChange={e => onChange('birth_date', e.target.value)}
            placeholder="e.g. 1988-03-21 or 21 Mar 1988"
          />
        </label>

        <label>Death date
          <input
            value={person.death_date || ''}
            onChange={e => onChange('death_date', e.target.value)}
            placeholder="optional"
          />
        </label>

        <label>Sex
          <select
            value={person.sex || 'U'}
            onChange={e => onChange('sex', e.target.value)}
          >
            <option value="U">Unknown</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </label>

        <label>Occupation
          <input
            value={person.occupation || ''}
            onChange={e => onChange('occupation', e.target.value)}
          />
        </label>
      </div>

      <label style={{ display: 'block', marginTop: 12 }}>Notes
        <textarea
          rows={6}
          style={{ width: '100%' }}
          value={person.notes || ''}
          onChange={e => onChange('notes', e.target.value)}
        />
      </label>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {savedMsg && <span style={{ color: '#22c55e', fontWeight: 600 }}>{savedMsg}</span>}
      </div>
    </div>
  )
}
