import React, { useState, useRef, useEffect } from 'react'
import { isMissing } from '../../utils/validators'
import { Pencil } from 'lucide-react'
import styles from './EditableCell.module.css'

// click any cell to edit it inline — pressing Enter or blurring saves the value
// red background + tooltip if the field was flagged as missing by the validator
export default function EditableCell({ item, field, onSave, formatter, type = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef()
  const missing = isMissing(item, field)
  const rawValue = item[field]

  useEffect(() => {
    if (editing) {
      setValue(rawValue ?? '')
      // tiny delay so the input is actually in the DOM
      setTimeout(() => inputRef.current?.select(), 10)
    }
  }, [editing, rawValue])

  function save() {
    setEditing(false)
    const trimmed = type === 'number' ? (parseFloat(value) || null) : value.trim() || null
    if (trimmed !== rawValue) {
      onSave(field, trimmed, rawValue)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') setEditing(false)
  }

  const displayValue = formatter ? formatter(rawValue) : (rawValue ?? '')

  if (editing) {
    return (
      <td className={`${styles.cell} ${styles.editing}`}>
        <input
          ref={inputRef}
          className={styles.input}
          type={type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={onKeyDown}
        />
      </td>
    )
  }

  return (
    <td
      className={`${styles.cell} ${missing ? styles.missing : ''}`}
      onClick={() => setEditing(true)}
      title={missing ? `"${field}" is missing — click to fill in` : 'Click to edit'}
    >
      {missing ? (
        <span className={styles.missingLabel}>Missing</span>
      ) : (
        <span className={styles.value}>{displayValue || '—'}</span>
      )}
      <span className={styles.editHint}>
        <Pencil size={11} strokeWidth={2.5} />
      </span>
    </td>
  )
}
