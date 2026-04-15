'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import '@/lib/i18n'

export default function Home() {
  const { t } = useTranslation()

  const stats = [
    { number: '128', label: t('home.stats1Label') },
    { number: '$80K', label: t('home.stats2Label') },
    { number: '5 min', label: t('home.stats3Label') },
  ]

  const steps = [
    {
      step: '01',
      title: t('home.step1Title'),
      body: t('home.step1Body'),
    },
    {
      step: '02',
      title: t('home.step2Title'),
      body: t('home.step2Body'),
    },
    {
      step: '03',
      title: t('home.step3Title'),
      body: t('home.step3Body'),
    },
  ]

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">{t('common.brand')}</div>

        <div className="navActions">
          <Link href="/quiz" className="navButton">
            {t('home.navButton')}
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="pill">{t('home.pill')}</div>

        <h1 className="heroTitle">
          {t('home.heroTitle1')} <span>{t('home.heroTitle2')}</span>
        </h1>

        <p className="heroText">{t('home.heroText')}</p>

        <Link href="/quiz" className="heroButton">
          {t('home.heroButton')}
        </Link>

        <p className="subText">{t('home.subText')}</p>
      </section>

      <section className="statsSection">
        {stats.map((stat) => (
          <div key={stat.number} className="card">
            <div className="statNumber">{stat.number}</div>
            <div className="statLabel">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="howSection">
        <h2 className="sectionTitle">{t('home.howItWorks')}</h2>

        <div className="stepsGrid">
          {steps.map((item) => (
            <div key={item.step} className="card">
              <div className="stepNo">{item.step}</div>
              <div className="stepTitle">{item.title}</div>
              <div className="stepBody">{item.body}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">{t('home.footer')}</footer>

      <style>{`
        .page {
          min-height: 100vh;
          background: #0d1f3c;
          color: white;
          font-family: system-ui, sans-serif;
        }

        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
        }

        .brand {
          font-size: 22px;
          font-weight: 700;
          color: #02c39a;
        }

        .navActions {
          display: flex;
          gap: 12px;
        }

        .navButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 20px;
          background: #028090;
          color: white;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .hero {
          max-width: 900px;
          margin: 0 auto;
          padding: 72px 24px 40px;
          text-align: center;
        }

        .pill {
          display: inline-block;
          background: rgba(2, 128, 144, 0.15);
          border: 1px solid rgba(2, 128, 144, 0.4);
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          color: #02c39a;
          margin-bottom: 24px;
        }

        .heroTitle {
          font-size: clamp(2.2rem, 6vw, 4.6rem);
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 20px;
          letter-spacing: -0.03em;
        }

        .heroTitle span {
          color: #02c39a;
        }

        .heroText {
          font-size: clamp(1rem, 2vw, 1.2rem);
          color: rgba(255, 255, 255, 0.68);
          line-height: 1.7;
          margin: 0 auto 32px;
          max-width: 680px;
        }

        .heroButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 30px;
          background: #028090;
          color: white;
          border-radius: 12px;
          text-decoration: none;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.2px;
          max-width: 100%;
        }

        .subText {
          margin-top: 14px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
        }

        .statsSection {
          max-width: 1000px;
          margin: 28px auto 0;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .howSection {
          max-width: 1000px;
          margin: 40px auto 0;
          padding: 0 24px 56px;
        }

        .sectionTitle {
          font-size: clamp(1.6rem, 3vw, 2rem);
          font-weight: 700;
          text-align: center;
          margin: 0 0 28px;
          color: rgba(255, 255, 255, 0.92);
        }

        .stepsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px 18px;
          text-align: center;
        }

        .statNumber {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          color: #02c39a;
          margin-bottom: 6px;
        }

        .statLabel {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.58);
          line-height: 1.5;
        }

        .stepNo {
          font-size: 13px;
          font-weight: 700;
          color: #028090;
          margin-bottom: 8px;
          letter-spacing: 1px;
          text-align: left;
        }

        .stepTitle {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 8px;
          color: white;
          text-align: left;
        }

        .stepBody {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
          text-align: left;
        }

        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px 24px;
          text-align: center;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.34);
        }

        @media (max-width: 900px) {
          .statsSection,
          .stepsGrid {
            grid-template-columns: 1fr;
          }

          .hero {
            padding-top: 56px;
          }
        }

        @media (max-width: 640px) {
          .nav {
            padding: 16px;
          }

          .brand {
            font-size: 20px;
          }

          .navButton {
            width: 100%;
          }

          .navActions {
            width: 100%;
          }

          .hero {
            padding: 44px 16px 28px;
          }

          .statsSection,
          .howSection {
            padding-left: 16px;
            padding-right: 16px;
          }

          .pill {
            font-size: 12px;
            padding: 7px 12px;
          }

          .heroButton {
            width: 100%;
            padding: 15px 18px;
          }
        }
      `}</style>
    </main>
  )
}