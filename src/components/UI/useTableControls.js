import { useState, useMemo } from 'react'

/**
 * useTableControls — search + sort for any table
 *
 * @param {Array} items         – raw Redux items
 * @param {Array} searchFields  – which fields to search across (e.g. ['customerName', 'productName'])
 * @returns { filteredItems, search, setSearch, sortField, sortDir, toggleSort }
 */
export default function useTableControls(items, searchFields = []) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredItems = useMemo(() => {
    let result = items

    // search — case-insensitive match across all searchFields
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(item =>
        searchFields.some(f => {
          const val = item[f]
          if (val === null || val === undefined) return false
          return String(val).toLowerCase().includes(q)
        })
      )
    }

    // sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]

        // nulls always go to the bottom
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        // try numeric comparison first
        const aNum = parseFloat(aVal)
        const bNum = parseFloat(bVal)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum
        }

        // fallback to string comparison
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        const cmp = aStr.localeCompare(bStr)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [items, search, searchFields, sortField, sortDir])

  return { filteredItems, search, setSearch, sortField, sortDir, toggleSort }
}
