import React, { useMemo, useRef, useState, useEffect } from 'react'
import Tree from 'react-d3-tree'

const Silhouette = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="8" r="4" fill="#6b7280"/>
    <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" fill="#374151"/>
  </svg>
)

// Demo pedigree so you immediately see something
const sample = {
  id: 'you', name: 'You', dates: '1988–Living', occupation: '—',
  father: {
    id: 'f', name: 'Father', dates: '1960–', occupation: 'Carpenter',
    father: { id: 'gf1', name: 'Paternal Grandfather', dates: '1931–1998' },
    mother: { id: 'gm1', name: 'Paternal Grandmother', dates: '1933–2001' }
  },
  mother: {
    id: 'm', name: 'Mother', dates: '1962–', occupation: 'Teacher',
    father: { id: 'gf2', name: 'Maternal Grandfather', dates: '1930–2000' },
    mother: { id: 'gm2', name: 'Maternal Grandmother', dates: '1932–2010' }
  }
}

function formatDates(b, d) {
  const left = (b || '').trim()
  const right = (d || '').trim()
  if (left && right) return `${left}–${right}`
  if (left) return `${left}–`
  if (right) return `–${right}`
  return '—'
}

// Build react-d3-tree data; if a node is bound to a person, show that person’s data
function buildTreeWithBindings(node, bindings, peopleById) {
  const boundId = bindings[node.id]
  const person = boundId ? peopleById.get(boundId) : null

  const displayName = person
    ? [person.given, person.family].filter(Boolean).join(' ') || '—'
    : node.name

  const displayDates = person ? formatDates(person.birth_date, person.death_date) : node.dates
  const displayOccupation = person ? (person.occupation || '') : (node.occupation || '')

  const children = []
  if (node.father) children.push(buildTreeWithBindings(node.father, bindings, peopleById))
  if (node.mother) children.push(buildTreeWithBindings(node.mother, bindings, peopleById))

  return {
    name: displayName,
    attributes: { dates: displayDates, occupation: displayOccupation },
    nodeData: { ...node, name: displayName, dates: displayDates, occupation: displayOccupation },
    children
  }
}

function Node({ nodeDatum, onPick }) {
  const nd = nodeDatum.nodeData || {}
  return (
    <foreignObject width={230} height={100} x={-115} y={-50}>
      <div
        style={{
          width: 210, minHeight: 92, background: '#0b1020', color: '#e5e7eb',
          border: '1px solid #374151', borderRadius: 14,
          boxShadow: '0 10px 24px rgba(0,0,0,.25)', display: 'flex',
          gap: 12, alignItems: 'center', padding: 10, cursor: 'pointer'
        }}
        onClick={() => onPick && onPick(nd)}  // pass the tree node (includes its .id)
      >
        <div style={{
          width: 54, height: 54, borderRadius: 10, background: '#111827',
          border: '1px solid #374151', display: 'flex',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
          <Silhouette/>
        </div>
        <div>
          <div style={{ fontWeight: 800, lineHeight: 1.05 }}>{nodeDatum.name || '—'}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{nodeDatum.attributes?.dates || '—'}</div>
          {nodeDatum.attributes?.occupation && (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{nodeDatum.attributes.occupation}</div>
          )}
        </div>
      </div>
    </foreignObject>
  )
}

/**
 * Props:
 *  - people: array of person records from your API
 *  - bindings: { [treeId]: personId }
 *  - onSelectPerson: (treeNodeObject) => void
 */
export default function PedigreeTree({ people = [], bindings = {}, onSelectPerson }) {
  const peopleById = useMemo(() => new Map(people.map(p => [p.id, p])), [people])
  const data = useMemo(
    () => buildTreeWithBindings(sample, bindings, peopleById),
    [bindings, peopleById]
  )

  const ref = useRef(null)
  const [size, setSize] = useState({ width: 1000, height: 700 })

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height })
    )
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  // Re-mount tree when people/bindings change so labels update
  const treeKey = JSON.stringify({
    b: bindings,
    p: people.map(p => ({ id: p.id, g: p.given, f: p.family, b: p.birth_date, d: p.death_date, o: p.occupation }))
  })

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', background: 'var(--canvas, #111827)' }}>
      <Tree
        key={treeKey}
        data={data}
        orientation="horizontal"
        translate={{ x: 260, y: size.height / 2 }}
        separation={{ siblings: 1.1, nonSiblings: 1.3 }}
        pathFunc="step"
        allowForeignObjects
        renderCustomNodeElement={(props) => <Node {...props} onPick={onSelectPerson} />}
        zoomable
      />
    </div>
  )
}
