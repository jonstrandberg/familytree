import React, { useMemo } from 'react'

const formatName = (p) => {
  const a = (p.given || '').trim()
  const b = (p.family || '').trim()
  return (a && b) ? `${a} ${b}` : (a || b || 'Unknown')
}

export default function PeopleList({ people = [], onSelect, currentId }) {
  const sorted = useMemo(() => {
    const arr = [...people]
    arr.sort((a, b) => (formatName(a)).localeCompare(formatName(b)))
    return arr
  }, [people])

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect?.(p.id)}
          style={{
            textAlign: 'left',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #1f2937',
            background: p.id === currentId ? '#0f172a' : '#0b1020',
            color: '#e5e7eb',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontWeight: 600 }}>{formatName(p)}</div>
          <div style={{ opacity: .55, fontSize: 12 }}>{p.occupation || '—'}</div>
        </button>
      ))}
    </div>
  )
}
