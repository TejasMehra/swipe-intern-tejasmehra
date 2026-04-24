import React, { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateProductAndSync } from '../../store/productsSlice'
import { Package } from 'lucide-react'
import TableWrapper from '../UI/TableWrapper'
import SortableHeader from '../UI/SortableHeader'
import EditableCell from '../UI/EditableCell'
import EmptyState from '../UI/EmptyState'
import useTableControls from '../UI/useTableControls'
import { formatCurrency } from '../../utils/validators'
import '../UI/shared-table.css'

const SEARCH_FIELDS = ['name', 'quantity', 'unitPrice', 'tax', 'priceWithTax']

export default function ProductsTab() {
  const dispatch = useDispatch()
  const products = useSelector(s => s.products.items)
  const { filteredItems, search, setSearch, sortField, sortDir, toggleSort } =
    useTableControls(products, SEARCH_FIELDS)

  const stats = useMemo(() => {
    const totalQty = products.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0)
    const missingCount = products.filter(p => p._missing?.length > 0).length
    return [
      { value: products.length, label: 'Products' },
      { value: totalQty.toLocaleString('en-IN'), label: 'Total Units' },
      ...(missingCount > 0 ? [{ value: missingCount, label: 'Missing Fields' }] : []),
    ]
  }, [products])

  function handleSave(id, currentItem) {
    // pass oldValue so the thunk can sync invoice names if product name changes
    return (field, value, oldValue) => {
      dispatch(updateProductAndSync(id, field, value, oldValue))
    }
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package size={48} strokeWidth={1} color="var(--gray-400)" />}
        title="No products yet"
        subtitle="Products get populated automatically when you upload an invoice. Line items from your invoices will show up here."
      />
    )
  }

  return (
    <TableWrapper title="Products" stats={stats} search={search} onSearchChange={setSearch}>
      <table className="swipe-table">
        <thead>
          <tr>
            <th>#</th>
            <SortableHeader label="Product Name"   field="name"         sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Quantity"       field="quantity"     sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Unit Price"     field="unitPrice"    sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Tax %"          field="tax"          sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Price with Tax" field="priceWithTax" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Discount"       field="discount"     sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr><td colSpan={7} className="cell-static" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No products match your search.</td></tr>
          ) : (
            filteredItems.map((product, idx) => {
              const hasMissing = product._missing?.length > 0
              const save = handleSave(product.id, product)
              return (
                <tr key={product.id} className={hasMissing ? 'row-has-missing' : ''}>
                  <td className="cell-index">{idx + 1}</td>
                  <EditableCell item={product} field="name"         onSave={save} />
                  <EditableCell item={product} field="quantity"     onSave={save} type="number" />
                  <EditableCell item={product} field="unitPrice"    onSave={save} type="number" formatter={formatCurrency} />
                  <EditableCell item={product} field="tax"          onSave={save} type="number" formatter={v => v != null ? `${v}%` : null} />
                  <EditableCell item={product} field="priceWithTax" onSave={save} type="number" formatter={formatCurrency} />
                  <EditableCell item={product} field="discount"     onSave={save} type="number" formatter={v => v != null ? `${v}%` : null} />
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </TableWrapper>
  )
}
