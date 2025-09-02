// src/App.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { api } from './api.js'
import PeopleList from './ui/PeopleList.jsx'
import PersonForm from './ui/PersonForm.jsx'
import PedigreeTree from './ui/PedigreeTree.jsx'

export default function App() {
  const [people, setPeople] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [projectOpen, setProjectOpen] = useState(false)
  const [view, setView] = useState('tree')      // 'tree' | 'edit'
  const [showDrawer, setShowDrawer] = useState(false)
  const [bindings, setBindings] = useState({})  // treeId -> personId

  // UI feedback
  const [busyText, setBusyText] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  const refresh = useCallback(async () => {
    try {
      const rows = await api?.listPeople?.()
      setPeople(rows || [])
    } catch (e) {
      console.error('listPeople failed', e)
      setPeople([])
    }
  }, [])

  useEffect(() => { if (projectOpen) refresh() }, [projectOpen, refresh])

  // Hotkeys
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === '1') setView('tree')
      if (e.ctrlKey && e.key === '2') setView('edit')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Utility: promise with timeout so UI never hangs
  const withTimeout = useCallback((promise, ms = 4000) => {
    return new Promise((resolve) => {
      let settled = false
      const t = setTimeout(() => {
        if (!settled) resolve({ ok: false, timeout: true })
      }, ms)
      Promise.resolve(promise)
        .then(v => { settled = true; clearTimeout(t); resolve(v) })
        .catch(e => { settled = true; clearTimeout(t); resolve({ ok: false, error: String(e) }) })
    })
  }, [])

  // Ensure a project DB exists before any DB call
  const ensureProject = useCallback(async () => {
    if (projectOpen) return true
    setErrorBanner('')
    setBusyText('Opening project…')
    const res = await withTimeout(api?.projectNew?.(), 6000)
    setBusyText('') // ALWAYS clear UI
    if (res?.ok) {
      setProjectOpen(true)
      await refresh()
      return true
    }
    console.warn('projectNew failed/timed out:', res)
    setErrorBanner(res?.timeout ? 'Opening project timed out.' : (res?.error || 'Could not open project.'))
    return false
  }, [projectOpen, refresh, withTimeout])

  // Auto open once on first load
  useEffect(() => { void ensureProject() }, [ensureProject])

  // Also react if main sends a status after it opens the DB
  useEffect(() => {
    const off = window.api?.onStatus?.((msg) => {
      if (msg?.type === 'project') {
        setProjectOpen(true)
        setBusyText('')
        setErrorBanner('')
        refresh()
      }
    })
    return () => { off && off() }
  }, [refresh])

  // Optimistic local update after saving, then hard refresh
  const applySavedAndRefresh = useCallback((updated) => {
    if (updated?.id) {
      setPeople(prev => {
        const i = prev.findIndex(p => p.id === updated.id)
        if (i === -1) return [...prev, updated]
        const cp = prev.slice()
        cp[i] = { ...cp[i], ...updated }
        return cp
      })
    }
    refresh()
  }, [refresh])

  // Open editor from the list (id) or from the tree (node object)
  const openEditorFor = useCallback(async (sel) => {
    if (!(await ensureProject())) return

    if (typeof sel === 'string') {
      setCurrentId(sel)
      if (view === 'tree') setShowDrawer(true)
      return
    }

    if (sel && typeof sel === 'object') {
      const treeId = sel.id
      let personId = bindings[treeId] || sel.personId

      if (!personId) {
        const created = await api?.createPerson?.({ given: '', family: '' })
        personId = created?.person?.id
        if (personId) {
          setBindings(prev => ({ ...prev, [treeId]: personId }))
          await refresh()
        }
      }

      if (personId) {
        setCurrentId(personId)
        if (view === 'tree') setShowDrawer(true)
      }
    }
  }, [ensureProject, view, bindings, refresh])

  // Styles
  const sidebarStyle = { borderRight: '1px solid #ddd', padding: 12, background: '#fff' }
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
          <button onClick={async () => {
            setErrorBanner('')
            setBusyText('Opening project…')
            const res = await withTimeout(api?.projectNew?.(), 6000)
            setBusyText('')
            if (res?.ok) {
              setProjectOpen(true); setBindings({}); setCurrentId(null); refresh()
            } else {
              setErrorBanner(res?.timeout ? 'Opening project timed out.' : (res?.error || 'Could not open project.'))
            }
          }}>New</button>

          <button onClick={async () => {
            setErrorBanner('')
            setBusyText('Opening project…')
            const res = await withTimeout(api?.projectOpen?.(), 6000)
            setBusyText('')
            if (res?.ok) {
              setProjectOpen(true); setBindings({}); setCurrentId(null); refresh()
            } else if (!res?.canceled) {
              setErrorBanner(res?.timeout ? 'Opening project timed out.' : (res?.error || 'Could not open project.'))
            }
          }}>Open</button>

          <button onClick={async () => { await api?.projectSaveAs?.() }}>Save As</button>
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '8px 0 14px' }}>
          <button onClick={() => setView('tree')} aria-selected={view === 'tree'}>Tree</button>
          <button onClick={() => setView('edit')} aria-selected={view === 'edit'}>Edit</button>
        </div>

        {projectOpen && (
          <>
            <button onClick={async () => {
              if (!(await ensureProject())) return
              const res = await api?.createPerson?.({ given: 'New', family: 'Person' })
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
            {showDrawer && currentId && (
              <div style={drawerStyle}>
                <button style={closeBtn} onClick={() => setShowDrawer(false)}>Close</button>
                <div style={{ clear: 'both', marginTop: 8 }}>
                  <PersonForm id={currentId}
                              onSaved={(u) => { applySavedAndRefresh(u); setShowDrawer(false) }} />
                </div>
              </div>
            )}
          </>
        ) : currentId ? (
          <PersonForm id={currentId} onSaved={applySavedAndRefresh} />
        ) : (
          <p>{projectOpen ? 'Select a person to edit.' : 'Create or open a project to begin.'}</p>
        )}

        {/* Global busy overlay */}
        {busyText && (
          <div style={{
            position: 'fixed', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,.35)', zIndex: 1000
          }}>
            <div style={{
              padding: '14px 18px', borderRadius: 10, background: '#0b1020', color: '#e5e7eb',
              border: '1px solid #374151', boxShadow: '0 10px 30px rgba(0,0,0,.4)'
            }}>
              {busyText}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
