import React from 'react'


export default function PeopleList({ people, onSelect, currentId }) {
return (
<div style={{ marginTop: 12 }}>
{people.map(p => (
<div key={p.id}
onClick={() => onSelect(p.id)}
style={{ padding: 8, borderRadius: 6, marginBottom: 6, cursor: 'pointer', background: currentId===p.id? '#eef6ff':'#f7f7f7' }}>
<div style={{ fontWeight: 600 }}>{p.family || '(no surname)'}, {p.given || '(no given)'}</div>
<div style={{ fontSize: 12, color: '#666' }}>{p.birth_date || '—'} — {p.death_date || '—'}</div>
</div>
))}
</div>
)
}