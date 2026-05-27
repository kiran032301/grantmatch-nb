import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'GrantMatch NB',
  description: 'Find the best New Brunswick funding matches for your business.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
  <div
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      padding: '12px 16px',
      background: '#0d1f3c',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      overflow: 'visible',
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: '1100px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <LanguageSwitcher />
    </div>
  </div>

  {children}

  <footer style={footerStyle}>
    <div style={footerContent}>
      <span>© {new Date().getFullYear()} GrantMatch NB</span>

      <a href="/admin/login" style={adminLinkStyle}>
        Admin
      </a>
    </div>
  </footer>
</body>
    </html>
  )
}
const footerStyle: React.CSSProperties = {
  marginTop: '40px',
  padding: '16px 20px',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  background: '#0d1f3c',
}

const footerContent: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  maxWidth: '1100px',
  margin: '0 auto',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '14px',
}

const adminLinkStyle: React.CSSProperties = {
  color: '#02c39a',
  textDecoration: 'none',
  fontWeight: 600,
}