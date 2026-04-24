import React, { useState, useRef, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { UploadCloud, Zap } from 'lucide-react'
import { extractFromFile } from '../../utils/geminiExtract'
import { validateExtracted } from '../../utils/validators'
import { addInvoices } from '../../store/invoicesSlice'
import { addProducts } from '../../store/productsSlice'
import { addCustomers } from '../../store/customersSlice'
import styles from './FileUpload.module.css'

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv'

export default function FileUpload() {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const inputRef = useRef()
  const dispatch = useDispatch()

  useEffect(() => {
    function handleDragOver(e) {
      e.preventDefault()
      if (e.dataTransfer?.types?.includes('Files')) {
        setDragging(true)
      } else if (!e.dataTransfer?.types) {
        setDragging(true) // Fallback for browsers not showing types
      }
    }
    window.addEventListener('dragenter', handleDragOver)
    window.addEventListener('dragover', handleDragOver)
    return () => {
      window.removeEventListener('dragenter', handleDragOver)
      window.removeEventListener('dragover', handleDragOver)
    }
  }, [])

  async function handleFiles(files) {
    if (!files || files.length === 0) return
    setLoading(true)

    for (const file of Array.from(files)) {
      setLoadingMsg(`Reading ${file.name}…`)
      try {
        const raw = await extractFromFile(file)
        const validated = validateExtracted(raw)

        dispatch(addInvoices(validated.invoices))
        dispatch(addProducts(validated.products))
        dispatch(addCustomers(validated.customers))

        const missingCount = [
          ...validated.invoices,
          ...validated.products,
          ...validated.customers,
        ].filter(item => item._missing?.length > 0).length

        if (missingCount > 0) {
          toast(`Extracted! ${missingCount} item(s) have missing fields — highlighted in red.`, {
            icon: '⚠️',
            duration: 5000,
          })
        } else {
          toast.success(`${file.name} extracted successfully!`)
        }
      } catch (err) {
        toast.error(err.message || 'Something went wrong during extraction.')
      }
    }

    setLoading(false)
    setLoadingMsg('')
    // reset input so same file can be re-uploaded if needed
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <>
      {/* in-header upload button */}
      <button
        className={styles.uploadBtn}
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className={styles.spinner} />
            {loadingMsg}
          </>
        ) : (
          <>
            <UploadCloud size={16} strokeWidth={2.5} />
            Upload Invoice
          </>
        )}
      </button>

      {/* invisible file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      {/* drag overlay — covers the whole page when dragging */}
      {dragging && (
        <div
          className={styles.dragOverlay}
          onDragOver={e => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className={styles.dragBox}>
            <div className={styles.dragIcon}>
              <Zap size={44} color="var(--blue-500)" fill="var(--blue-100)" strokeWidth={1.5} />
            </div>
            <p>Drop your invoices here</p>
            <span>PDF, Image, or Excel</span>
          </div>
        </div>
      )}

      </>
  )
}
