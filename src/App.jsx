import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { FileText, Package, Users } from 'lucide-react'
import FileUpload from './components/FileUpload/FileUpload'
import InvoicesTab from './components/InvoicesTab/InvoicesTab'
import ProductsTab from './components/ProductsTab/ProductsTab'
import CustomersTab from './components/CustomersTab/CustomersTab'
import ChatBot from './components/ChatBot/ChatBot'
import styles from './App.module.css'

const TABS = [
  { id: 'invoices',  label: 'Invoices',  icon: <FileText size={16} /> },
  { id: 'products',  label: 'Products',  icon: <Package size={16} /> },
  { id: 'customers', label: 'Customers', icon: <Users size={16} /> },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('invoices')

  const invoiceCount  = useSelector(s => s.invoices.items.length)
  const productCount  = useSelector(s => s.products.items.length)
  const customerCount = useSelector(s => s.customers.items.length)

  const counts = { invoices: invoiceCount, products: productCount, customers: customerCount }

  return (
    <div className={styles.app}>
      {/* header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <img src="/logo.svg" alt="Swipe" className={styles.logoImg} />
            <span className={styles.brandSub}>Invoice Manager</span>
          </div>
          <FileUpload />
        </div>
      </header>

      {/* tab bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabBarInner}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={styles.tabBadge}>{counts[tab.id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <main className={styles.main}>
        {activeTab === 'invoices'  && <InvoicesTab />}
        {activeTab === 'products'  && <ProductsTab />}
        {activeTab === 'customers' && <CustomersTab />}
      </main>

      {/* AI chatbot */}
      <ChatBot />
    </div>
  )
}
