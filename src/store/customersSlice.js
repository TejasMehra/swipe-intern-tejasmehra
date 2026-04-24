import { createSlice } from '@reduxjs/toolkit'
import { syncCustomerName } from './invoicesSlice'

const customersSlice = createSlice({
  name: 'customers',
  initialState: {
    items: [],
  },
  reducers: {
    addCustomers(state, action) {
      action.payload.forEach(customer => {
        const exists = state.items.find(
          c => c.customerName && c.customerName.toLowerCase() === customer.customerName?.toLowerCase()
        )
        if (!exists) {
          state.items.push({ ...customer, id: customer.id || crypto.randomUUID() })
        } else {
          // customer already exists — bump their total purchase amount
          exists.totalPurchaseAmount =
            (parseFloat(exists.totalPurchaseAmount) || 0) +
            (parseFloat(customer.totalPurchaseAmount) || 0)
        }
      })
    },

    updateCustomer(state, action) {
      const { id, field, value } = action.payload
      const customer = state.items.find(c => c.id === id)
      if (customer) {
        customer[field] = value
        if (customer._missing && value !== null && value !== '') {
          customer._missing = customer._missing.filter(f => f !== field)
        }
      }
    },

    syncCustomerNameFromInvoice(state, action) {
      const { oldName, newName } = action.payload
      if (!newName) return // don't sync if new name is empty

      // check if a customer with the new name already exists
      const alreadyExists = state.items.find(
        c => c.customerName && c.customerName.toLowerCase() === newName.toLowerCase()
      )
      if (alreadyExists) return // customer already exists with this name, no action needed

      // try to find and rename a customer with the old (missing) name
      let matched = false
      state.items.forEach(c => {
        const isOldNull = oldName === null || oldName === undefined || oldName === ''
        const isCNull = c.customerName === null || c.customerName === undefined || c.customerName === ''
        if (c.customerName === oldName || (isOldNull && isCNull)) {
          c.customerName = newName
          if (c._missing && newName !== null && newName !== '') {
            c._missing = c._missing.filter(f => f !== 'customerName')
          }
          matched = true
        }
      })

      // if no matching customer was found, create a new one
      if (!matched) {
        state.items.push({
          id: crypto.randomUUID(),
          customerName: newName,
          phoneNumber: null,
          totalPurchaseAmount: null,
          email: null,
          address: null,
          _missing: ['phoneNumber', 'totalPurchaseAmount'],
        })
      }
    },

    recalculateCustomerTotals(state, action) {
      const invoices = action.payload
      state.items.forEach(c => {
        if (!c.customerName) return
        
        // Find all invoices for this customer
        const matchingInvoices = invoices.filter(
          i => i.customerName && i.customerName.toLowerCase() === c.customerName.toLowerCase()
        )
        
        // Sum totalAmount
        const total = matchingInvoices.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0)
        
        c.totalPurchaseAmount = total > 0 ? total : c.totalPurchaseAmount
        
        // Clear missing flag if we successfully calculated a total
        if (c.totalPurchaseAmount > 0 && c._missing) {
          c._missing = c._missing.filter(f => f !== 'totalPurchaseAmount')
        }
      })
    },

    clearAll(state) {
      state.items = []
    },
  },
})

export const { addCustomers, updateCustomer, syncCustomerNameFromInvoice, recalculateCustomerTotals, clearAll } = customersSlice.actions

export const updateCustomerAndSync = (id, field, value, oldValue) => (dispatch) => {
  dispatch(updateCustomer({ id, field, value }))
  if (field === 'customerName') {
    dispatch(syncCustomerName({ oldName: oldValue === '' ? null : oldValue, newName: value }))
  }
}

export default customersSlice.reducer
