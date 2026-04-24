import React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

/**
 * SortableHeader — a <th> that toggles sort when clicked
 * Shows an arrow indicator for the active sort column
 */
export default function SortableHeader({ label, field, sortField, sortDir, onToggle }) {
  const isActive = sortField === field

  return (
    <th
      onClick={() => onToggle(field)}
      style={{ cursor: 'pointer', position: 'relative' }}
      title={`Sort by ${label}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        <span style={{ opacity: isActive ? 1 : 0.3, display: 'inline-flex', flexShrink: 0 }}>
          {isActive ? (
            sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
          ) : (
            <ChevronsUpDown size={13} />
          )}
        </span>
      </span>
    </th>
  )
}
