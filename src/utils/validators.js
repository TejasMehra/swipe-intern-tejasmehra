const INVOICE_REQUIRED = ['serialNumber', 'customerName', 'productName', 'qty', 'tax', 'totalAmount', 'date']
const PRODUCT_REQUIRED = ['name', 'quantity', 'unitPrice', 'tax', 'priceWithTax']
const CUSTOMER_REQUIRED = ['customerName', 'phoneNumber', 'totalPurchaseAmount']

function flagMissing(items, requiredFields) {
  return items.map(item => {
    const missing = requiredFields.filter(f => item[f] === null || item[f] === undefined || item[f] === '')
    return { ...item, _missing: missing }
  })
}

export function validateExtracted(data) {
  return {
    invoices: flagMissing(data.invoices || [], INVOICE_REQUIRED),
    products: flagMissing(data.products || [], PRODUCT_REQUIRED),
    customers: flagMissing(data.customers || [], CUSTOMER_REQUIRED),
  }
}

// check if a specific field on an item is missing
export function isMissing(item, field) {
  return item._missing?.includes(field)
}

// formats currency for display — handles both numbers and strings
export function formatCurrency(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatNumber(value) {
  const num = parseFloat(value)
  return isNaN(num) ? '—' : num.toLocaleString('en-IN')
}
