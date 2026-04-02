import Link from 'next/link'

const stats = [
  { number: '128', label: 'NB funding programs tracked' },
  { number: '$80K', label: 'Average top match value' },
  { number: '5 min', label: 'To see your matches' },
]

const steps = [
  {
    step: '01',
    title: 'Answer 5 questions',
    body: 'Tell us about your business — industry, stage, goals. Takes under 5 minutes.',
  },
  {
    step: '02',
    title: 'AI finds your matches',
    body: 'We scan 128 NB funding programs and rank every one you qualify for.',
  },
  {
    step: '03',
    title: 'Apply with confidence',
    body: 'See exactly why you match, how much you can get, and apply directly.',
  },
]

export default function Home() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">GrantMatch NB</div>

        <div className="navActions">
          <Link href="/quiz" className="navButton">
            Find My Grants
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="pill">Built for New Brunswick Businesses • Bilingue EN/FR</div>

        <h1 className="heroTitle">
          Stop leaving NB funding <span>on the table.</span>
        </h1>

        <p className="heroText">
          128 government grants, loans and tax credits — matched to your NB business
          in 5 minutes. In English or French.
        </p>

        <Link href="/quiz" className="heroButton">
          Find My Grants — Free →
        </Link>

        <p className="subText">No credit card required • Takes 5 minutes</p>
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
        <h2 className="sectionTitle">How it works</h2>

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

      <footer className="footer">
        Built in Fredericton, New Brunswick • For every NB business, in English and French
      </footer>

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