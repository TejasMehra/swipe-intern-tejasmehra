import { configureStore } from '@reduxjs/toolkit'
import invoicesReducer from './invoicesSlice'
import productsReducer from './productsSlice'
import customersReducer from './customersSlice'

export const store = configureStore({
  reducer: {
    invoices: invoicesReducer,
    products: productsReducer,
    customers: customersReducer,
  },
})
