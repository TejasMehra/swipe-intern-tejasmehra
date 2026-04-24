import React, { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateCustomerAndSync } from '../../store/customersSlice'
import { Users } from 'lucide-react'
import TableWrapper from '../UI/TableWrapper'
import SortableHeader from '../UI/SortableHeader'
import EditableCell from '../UI/EditableCell'
import EmptyState from '../UI/EmptyState'
import useTableControls from '../UI/useTableControls'
import { formatCurrency } from '../../utils/validators'
import '../UI/shared-table.css'
import styles from './CustomersTab.module.css'

const SEARCH_FIELDS = ['customerName', 'phoneNumber', 'email', 'address']

export default function CustomersTab() {
  const dispatch = useDispatch()
  const customers = useSelector(s => s.customers.items)
  const { filteredItems, search, setSearch, sortField, sortDir, toggleSort } =
    useTableControls(customers, SEARCH_FIELDS)

  const stats = useMemo(() => {
    const totalRevenue = customers.reduce((sum, c) => sum + (parseFloat(c.totalPurchaseAmount) || 0), 0)
    const missingCount = customers.filter(c => c._missing?.length > 0).length
    return [
      { value: customers.length, label: 'Customers' },
      { value: formatCurrency(totalRevenue), label: 'Total Revenue' },
      ...(missingCount > 0 ? [{ value: missingCount, label: 'Missing Fields' }] : []),
    ]
  }, [customers])

  function handleSave(id) {
    return (field, value, oldValue) => {
      dispatch(updateCustomerAndSync(id, field, value, oldValue))
    }
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={<Users size={48} strokeWidth={1} color="var(--gray-400)" />}
        title="No customers yet"
        subtitle="Customer details are pulled from your uploaded invoices. Names, phone numbers, and purchase totals all end up here."
      />
    )
  }

  return (
    <TableWrapper title="Customers" stats={stats} search={search} onSearchChange={setSearch}>
      <table className="swipe-table">
        <thead>
          <tr>
            <th>#</th>
            <SortableHeader label="Customer Name"    field="customerName"        sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Phone Number"     field="phoneNumber"         sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Email"            field="email"               sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Address"          field="address"             sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Total Purchase"   field="totalPurchaseAmount" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr><td colSpan={6} className="cell-static" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No customers match your search.</td></tr>
          ) : (
            filteredItems.map((customer, idx) => {
              const hasMissing = customer._missing?.length > 0
              const save = handleSave(customer.id)
              return (
                <tr key={customer.id} className={hasMissing ? 'row-has-missing' : ''}>
                  <td className="cell-index">{idx + 1}</td>
                  <EditableCell item={customer} field="customerName"        onSave={save} />
                  <EditableCell item={customer} field="phoneNumber"         onSave={save} />
                  <EditableCell item={customer} field="email"              onSave={save} />
                  <EditableCell item={customer} field="address"            onSave={save} />
                  <EditableCell item={customer} field="totalPurchaseAmount" onSave={save} type="number" formatter={formatCurrency} />
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </TableWrapper>
  )
}
