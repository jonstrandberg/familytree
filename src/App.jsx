import React, { useEffect, useState } from 'react'
import { api } from './api.js'
import PeopleList from './ui/PeopleList.jsx'
import PersonForm from './ui/PersonForm.jsx'
import './styles.css'
import PedigreeTree from './ui/PedigreeTree.jsx'

export default function App() {
  const [people, setPeople] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [projectOpen, setProjectOpen] = useState(false)
  const [view, setView] = useState('tree') // 'tree' | 'edit'
  const [showDrawer, setShowDrawer] = useState(false) // editor drawer over the Tree

  async function refresh() {
    try {
      const rows = await api.listPeople()
      setPeople(rows || [])
    } catch {
      setPeople([])
    }
  }

  useEffect(() => {
    if (projectOpen) refresh()
  }, [projectOpen])

  // Hotkeys: Ctrl+1 = Tree, Ctrl+2 = Edit
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === '1') setView('tree')
      if (e.ctrlKey && e.key === '2') setView('edit')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Open editor drawer from Tree or Add button
  function openEditorFor(id) {
    setCurrentId(id)
    setShowDrawer(true)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh' }}>
      <aside className="sidebar">
        <div className="toolbar">
          <button onClick={async () => { await api.projectNew(); setProjectOpen(true) }}>New</button>
          <button onClick={async () => { await api.projectOpen(); setProjectOpen(true) }}>Open</button>
          <button onClick={async () => { await api.projectSaveAs() }}>Save As</button>
        </div>

        <div className="viewtabs">
          <button aria-selected={view === 'tree'} onClick={() => setView('tree')}>Tree</button>
          <button aria-selected={view === 'edit'} onClick={() => setView('edit')}>Edit</button>
        </div>

        {/* Always allow adding/selecting people, in both views */}
        {projectOpen && (
          <>
            <button className="ghost" onClick={async () => {
              const res = await api.createPerson?.({ given: 'New', family: 'Person' })
              if (res?.person?.id) {
                setCurrentId(res.person.id)
                setShowDrawer(true)     // open editor immediately
              }
              refresh()
            }}>
              + Add person
            </button>

            <PeopleList
              people={people}
              onSelect={(id) => {
                setCurrentId(id)
                if (view === 'tree') setShowDrawer(true) // in Tree view, open drawer
              }}
              currentId={currentId}
            />
          </>
        )}
      </aside>

      <main className="main" style={{ height: '100vh', position: 'relative' }}>
        {view === 'tree' ? (
          <>
            <PedigreeTree
              onSelectPerson={(id) => {
                if (!id) return
                openEditorFor(id)
              }}
            />

            {/* Drawer editor on top of the tree */}
            {showDrawer && currentId && (
              <div className="drawer">
                <div className="drawer-header">
                  <button className="close" onClick={() => setShowDrawer(false)}>Close</button>
                </div>
                <PersonForm id={currentId} onSaved={refresh} />
              </div>
            )}
          </>
        ) : currentId ? (
          <PersonForm id={currentId} onSaved={refresh} />
        ) : (
          <p>{projectOpen ? 'Select a person to edit.' : 'Create or open a project to begin.'}</p>
        )}
      </main>
    </div>
  )
}
