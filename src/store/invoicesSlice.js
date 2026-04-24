import { createSlice } from '@reduxjs/toolkit'

// each invoice row has a productId + customerId so when those get edited,
// we can patch them here too (see the cross-slice listeners in productsSlice)
const invoicesSlice = createSlice({
  name: 'invoices',
  initialState: {
    items: [],
  },
  reducers: {
    addInvoices(state, action) {
      const incoming = action.payload
      incoming.forEach(inv => {
        state.items.push({ ...inv, id: inv.id || crypto.randomUUID() })
      })
    },

    updateInvoice(state, action) {
      const { id, field, value } = action.payload
      const inv = state.items.find(i => i.id === id)
      if (inv) {
        inv[field] = value
        if (inv._missing && value !== null && value !== '') {
          inv._missing = inv._missing.filter(f => f !== field)
        }
      }
    },

    syncProductName(state, action) {
      const { oldName, newName } = action.payload
      state.items.forEach(inv => {
        const isOldNull = oldName === null || oldName === undefined || oldName === ''
        const isInvNull = inv.productName === null || inv.productName === undefined || inv.productName === ''
        if (inv.productName === oldName || (isOldNull && isInvNull)) {
          inv.productName = newName
          if (inv._missing && newName !== null && newName !== '') {
            inv._missing = inv._missing.filter(f => f !== 'productName')
          }
        }
      })
    },

    syncCustomerName(state, action) {
      const { oldName, newName } = action.payload
      state.items.forEach(inv => {
        const isOldNull = oldName === null || oldName === undefined || oldName === ''
        const isInvNull = inv.customerName === null || inv.customerName === undefined || inv.customerName === ''
        if (inv.customerName === oldName || (isOldNull && isInvNull)) {
          inv.customerName = newName
          if (inv._missing && newName !== null && newName !== '') {
            inv._missing = inv._missing.filter(f => f !== 'customerName')
          }
        }
      })
    },

    clearAll(state) {
      state.items = []
    },
  },
})

export const { addInvoices, updateInvoice, syncProductName, syncCustomerName, clearAll } =
  invoicesSlice.actions

export default invoicesSlice.reducer
