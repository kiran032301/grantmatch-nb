'use client'

import { useTranslation } from 'react-i18next'
import '@/lib/i18n'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  function handleChange(lang: 'en' | 'fr') {
    i18n.changeLanguage(lang)

    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang)
      document.documentElement.lang = lang
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
        minWidth: '170px',
        whiteSpace: 'nowrap',
        color: 'white',
        fontSize: '14px',
        zIndex: 9999,
      }}
    >
      <label htmlFor="lang-select">
        {t('common.language')}
      </label>

      <select
        id="lang-select"
        value={i18n.language.startsWith('fr') ? 'fr' : 'en'}
        onChange={(e) => handleChange(e.target.value as 'en' | 'fr')}
        style={{
          minWidth: '96px',
          padding: '6px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.25)',
          background: '#10284c',
          color: 'white',
        }}
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </div>
  )
}