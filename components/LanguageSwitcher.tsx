'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import '@/lib/i18n'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleChange(lang: 'en' | 'fr') {
    i18n.changeLanguage(lang)
    localStorage.setItem('app_language', lang)
    document.documentElement.lang = lang
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="languageSwitcher">
      <label htmlFor="lang-select" className="languageLabel">
        {t('common.language')}
      </label>
      <select
        id="lang-select"
        value={i18n.language.startsWith('fr') ? 'fr' : 'en'}
        onChange={(e) => handleChange(e.target.value as 'en' | 'fr')}
        className="languageSelect"
      >
        <option value="en">{t('common.english')}</option>
        <option value="fr">{t('common.french')}</option>
      </select>
    </div>
  )
}