'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileId = searchParams.get('profileId')

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!profileId) {
      setMessage('Missing profile ID.')
      return
    }

    try {
      setLoading(true)
      setMessage('')

      const { error } = await supabase.from('leads').insert([
        {
          profile_id: profileId,
          business_name: businessName || null,
          contact_name: contactName || null,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
        },
      ])

      if (error) {
        console.error('Lead insert error:', error)
        setMessage('Could not save your details. Please try again.')
        return
      }

      // ✅ Redirect to results
      router.push(`/results?profileId=${profileId}`)
    } catch (err) {
      console.error(err)
      setMessage('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1F3C',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem 1.5rem',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#02C39A',
          }}
        >
          GrantMatch NB
        </span>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '2rem',
          }}
        >
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              marginBottom: '0.5rem',
            }}
          >
            Almost done
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '1.5rem',
            }}
          >
            Enter your details to view your personalized funding matches.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                placeholder="Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Contact Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />

              <textarea
                placeholder="Optional Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.9rem',
                borderRadius: 14,
                background: 'linear-gradient(90deg, #028090, #02C39A)',
                color: 'white',
                fontWeight: 700,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'See My Grant Matches'}
            </button>

            {message && (
              <div
                style={{
                  marginTop: '1rem',
                  fontSize: 14,
                  color: '#fca5a5',
                }}
              >
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: 'white',
  fontSize: 15,
  outline: 'none',
  width: '100%',
}