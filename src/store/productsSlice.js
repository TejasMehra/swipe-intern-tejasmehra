import { createSlice } from '@reduxjs/toolkit'
import { syncProductName } from './invoicesSlice'

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
  },
  reducers: {
    addProducts(state, action) {
      action.payload.forEach(product => {
        // dedupe by name — if we already have this product, skip it
        const exists = state.items.find(
          p => p.name && p.name.toLowerCase() === product.name?.toLowerCase()
        )
        if (!exists) {
          state.items.push({ ...product, id: product.id || crypto.randomUUID() })
        }
      })
    },

    updateProduct(state, action) {
      const { id, field, value } = action.payload
      const product = state.items.find(p => p.id === id)
      if (product) {
        product[field] = value
        if (product._missing && value !== null && value !== '') {
          product._missing = product._missing.filter(f => f !== field)
        }
      }
    },

    syncProductNameFromInvoice(state, action) {
      const { oldName, newName } = action.payload
      if (!newName) return

      // check if a product with the new name already exists
      const alreadyExists = state.items.find(
        p => p.name && p.name.toLowerCase() === newName.toLowerCase()
      )
      if (alreadyExists) return

      // try to find and rename a product with the old (missing) name
      let matched = false
      state.items.forEach(p => {
        const isOldNull = oldName === null || oldName === undefined || oldName === ''
        const isPNull = p.name === null || p.name === undefined || p.name === ''
        if (p.name === oldName || (isOldNull && isPNull)) {
          p.name = newName
          if (p._missing && newName !== null && newName !== '') {
            p._missing = p._missing.filter(f => f !== 'name')
          }
          matched = true
        }
      })

      // if no matching product was found, create a new one
      if (!matched) {
        state.items.push({
          id: crypto.randomUUID(),
          name: newName,
          quantity: null,
          unitPrice: null,
          tax: null,
          priceWithTax: null,
          discount: null,
          _missing: ['quantity', 'unitPrice', 'tax', 'priceWithTax'],
        })
      }
    },

    recalculateProductTotals(state, action) {
      const invoices = action.payload
      state.items.forEach(p => {
        if (!p.name) return

        const matchingInvoices = invoices.filter(
          i => i.productName && i.productName.toLowerCase() === p.name.toLowerCase()
        )

        // Sum qty
        const totalQty = matchingInvoices.reduce((sum, inv) => sum + (parseFloat(inv.qty) || 0), 0)
        p.quantity = totalQty > 0 ? totalQty : p.quantity

        if (p.quantity > 0 && p._missing) {
          p._missing = p._missing.filter(f => f !== 'quantity')
        }
      })
    },

    clearAll(state) {
      state.items = []
    },
  },
})

export const { addProducts, updateProduct, syncProductNameFromInvoice, recalculateProductTotals, clearAll } = productsSlice.actions

// thunk so we can dispatch to invoices at the same time
// this is the cross-tab sync magic — edit product name here, it patches invoices too
export const updateProductAndSync = (id, field, value, oldValue) => (dispatch) => {
  dispatch(updateProduct({ id, field, value }))
  if (field === 'name') {
    dispatch(syncProductName({ oldName: oldValue === '' ? null : oldValue, newName: value }))
  }
}

export default productsSlice.reducer
