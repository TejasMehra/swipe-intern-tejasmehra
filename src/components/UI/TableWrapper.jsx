import React from 'react'
import { Search, X } from 'lucide-react'
import styles from './TableWrapper.module.css'

// just a card wrapper with a title row, optional stats chips, and search bar
export default function TableWrapper({ title, stats = [], children, actions, search, onSearchChange }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.left}>
          <h2 className={styles.title}>{title}</h2>
          {stats.length > 0 && (
            <div className={styles.stats}>
              {stats.map((s, i) => (
                <div key={i} className={styles.stat}>
                  <span className={styles.statValue}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.right}>
          {onSearchChange && (
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={search || ''}
                onChange={e => onSearchChange(e.target.value)}
              />
              {search && (
                <button className={styles.searchClear} onClick={() => onSearchChange('')}>
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </div>
      <div className={styles.tableWrap}>
        {children}
      </div>
    </div>
  )
}
