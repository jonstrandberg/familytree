import React, { useEffect, useState, useCallback, useRef } from 'react'
import { api } from './api.js'
import PeopleList from './ui/PeopleList.jsx'
import PersonForm from './ui/PersonForm.jsx'
import PedigreeTree from './ui/PedigreeTree.jsx'
import './styles.css'

const BINDINGS_KEY = 'ft.bindings'

const loadBindings = () => {
  try { return JSON.parse(localStorage.getItem(BINDINGS_KEY) || '{}') } catch { return {} }
}
const saveBindings = (b) => { try { localStorage.setItem(BINDINGS_KEY, JSON.stringify(b || {})) } catch {} }

const nameFrom = (p) => {
  if (!p) return ''
  const parts = [p.given, p.family].filter(Boolean)
  return parts.join(' ').trim()
}

const parseNodeLabel = (rawLabel) => {
  const raw = (rawLabel || '').trim()
  if (!raw) return { given: 'Unknown', family: '' }
  if (/^you$/i.test(raw)) return { given: 'You', family: '' }
  // "Grandfather, Maternal" -> given="Maternal", family="Grandfather"
  if (raw.includes(',')) {
    const [a, b] = raw.split(',').map(s => s.trim())
    if (a && b) return { given: b, family: a }
  }
  return { given: raw, family: '' }
}

export default function App() {
  const [people, setPeople] = useState([])
  const [bindings, setBindings] = useState(loadBindings())   // treeId -> personId
  const [currentId, setCurrentId] = useState(null)
  const [projectOpen, setProjectOpen] = useState(false)
  const [view, setView] = useState('tree')                   // 'tree' | 'edit'
  const [showDrawer, setShowDrawer] = useState(false)        // right editor
  const [busyText, setBusyText] = useState('')
  const [errorBanner, setErrorBanner] = useState('')
  const seededOnceRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const rows = await api?.listPeople?.()
      setPeople(Array.isArray(rows) ? rows : [])
    } catch (e) {
      console.error('listPeople failed', e)
      setPeople([])
    }
  }, [])
  useEffect(() => { if (projectOpen) refresh() }, [projectOpen, refresh])

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === '1') setView('tree')
      if (e.ctrlKey && e.key === '2') { setView('edit'); setShowDrawer(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const withTimeout = useCallback((promise, ms = 8000) =>
    new Promise((resolve) => {
      let done = false
      const t = setTimeout(() => { if (!done) resolve({ ok: false, timeout: true }) }, ms)
      Promise.resolve(promise)
        .then(v => { done = true; clearTimeout(t); resolve(v) })
        .catch(e => { done = true; clearTimeout(t); resolve({ ok: false, error: String(e) }) })
    })
  , [])

  const seedIfEmpty = useCallback(async () => {
    if (seededOnceRef.current) return null
    const rows = await api?.listPeople?.()
    if (Array.isArray(rows) && rows.length > 0) { seededOnceRef.current = true; return null }

    const seeds = [
      { treeId: 'you',  given: 'You',      family: '' },
      { treeId: 'f',    given: 'Father',   family: '' },
      { treeId: 'm',    given: 'Mother',   family: '' },
      { treeId: 'gf1',  given: 'Maternal', family: 'Grandfather' },
      { treeId: 'gm1',  given: 'Maternal', family: 'Grandmother' },
      { treeId: 'gf2',  given: 'Paternal', family: 'Grandfather' },
      { treeId: 'gm2',  given: 'Paternal', family: 'Grandmother' },
    ]

    const next = { ...bindings }
    for (const s of seeds) {
      const res = await api?.createPerson?.({ given: s.given, family: s.family })
      if (res?.person?.id) next[s.treeId] = res.person.id
    }
    setBindings(next)
    saveBindings(next)
    seededOnceRef.current = true
    return next
  }, [bindings])

  const openProject = useCallback(async (fn) => {
    setErrorBanner('')
    setShowDrawer(false)               // drawer must be closed while busy
    setCurrentId(null)
    setBusyText('Opening project…')
    const res = await withTimeout(fn(), 8000)
    setBusyText('')
    if (res?.ok) {
      setProjectOpen(true)
      await seedIfEmpty()
      await refresh()
      return true
    } else if (!res?.canceled) {
      setErrorBanner(res?.timeout ? 'Opening project timed out.' : (res?.error || 'Could not open project.'))
    }
    return false
  }, [seedIfEmpty, refresh, withTimeout])

  const ensureProject = useCallback(async () => {
    if (projectOpen) return true
    return openProject(() => api?.projectNew?.())
  }, [projectOpen, openProject])

  useEffect(() => {
    const off = window.api?.onStatus?.((msg) => {
      if (msg?.type === 'project') {
        setProjectOpen(true); setBusyText(''); setErrorBanner(''); refresh()
      }
    })
    return () => { off && off() }
  }, [refresh])

  const findPersonByLabel = useCallback((label) => {
    const raw = (label || '').trim()
    if (!raw) return null
    const exact = people.find(p => nameFrom(p).toLowerCase() === raw.toLowerCase())
    return exact?.id || null
  }, [people])

  const openEditorFor = useCallback(async (sel) => {
    if (!(await ensureProject())) return

    // From PeopleList (person id)
    if (typeof sel === 'string') {
      setCurrentId(sel)
      if (view === 'tree') setShowDrawer(true)
      return
    }

    // From PedigreeTree (node object)
    if (sel && typeof sel === 'object') {
      const treeId = sel.id
      let personId = bindings[treeId] || sel.personId

      if (!personId) {
        personId = findPersonByLabel(sel.name)
        if (!personId) {
          const { given, family } = parseNodeLabel(sel.name)
          const created = await api?.createPerson?.({
            given, family, occupation: sel.attributes?.occupation || ''
          })
          personId = created?.person?.id
        }
        if (personId) {
          setBindings(prev => {
            const next = { ...prev, [treeId]: personId }
            saveBindings(next)
            return next
          })
        }
      }

      if (personId) {
        setCurrentId(personId)
        if (view === 'tree') setShowDrawer(true)
        await refresh()
      }
    }
  }, [ensureProject, view, bindings, refresh, findPersonByLabel])

  useEffect(() => { saveBindings(bindings) }, [bindings])

  const sidebarStyle = { borderRight: '1px solid #1f2937', padding: 12, background: '#0b1020', color: '#e5e7eb' }
  const drawerStyle = {
    position: 'fixed', top: 0, right: 0, height: '100%', width: 420,
    background: '#0b1020', color: '#e5e7eb', borderLeft: '1px solid #374151',
    boxShadow: '-20px 0 40px rgba(0,0,0,.35)', padding: 16, zIndex: 50, overflow: 'auto'
  }
  const closeBtn = {
    background: 'transparent', color: '#93c5fd', border: '1px solid #374151',
    borderRadius: 8, padding: '6px 10px', cursor: 'pointer', float: 'right'
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh' }}>
      <aside style={sidebarStyle}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => openProject(() => api?.projectNew?.())}>New</button>
          <button onClick={() => openProject(() => api?.projectOpen?.())}>Open</button>
          <button onClick={async () => { await api?.projectSaveAs?.() }}>Save As</button>
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '8px 0 14px' }}>
          <button onClick={() => setView('tree')} aria-selected={view === 'tree'}>Tree</button>
          <button onClick={() => { setView('edit'); setShowDrawer(false) }} aria-selected={view === 'edit'}>Edit</button>
        </div>

        {projectOpen && (
          <>
            <button className="ghost" onClick={async () => {
              if (!(await ensureProject())) return
              const res = await api?.createPerson?.({ given: 'New', family: '' })
              if (res?.person?.id) {
                setCurrentId(res.person.id)
                if (view === 'tree') setShowDrawer(true)
                refresh()
              }
            }}>+ Add person</button>

            <PeopleList people={people} onSelect={id => openEditorFor(id)} currentId={currentId} />
          </>
        )}
      </aside>

      <main style={{ height: '100vh', position: 'relative', padding: view === 'edit' ? 16 : 0 }}>
        {errorBanner && (
          <div style={{
            position: 'absolute', top: 12, left: 16, right: 16,
            background: '#7f1d1d', color: '#fff', padding: '8px 12px',
            borderRadius: 8, border: '1px solid #fecaca'
          }}>
            {errorBanner}
          </div>
        )}

        {view === 'tree' ? (
          <>
            <PedigreeTree
              people={people}
              bindings={bindings}
              onSelectPerson={(node) => openEditorFor(node)}
            />
            {!busyText && showDrawer && currentId && (
              <div style={drawerStyle}>
                <button style={closeBtn} onClick={() => setShowDrawer(false)}>Close</button>
                <div style={{ clear: 'both', marginTop: 8 }}>
                  <PersonForm id={currentId} onSaved={async () => { await refresh() }} />
                </div>
              </div>
            )}
          </>
        ) : currentId ? (
          <PersonForm id={currentId} onSaved={refresh} />
        ) : (
          <p>{projectOpen ? 'Select a person to edit.' : 'Create or open a project to begin.'}</p>
        )}

        {busyText && (
          <div style={{
            position: 'fixed', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,.35)', zIndex: 1000
          }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: 10,
              background: '#0b1020',
              color: '#e5e7eb',
              border: '1px solid #374151',
              boxShadow: '0 10px 30px rgba(0,0,0,.4)'
            }}>
              {busyText}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
