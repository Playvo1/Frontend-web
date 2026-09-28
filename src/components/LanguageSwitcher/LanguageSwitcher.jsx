import { useTranslation } from 'react-i18next'
import './LanguageSwitcher.css'

// Shared AR/EN toggle. Calling i18n.changeLanguage actually switches every
// translated string on the page (App.jsx listens for the change and updates
// <html lang/dir> accordingly) — this is not a visual-only control.
//
// DOM order intentionally: Arabic option first, English second. Under the
// default RTL direction the browser mirrors flex-row order (first child →
// right side), which is what places "العربية" on the right / "EN" on the
// left, matching the reference screenshot. Switching to English flips the
// container to LTR, so the same DOM order naturally mirrors to "EN" on the
// left / "العربية" on the right.
function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className="lang-switcher">
      <button
        type="button"
        className={`lang-switcher-option ${i18n.language === 'ar' ? 'lang-switcher-option-active' : ''}`}
        onClick={() => i18n.changeLanguage('ar')}
      >
        العربية
      </button>
      <button
        type="button"
        className={`lang-switcher-option ${i18n.language === 'en' ? 'lang-switcher-option-active' : ''}`}
        onClick={() => i18n.changeLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}

export default LanguageSwitcher
