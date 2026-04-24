import React, { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateInvoice } from '../../store/invoicesSlice'
import { syncProductNameFromInvoice, recalculateProductTotals } from '../../store/productsSlice'
import { syncCustomerNameFromInvoice, recalculateCustomerTotals } from '../../store/customersSlice'
import { FileText } from 'lucide-react'
import TableWrapper from '../UI/TableWrapper'
import SortableHeader from '../UI/SortableHeader'
import EditableCell from '../UI/EditableCell'
import EmptyState from '../UI/EmptyState'
import useTableControls from '../UI/useTableControls'
import { formatCurrency } from '../../utils/validators'
import '../UI/shared-table.css'
import styles from './InvoicesTab.module.css'

const SEARCH_FIELDS = ['serialNumber', 'customerName', 'productName', 'date']

export default function InvoicesTab() {
  const dispatch = useDispatch()
  const invoices = useSelector(s => s.invoices.items)
  const { filteredItems, search, setSearch, sortField, sortDir, toggleSort } =
    useTableControls(invoices, SEARCH_FIELDS)

  // summary numbers for the stats bar
  const stats = useMemo(() => {
    // Deduplicate by serial number to calculate actual invoice revenue
    const uniqueInvoices = new Map()
    invoices.forEach(inv => {
      const key = inv.serialNumber || inv.id
      if (!uniqueInvoices.has(key)) {
        uniqueInvoices.set(key, parseFloat(inv.totalAmount) || 0)
      }
    })
    
    let totalRevenue = 0
    uniqueInvoices.forEach(amount => totalRevenue += amount)

    const missingCount = invoices.filter(i => i._missing?.length > 0).length
    return [
      { value: invoices.length, label: 'Total' },
      { value: formatCurrency(totalRevenue), label: 'Revenue' },
      ...(missingCount > 0 ? [{ value: missingCount, label: 'Missing Fields' }] : []),
    ]
  }, [invoices])

  function handleSave(id) {
    return (field, value, oldValue) => {
      // wrap in a thunk so we can access the updated Redux state immediately
      dispatch((dispatch, getState) => {
        dispatch(updateInvoice({ id, field, value }))
        
        if (field === 'productName') {
          dispatch(syncProductNameFromInvoice({ oldName: oldValue === '' ? null : oldValue, newName: value }))
        }
        if (field === 'customerName') {
          dispatch(syncCustomerNameFromInvoice({ oldName: oldValue === '' ? null : oldValue, newName: value }))
        }

        // if an amount or name changes, update the aggregated totals in the other tabs
        if (['totalAmount', 'customerName', 'qty', 'productName'].includes(field)) {
          const updatedInvoices = getState().invoices.items
          dispatch(recalculateCustomerTotals(updatedInvoices))
          dispatch(recalculateProductTotals(updatedInvoices))
        }
      })
    }
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={48} strokeWidth={1} color="var(--gray-400)" />}
        title="No invoices yet"
        subtitle="Upload a PDF, image, or Excel file using the button above — Swipe will extract everything automatically."
      />
    )
  }

  return (
    <TableWrapper title="Invoices" stats={stats} search={search} onSearchChange={setSearch}>
      <table className="swipe-table">
        <thead>
          <tr>
            <th>#</th>
            <SortableHeader label="Serial No."    field="serialNumber" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Customer"      field="customerName" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Product"       field="productName"  sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Qty"           field="qty"          sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Tax %"         field="tax"          sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Total Amount"  field="totalAmount"  sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Date"          field="date"         sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr><td colSpan={8} className="cell-static" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No invoices match your search.</td></tr>
          ) : (
            filteredItems.map((inv, idx) => {
              const hasMissing = inv._missing?.length > 0
              return (
                <tr key={inv.id} className={hasMissing ? 'row-has-missing' : ''}>
                  <td className="cell-index">{idx + 1}</td>
                  <EditableCell item={inv} field="serialNumber" onSave={handleSave(inv.id)} />
                  <EditableCell item={inv} field="customerName" onSave={handleSave(inv.id)} />
                  <EditableCell item={inv} field="productName"  onSave={handleSave(inv.id)} />
                  <EditableCell item={inv} field="qty"          onSave={handleSave(inv.id)} type="number" />
                  <EditableCell item={inv} field="tax"          onSave={handleSave(inv.id)} type="number"
                    formatter={v => v != null ? `${v}%` : null}
                  />
                  <EditableCell item={inv} field="totalAmount"  onSave={handleSave(inv.id)} type="number"
                    formatter={formatCurrency}
                  />
                  <EditableCell item={inv} field="date"         onSave={handleSave(inv.id)} />
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </TableWrapper>
  )
}
