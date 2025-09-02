// src/ui/PedigreeTree.jsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import Tree from 'react-d3-tree'

const CARD_W = 210
const CARD_H = 56

const COLORS = {
  bg: '#0b1325',
  border: '#1f2a44',
  text: '#e5e7eb',
  sub: 'rgba(229,231,235,.65)',
  link: '#273349',
}

const fullName = (p) => {
  if (!p) return ''
  const a = (p.given || '').trim()
  const b = (p.family || '').trim()
  return [a, b].filter(Boolean).join(' ') || '—'
}

const fallbackLabel = (treeId) => {
  switch (treeId) {
    case 'you': return 'You'
    case 'f':   return 'Father'
    case 'm':   return 'Mother'
    case 'gfP': return 'Grandfather, Paternal'
    case 'gmP': return 'Grandmother, Paternal'
    case 'gfM': return 'Grandfather, Maternal'
    case 'gmM': return 'Grandmother, Maternal'
    default:    return treeId
  }
}

export default function PedigreeTree({ people = [], bindings = {}, onSelectPerson }) {
  const containerRef = useRef(null)
  const [translate, setTranslate] = useState({ x: 160, y: 300 })

  // center vertically, keep root at the left
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const h = el.clientHeight || 600
      setTranslate({ x: 160, y: Math.max(140, h / 2) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const peopleById = useMemo(() => {
    const m = new Map()
    for (const p of people) m.set(p.id, p)
    return m
  }, [people])

  const labelFor = useCallback((treeId) => {
    const pid = bindings?.[treeId]
    const person = pid ? peopleById.get(pid) : null
    return person ? fullName(person) : fallbackLabel(treeId)
  }, [bindings, peopleById])

  const subtitleFor = useCallback((treeId) => {
    const pid = bindings?.[treeId]
    const person = pid ? peopleById.get(pid) : null
    return person?.occupation || '—'
  }, [bindings, peopleById])

  // Build react-d3-tree structure (root = you at left, ancestors to the right)
  const data = useMemo(() => {
    const leaf = (id) => ({
      name: labelFor(id),
      attributes: { subtitle: subtitleFor(id), treeId: id },
      _cardSize: { w: CARD_W, h: CARD_H },
    })
    return [{
      name: labelFor('you'),
      attributes: { subtitle: subtitleFor('you'), treeId: 'you' },
      _cardSize: { w: CARD_W, h: CARD_H },
      children: [
        {
          name: labelFor('m'),
          attributes: { subtitle: subtitleFor('m'), treeId: 'm' },
          _cardSize: { w: CARD_W, h: CARD_H },
          children: [leaf('gmM'), leaf('gfM')], // maternal line to the right
        },
        {
          name: labelFor('f'),
          attributes: { subtitle: subtitleFor('f'), treeId: 'f' },
          _cardSize: { w: CARD_W, h: CARD_H },
          children: [leaf('gmP'), leaf('gfP')], // paternal line to the right
        },
      ],
    }]
  }, [labelFor, subtitleFor])

  // Custom node card
  const renderNode = useCallback(({ nodeDatum }) => {
    const treeId = nodeDatum?.attributes?.treeId
    const title = nodeDatum?.name || ''
    const sub = nodeDatum?.attributes?.subtitle || '—'
    const x = -CARD_W / 2
    const y = -CARD_H / 2
    const rx = 12

    return (
      <g onClick={() => onSelectPerson?.({ id: treeId, name: title, attributes: {} })} style={{ cursor: 'pointer' }}>
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={rx} ry={rx}
              fill={COLORS.bg} stroke={COLORS.border} />
        <foreignObject x={x + 12} y={y + 6} width={CARD_W - 24} height={CARD_H - 12}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: COLORS.text, fontFamily: 'system-ui,sans-serif' }}>
            <div style={{ fontWeight: 700, lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
            <div style={{ opacity: .7, fontSize: 12, lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {sub}
            </div>
          </div>
        </foreignObject>
      </g>
    )
  }, [onSelectPerson])

  // elbow links feel nice horizontally
  const pathFunc = 'elbow'
  const styles = { links: { stroke: COLORS.link, strokeWidth: 2 } }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Tree
        data={data}
        translate={translate}
        orientation="horizontal"     // root on the side
        separation={{ siblings: 1.2, nonSiblings: 1.4 }}
        zoomable
        initialDepth={Infinity}
        collapsible={false}
        renderCustomNodeElement={renderNode}
        pathFunc={pathFunc}
        styles={styles}
      />
    </div>
  )
}
