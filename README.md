An AI-powered invoice management tool built for the Swipe assignment. Drop in any invoice - PDF, image, or Excel - and the app extracts, organizes, and syncs all the data across three tabs in real time.

![Swipe](https://getswipe.azureedge.net/getswipe/images/logo.svg)

---

## The Problem

Businesses deal with invoices in wildly different formats. Some come as scanned PDFs, others as photos from a phone, and many as Excel exports from accounting software. Manually pulling out customer names, product details, tax numbers, and totals from each of these is tedious, error-prone, and slow.

The challenge was to build a React app that:
- Accepts **any** invoice format (PDF, image, Excel)
- Uses **AI** to automatically extract structured data from unstructured documents
- Organizes everything into three sections: **Invoices**, **Products**, and **Customers**
- Keeps all three tabs **synchronized in real time** — edit a product name in one tab, and it updates everywhere
- **Highlights missing data** so users know exactly what needs attention

---

## How I Solved It

### 1. One AI prompt to rule them all

Instead of building separate parsers for PDFs, images, and spreadsheets, I went with a single generic approach: **send everything to Google Gemini with one consistent prompt.** The prompt tells Gemini exactly what JSON schema to return, and to use `null` for anything it can't find. This means:

- **PDFs** get rendered page-by-page using `pdf.js` at 2× resolution (for better OCR), converted to JPEG images, and sent to Gemini Vision as a multi-image request.
- **Images** (JPG, PNG, WEBP) go straight to Gemini Vision as base64.
- **Excel/CSV** files get parsed by SheetJS into a pipe-delimited text table, then sent to Gemini as a text prompt (no vision needed since the data is already structured).

The beauty of this approach is that adding support for a new file type is trivial — just convert it to either text or an image, and the same prompt handles the rest.

### 2. Real-time cross-tab synchronization

This was the trickiest part. The app uses **Redux Toolkit** with three slices (invoices, products, customers), and I built a bi-directional sync system using thunks:

- **Products → Invoices**: When you rename a product in the Products tab, a thunk dispatches `syncProductName` to the invoices slice, which patches every invoice row referencing that product.
- **Customers → Invoices**: Same mechanism — rename a customer, and all matching invoice rows update instantly.
- **Invoices → Products/Customers**: When you fill in a missing product or customer name on an invoice, the app either renames a matching entry in the target tab, or creates a brand-new entry if none exists. This is important because the AI sometimes extracts an invoice but can't populate the corresponding customer/product record.

All of this happens synchronously within a single Redux dispatch cycle — there's no delay, no API call, no debouncing. You see the update the moment you press Enter.

### 3. Missing field detection and user-friendly highlighting

After Gemini returns extracted data, `validators.js` checks every required field against the expected schema. Any item with `null` fields gets a `_missing: ['fieldName', ...]` array attached. The UI reads this array and:

- Renders a red **"Missing"** badge in the cell
- Adds a faint red tint to the entire row
- Shows a tooltip on hover explaining what's missing
- Lets users click any missing cell to fill it in manually
- Automatically removes the missing flag once a value is provided
- Syncs the filled-in value to other tabs

### 4. Search and sort across all tabs

Every tab has a search bar that filters rows across all visible text columns (case-insensitive, instant). Every column header is clickable for ascending/descending sort. Null values always sink to the bottom when sorting. When search returns no results, a friendly "no matches" message appears instead of an empty table.

### 5. AI-powered data chatbot

A floating chatbot (bottom-right corner) lets users ask questions about their data in natural language. It reads the current Redux store, sends it as context to Gemini, and maintains full conversation history. Users can ask things like:

- "What is my total revenue?"
- "Which customer spent the most?"
- "List all products with missing fields"
- "Summarize all invoices from last month"

The chatbot includes quick-suggestion pills for common queries, a typing indicator, and markdown rendering for rich responses.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 18 + Vite | Fast HMR, clean build output, easy deployment |
| State | Redux Toolkit | Centralized store with cross-tab sync via thunks |
| AI | Google Gemini 2.5 Flash Lite | Fast vision + text model, handles PDFs and images natively |
| Excel parsing | xlsx (SheetJS) | Converts .xlsx/.xls/.csv to JSON rows |
| PDF rendering | pdf.js | Renders pages to canvas → base64 → Gemini Vision |
| Icons | Lucide React | Clean, consistent SVG icon set |
| Notifications | react-hot-toast | Non-intrusive success/error/warning toasts |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/swipe-invoice-manager
cd swipe-invoice-manager
npm install
```

### 2. Set up the Gemini API key

Create a `.env.local` file in the project root:

```env
VITE_GEMINI_API_KEY=your_key_here
```

### 3. Run the dev server

```bash
npm run dev
```

Opens at `http://localhost:5173`

---

## Project Structure

```
src/
├── store/
│   ├── store.js              — configureStore with all three slices
│   ├── invoicesSlice.js      — invoice state + syncProductName/syncCustomerName
│   ├── productsSlice.js      — product state + updateProductAndSync thunk
│   └── customersSlice.js     — customer state + updateCustomerAndSync thunk
├── components/
│   ├── FileUpload/
│   │   └── FileUpload.jsx    — upload button + full-page drag-and-drop
│   ├── InvoicesTab/
│   │   └── InvoicesTab.jsx   — invoices table with search & sort
│   ├── ProductsTab/
│   │   └── ProductsTab.jsx   — products table with search & sort
│   ├── CustomersTab/
│   │   └── CustomersTab.jsx  — customers table with search & sort
│   ├── ChatBot/
│   │   └── ChatBot.jsx       — floating AI assistant
│   └── UI/
│       ├── EditableCell.jsx  — click-to-edit cell with missing field logic
│       ├── SortableHeader.jsx — sortable column header with indicators
│       ├── TableWrapper.jsx  — card wrapper with stats bar + search
│       ├── EmptyState.jsx    — placeholder for empty tabs
│       ├── useTableControls.js — search + sort custom hook
│       └── shared-table.css  — shared table styles
├── utils/
│   ├── geminiExtract.js      — the AI extraction pipeline (all file types)
│   └── validators.js         — missing field detection + currency formatters
├── App.jsx                   — tab layout + header + chatbot
└── index.css                 — design system (CSS custom properties)
```

---

## Redux Store Architecture

```
┌──────────────────────────────────────────────────┐
│                    Redux Store                   │
├────────────────┬───────────────┬─────────────────┤
│  invoicesSlice │ productsSlice │ customersSlice  │
│                │               │                 │
│  addInvoices   │  addProducts  │  addCustomers   │
│  updateInvoice │  updateProduct│  updateCustomer │
│  syncProdName  │  syncProdName │  syncCustName   │
│  syncCustName  │  FromInvoice  │  FromInvoice    │
└────────┬───────┴───────┬───────┴────────┬────────┘
         │               │                │
         └───── thunks sync across ───────┘
```

When you edit a **product name** in the Products tab:
1. `updateProductAndSync` thunk fires
2. It dispatches `updateProduct` (local slice update)
3. It dispatches `syncProductName` (invoices slice — patches every invoice with that product)

When you edit a **customer name** on an invoice:
1. `updateInvoice` fires (local)
2. `syncCustomerNameFromInvoice` fires (customers slice — finds/creates the customer)

---

## AI Test Cases

| Case | Input | What Happens |
|------|-------|--------------|
| **Case 1** | Invoice PDFs | Pages rendered via pdf.js → sent as images to Gemini Vision. All line items extracted. |
| **Case 2** | Invoice PDF + Images | Both formats processed in sequence. Same prompt, same schema. Data merged into the existing Redux store. |
| **Case 3** | Single Excel file | SheetJS parses all sheets → text table → Gemini extracts structured data. |
| **Case 4** | Multiple Excel files | Each file processed individually. Deduplication handles overlapping products/customers. |
| **Case 5** | All file types mixed | PDF + images + Excel all uploaded together. Sequential extraction, merged results, cross-tab sync maintained. |

For cases where required information is missing from the source document (e.g., customer phone number not on an invoice image), the app highlights those fields in red and allows the user to fill them in manually. The filled-in value automatically syncs to other tabs.

---

## Features at a Glance

- **Multi-format upload**: PDF, JPG, PNG, WEBP, XLSX, XLS, CSV
- **Drag-and-drop**: Full-page drop zone with visual feedback
- **AI extraction**: Single Gemini prompt handles all formats
- **Three organized tabs**: Invoices, Products, Customers
- **Inline editing**: Click any cell to edit, Enter to save
- **Real-time sync**: Edit in one tab, see it update in others instantly
- **Missing data handling**: Red highlights, badges, tooltips, auto-clearing
- **Search**: Instant filtering across all text columns
- **Sorting**: Click any column header, ascending/descending toggle
- **AI chatbot**: Ask natural language questions about your data
- **Responsive**: Works on desktop and mobile
- **Bonus fields**: Discount (products), Email + Address (customers)

---

## Deployment

### Vercel (recommended)

```bash
npm run build
npx vercel --prod
```

Or push to GitHub and import the repo in Vercel. Add `VITE_GEMINI_API_KEY` as an environment variable in Vercel's project settings.

---

## Design Decisions

**Why Gemini?** It handles both vision (PDFs/images) and text (Excel) in one API. No need for separate OCR services. The Flash Lite model is fast enough for real-time extraction without making users wait too long.

**Why client-side only?** For an assignment scope, keeping everything in the browser avoids the complexity of a backend while still demonstrating the full data pipeline. The API key is accessed via `import.meta.env` — in production, you'd proxy this through a server.

**Why thunks instead of middleware for sync?** Thunks are simpler to reason about and debug. Each sync action is an explicit dispatch call, making the data flow easy to trace in Redux DevTools.

**Why not RTK Query for Gemini?** The extraction is a one-shot call per file, not a cacheable API endpoint. A plain `fetch` with error handling is more straightforward here.
