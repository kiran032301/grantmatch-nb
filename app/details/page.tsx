'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function DetailsContent() {
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

    if (!businessName.trim()) {
      setMessage('Business Name is required.')
      return
    }

    if (!email.trim()) {
      setMessage('Email Address is required.')
      return
    }

    if (!phone.trim()) {
      setMessage('Phone Number is required.')
      return
    }

    try {
      setLoading(true)
      setMessage('')

      const cleanedBusinessName = businessName.trim()
      const cleanedContactName = contactName.trim() || null
      const cleanedEmail = email.trim()
      const cleanedPhone = phone.trim()
      const cleanedNotes = notes.trim() || null

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          business_name: cleanedBusinessName,
          contact_name: cleanedContactName,
          email: cleanedEmail,
          phone: cleanedPhone,
          notes: cleanedNotes,
        })
        .eq('id', profileId)

      if (profileError) {
        console.error('Could not save profile details:', profileError)
        setMessage(profileError.message || 'Could not save your details. Please try again.')
        return
      }

      const { error: leadError } = await supabase.from('leads').insert([
        {
          profile_id: profileId,
          business_name: cleanedBusinessName,
          contact_name: cleanedContactName,
          email: cleanedEmail,
          phone: cleanedPhone,
          notes: cleanedNotes,
        },
      ])

      if (leadError) {
        console.error('Could not save lead record:', leadError)
        setMessage(leadError.message || 'Could not save your lead details. Please try again.')
        return
      }

      router.push(`/results?profileId=${profileId}`)
    } catch (error) {
      console.error('Details submit error:', error)
      setMessage('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <div className="brandWrap">
        <span className="brand">GrantMatch NB</span>
      </div>

      <div className="container">
        <div className="card">
          <div className="badge">Final Step</div>

          <h1 className="title">Almost done 🚀</h1>

          <p className="subtitle">
            Enter your business details to unlock your personalized funding matches.
          </p>

          <div className="trust">
            ✓ Your data is private • No spam • Instant results
          </div>

          <form onSubmit={handleSubmit} className="form">
            <input
              placeholder="Business Name *"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="input"
            />

            <input
              placeholder="Contact Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="input"
            />

            <input
              type="email"
              placeholder="Email Address *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />

            <input
              placeholder="Phone Number *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />

            <textarea
              placeholder="Optional Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input"
            />

            <button
              type="submit"
              disabled={loading}
              className="submitBtn"
            >
              {loading ? 'Saving...' : 'See My Grant Matches →'}
            </button>

            {message && <div className="error">{message}</div>}
          </form>
        </div>
      </div>

      <style>{`
        .page {
          min-height: 100vh;
          background: #0d1f3c;
          color: white;
          font-family: system-ui, sans-serif;
          padding: 24px 16px 40px;
        }

        .brandWrap {
          text-align: center;
          margin-bottom: 28px;
        }

        .brand {
          font-size: 20px;
          font-weight: 700;
          color: #02c39a;
        }

        .container {
          max-width: 520px;
          margin: 0 auto;
        }

        .card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px 22px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .badge {
          display: inline-block;
          margin-bottom: 14px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(2,195,154,0.1);
          border: 1px solid rgba(2,195,154,0.25);
          color: #02c39a;
          font-size: 12px;
          font-weight: 700;
        }

        .title {
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          font-weight: 800;
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 15px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 12px;
        }

        .trust {
          font-size: 13px;
          color: #9ff7df;
          margin-bottom: 20px;
        }

        .form {
          display: grid;
          gap: 12px;
        }

        .input {
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: white;
          font-size: 15px;
          outline: none;
          transition: all 0.2s ease;
        }

        .input:focus {
          border-color: #02c39a;
          background: rgba(255,255,255,0.07);
        }

        .submitBtn {
          margin-top: 10px;
          padding: 14px;
          border-radius: 14px;
          background: linear-gradient(90deg, #028090, #02c39a);
          color: white;
          font-weight: 700;
          border: none;
          cursor: pointer;
          font-size: 16px;
        }

        .submitBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error {
          margin-top: 10px;
          font-size: 14px;
          color: #fca5a5;
        }

        @media (max-width: 640px) {
          .card {
            padding: 22px 16px;
          }

          .brand {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  )
}

export default function DetailsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DetailsContent />
    </Suspense>
  )
}