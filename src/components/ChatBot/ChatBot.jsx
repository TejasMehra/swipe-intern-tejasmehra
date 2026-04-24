import React, { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { MessageCircle, X, Send, Sparkles, Bot, User } from 'lucide-react'
import styles from './ChatBot.module.css'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

const SUGGESTIONS = [
  'What is my total revenue?',
  'Which customer spent the most?',
  'List all products with missing fields',
  'Summarize all invoices',
]

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hey! I'm **Swipe AI** — your invoice data assistant. Ask me anything about your invoices, products, or customers. I can calculate totals, find patterns, and summarize your data.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const invoices = useSelector(s => s.invoices.items)
  const products = useSelector(s => s.products.items)
  const customers = useSelector(s => s.customers.items)

  // auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  function buildContext() {
    // summarize the current data so Gemini has context
    const invSummary = invoices.length > 0
      ? JSON.stringify(invoices.map(i => ({
          serialNumber: i.serialNumber,
          customer: i.customerName,
          product: i.productName,
          qty: i.qty,
          tax: i.tax,
          total: i.totalAmount,
          date: i.date,
          missingFields: i._missing?.length > 0 ? i._missing : undefined,
        })))
      : 'No invoices uploaded yet.'

    const prodSummary = products.length > 0
      ? JSON.stringify(products.map(p => ({
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          tax: p.tax,
          priceWithTax: p.priceWithTax,
          discount: p.discount,
          missingFields: p._missing?.length > 0 ? p._missing : undefined,
        })))
      : 'No products yet.'

    const custSummary = customers.length > 0
      ? JSON.stringify(customers.map(c => ({
          name: c.customerName,
          phone: c.phoneNumber,
          email: c.email,
          address: c.address,
          totalPurchase: c.totalPurchaseAmount,
          missingFields: c._missing?.length > 0 ? c._missing : undefined,
        })))
      : 'No customers yet.'

    const uniqueInvoices = new Map()
    invoices.forEach(inv => {
      const key = inv.serialNumber || inv.id
      if (!uniqueInvoices.has(key)) {
        uniqueInvoices.set(key, parseFloat(inv.totalAmount) || 0)
      }
    })
    let totalRevenue = 0
    uniqueInvoices.forEach(amount => totalRevenue += amount)

    return `You are Swipe AI, a specialized data assistant for the Swipe Invoice Manager app. The app has three main sections: Invoices, Products, and Customers. Your job is to answer questions based ONLY on the application and the data provided below.

Current Data:
- ${invoices.length} invoice(s): ${invSummary}
- ${products.length} product(s): ${prodSummary}
- ${customers.length} customer(s): ${custSummary}

Calculated Totals (USE THESE DIRECTLY, DO NOT RECALCULATE):
- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

STRICT INSTRUCTIONS:
1. You must ONLY answer questions related to Swipe, invoice management, or the data provided above.
2. If the user asks a question that is unrelated to the application or the provided data, you MUST reply exactly with: "not relevant. no reply to save tokens." and provide absolutely no other text.
3. When answering data-related questions, use the Calculated Totals provided above instead of trying to manually sum array elements. Do not make up data.
4. If the user asks about data that is not present, inform them based on the context.
5. Use markdown formatting (bold, lists, etc.) to make your responses easy to read. Currency is in Indian Rupees (₹).`
  }


  async function sendMessage(directQuery) {
    const q = (typeof directQuery === 'string' ? directQuery : input).trim()
    if (!q || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API key not configured')

      // build conversation history for Gemini
      const contextMsg = { role: 'user', parts: [{ text: buildContext() }] }
      const contextAck = { role: 'model', parts: [{ text: 'Understood. I have access to the current invoice data. How can I help?' }] }

      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }],
        }))

      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [contextMsg, contextAck, ...history, { role: 'user', parts: [{ text: q }] }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `API error ${res.status}`)
      }

      const data = await res.json()
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that."

      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatMessage(text) {
    // basic markdown: **bold**, *italic*, `code`, newlines
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <>
      {/* floating chat panel */}
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        {/* header */}
        <div className={styles.panelHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerAvatar}>
              <Sparkles size={18} />
            </div>
            <div>
              <div className={styles.headerTitle}>Swipe AI</div>
              <div className={styles.headerSub}>
                {invoices.length > 0
                  ? `Analyzing ${invoices.length} invoices`
                  : 'Upload data to get started'}
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* messages */}
        <div className={styles.messages} ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgUser : styles.msgBot}`}>
              {msg.role === 'assistant' && (
                <div className={styles.msgAvatar}>
                  <Bot size={14} />
                </div>
              )}
              <div
                className={styles.msgBubble}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
              />
              {msg.role === 'user' && (
                <div className={styles.msgAvatarUser}>
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {/* typing indicator */}
          {loading && (
            <div className={`${styles.msgRow} ${styles.msgBot}`}>
              <div className={styles.msgAvatar}>
                <Bot size={14} />
              </div>
              <div className={`${styles.msgBubble} ${styles.typing}`}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          )}
        </div>

        {/* quick suggestions — show only when few messages */}
        {messages.length <= 2 && !loading && (
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className={styles.sugBtn} onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* input */}
        <div className={styles.inputBar}>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Ask about your data…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* FAB toggle button */}
      <button
        className={`${styles.fab} ${open ? styles.fabHidden : ''}`}
        onClick={() => setOpen(true)}
        title="Ask Swipe AI"
      >
        <MessageCircle size={24} />
        <span className={styles.fabPulse} />
      </button>
    </>
  )
}
