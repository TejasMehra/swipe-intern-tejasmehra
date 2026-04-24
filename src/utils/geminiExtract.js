const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// the schema we want back — Gemini is told to ALWAYS return this shape
// null for missing fields, never just skip them (that's how we detect missing data)
const EXTRACTION_PROMPT = `
You are an invoice data extraction specialist. Extract all invoice, product, and customer data from this document.

Return ONLY a valid JSON object — no markdown, no backticks, no explanation. Just raw JSON.

Use this exact schema:
{
  "invoices": [
    {
      "serialNumber": "string or null",
      "customerName": "string or null",
      "productName": "string or null",
      "qty": "number or null",
      "tax": "number or null",
      "totalAmount": "number or null",
      "date": "string or null"
    }
  ],
  "products": [
    {
      "name": "string or null",
      "quantity": "number or null",
      "unitPrice": "number or null",
      "tax": "number or null",
      "priceWithTax": "number or null",
      "discount": "number or null"
    }
  ],
  "customers": [
    {
      "customerName": "string or null",
      "phoneNumber": "string or null",
      "totalPurchaseAmount": "number or null",
      "email": "string or null",
      "address": "string or null"
    }
  ]
}

Rules:
- If a field doesn't exist in the document, set it to null — NEVER omit the field
- Extract ALL line items as separate invoice rows when multiple items exist
- If there's no serial/invoice number, generate a sensible placeholder like "INV-001"
- Tax should be a percentage number (e.g. 18 for 18% GST)
- Dates should be in DD/MM/YYYY format when possible
- If Excel data has multiple rows, each row is a separate invoice entry
`

// main extraction function — call this with any supported file type
export async function extractFromFile(file) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not set. Add VITE_GEMINI_API_KEY to your .env.local file.')

  const ext = file.name.split('.').pop().toLowerCase()

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return extractFromImage(file, apiKey)
  } else if (ext === 'pdf') {
    return extractFromPDF(file, apiKey)
  } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return extractFromExcel(file, apiKey)
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please upload a PDF, image (JPG/PNG), or Excel file.`)
  }
}

// --- IMAGE ---
// dead simple: read as base64 and hand it to Gemini vision
async function extractFromImage(file, apiKey) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/jpeg'

  const body = {
    contents: [{
      parts: [
        { text: EXTRACTION_PROMPT },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]
    }]
  }

  return callGemini(body, apiKey)
}

// --- PDF ---
// pdf.js renders each page to canvas, then we send each page as an image
// this works even for scanned PDFs (no embedded text needed)
async function extractFromPDF(file, apiKey) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageImages = []
  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 }) // 2x scale for better OCR accuracy
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    pageImages.push(canvas.toDataURL('image/jpeg', 0.9).split(',')[1])
  }

  // send all pages at once — Gemini handles multi-image context well
  const parts = [{ text: EXTRACTION_PROMPT }]
  pageImages.forEach(img => {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } })
  })

  return callGemini({ contents: [{ parts }] }, apiKey)
}

// --- EXCEL / CSV ---
// xlsx converts the sheet to JSON rows, then we send it as structured text
// Gemini is surprisingly good at reading tabular text when formatted nicely
async function extractFromExcel(file, apiKey) {
  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

  let allSheetsText = ''
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    // raw: true keeps numbers as numbers instead of formatted strings
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
    if (rows.length === 0) return

    allSheetsText += `\n\n=== Sheet: ${sheetName} ===\n`
    // headers
    allSheetsText += Object.keys(rows[0]).join(' | ') + '\n'
    allSheetsText += '-'.repeat(60) + '\n'
    // data rows
    rows.forEach(row => {
      allSheetsText += Object.values(row).join(' | ') + '\n'
    })
  })

  const body = {
    contents: [{
      parts: [
        { text: EXTRACTION_PROMPT + '\n\nHere is the spreadsheet data:\n' + allSheetsText }
      ]
    }]
  }

  return callGemini(body, apiKey)
}

// --- shared Gemini caller ---
async function callGemini(body, apiKey) {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // strip markdown code fences if Gemini decided to wrap it anyway
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Gemini returned something that isn\'t valid JSON. Try again or use a clearer document.')
  }
}

// utility: file → base64 string (no data: prefix)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
