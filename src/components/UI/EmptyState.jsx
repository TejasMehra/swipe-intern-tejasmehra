import React from 'react'
import styles from './EmptyState.module.css'

export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  )
}
