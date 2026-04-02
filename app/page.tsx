import Link from 'next/link'

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0D1F3C',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>

      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#02C39A'
        }}>
          GrantMatch NB
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/quiz" style={{
            padding: '9px 22px',
            background: '#028090',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600
          }}>
            Find My Grants
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '5rem 2rem 3rem',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(2,128,144,0.15)',
          border: '1px solid rgba(2,128,144,0.4)',
          borderRadius: 20,
          padding: '6px 16px',
          fontSize: 13,
          color: '#02C39A',
          marginBottom: '1.5rem'
        }}>
          Built for New Brunswick Businesses • Bilingue EN/FR
        </div>

        <h1 style={{
          fontSize: 48,
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: '1.25rem',
          letterSpacing: '-0.5px'
        }}>
          Stop leaving NB funding
          <span style={{ color: '#02C39A' }}> on the table.</span>
        </h1>

        <p style={{
          fontSize: 18,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
          maxWidth: 580,
          margin: '0 auto 2.5rem'
        }}>
          128 government grants, loans and tax credits — matched to your 
          NB business in 5 minutes. In English or French.
        </p>

        <Link href="/quiz" style={{
          display: 'inline-block',
          padding: '16px 36px',
          background: '#028090',
          color: 'white',
          borderRadius: 10,
          textDecoration: 'none',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '-0.2px'
        }}>
          Find My Grants — Free →
        </Link>

        <p style={{
          marginTop: '1rem',
          fontSize: 13,
          color: 'rgba(255,255,255,0.35)'
        }}>
          No credit card required • Takes 5 minutes
        </p>
      </section>

      {/* Stats Row */}
      <section style={{
        maxWidth: 760,
        margin: '3rem auto',
        padding: '0 2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16
      }}>
        {[
          { number: '128', label: 'NB funding programs tracked' },
          { number: '$80K', label: 'Average top match value' },
          { number: '5 min', label: 'To see your matches' },
        ].map(stat => (
          <div key={stat.number} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#02C39A',
              marginBottom: 4
            }}>
              {stat.number}
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.4
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section style={{
        maxWidth: 760,
        margin: '2rem auto',
        padding: '0 2rem 4rem'
      }}>
        <h2 style={{
          fontSize: 26,
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '2rem',
          color: 'rgba(255,255,255,0.9)'
        }}>
          How it works
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16
        }}>
          {[
            { step: '01', title: 'Answer 5 questions', body: 'Tell us about your business — industry, stage, goals. Takes under 5 minutes.' },
            { step: '02', title: 'AI finds your matches', body: 'We scan 128 NB funding programs and rank every one you qualify for.' },
            { step: '03', title: 'Apply with confidence', body: 'See exactly why you match, how much you can get, and apply directly.' },
          ].map(item => (
            <div key={item.step} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '1.5rem'
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#028090',
                marginBottom: 8,
                letterSpacing: 1
              }}>
                {item.step}
              </div>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
                color: 'white'
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6
              }}>
                {item.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        fontSize: 13,
        color: 'rgba(255,255,255,0.3)'
      }}>
        Built in Fredericton, New Brunswick • For every NB business, in English and French
      </footer>

    </main>
  )
}