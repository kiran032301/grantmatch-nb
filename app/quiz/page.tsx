'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STEPS = [
  {
    id: 'industry',
    question: 'What industry is your business in?',
    subtitle: 'Choose the one that best describes your main activity',
    options: [
      'Technology / Software',
      'Manufacturing',
      'Agriculture / Agritech',
      'Health & Life Sciences',
      'Clean Energy / Cleantech',
      'Retail / Hospitality',
      'Professional Services',
      'Other',
    ],
  },
  {
    id: 'stage',
    question: 'What stage is your business at?',
    subtitle: 'This helps us find stage-appropriate funding',
    options: [
      'Idea / Pre-revenue',
      'Early stage (under $100K revenue)',
      'Growth stage ($100K–$1M revenue)',
      'Established ($1M+ revenue)',
    ],
  },
  {
    id: 'employees',
    question: 'How many employees do you have?',
    subtitle: 'Including yourself and any part-time staff',
    options: [
      'Just me (1)',
      '2–4 employees',
      '5–15 employees',
      '16–50 employees',
      '50+ employees',
    ],
  },
  {
    id: 'does_rd',
    question: 'Does your business do any research or development?',
    subtitle: 'R&D includes building new products, software, or processes',
    options: [
      'Yes — we develop new products or technology',
      'Somewhat — some experimental work',
      'No — we deliver services or sell existing products',
    ],
  },
  {
    id: 'goal',
    question: 'What do you need funding for right now?',
    subtitle: 'Pick your most important need today',
    options: [
      'Hiring staff',
      'R&D / product development',
      'Export / entering new markets',
      'Equipment or capital investment',
      'Training employees',
      'General growth',
    ],
  },
]

export default function QuizPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  async function saveProfile(data: Record<string, string>) {
    const doesRdValue =
      data.does_rd === 'Yes — we develop new products or technology'
        ? true
        : data.does_rd === 'Somewhat — some experimental work'
        ? true
        : false

    const employeesValue =
      data.employees === 'Just me (1)'
        ? 1
        : data.employees === '2–4 employees'
        ? 4
        : data.employees === '5–15 employees'
        ? 15
        : data.employees === '16–50 employees'
        ? 50
        : data.employees === '50+ employees'
        ? 51
        : null

    const { data: insertedProfile, error } = await supabase
      .from('user_profiles')
      .insert([
        {
          business_name: null,
          industry: data.industry ?? null,
          stage: data.stage ?? null,
          employees: employeesValue,
          does_rd: doesRdValue,
          goal: data.goal ?? null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error saving profile:', error)
      return null
    }

    console.log('Profile saved successfully:', insertedProfile)
    return insertedProfile
  }

  async function selectOption(value: string) {
    if (isSaving) return

    setSelected(value)
    setErrorMessage(null)

    setTimeout(async () => {
      const newAnswers = { ...answers, [STEPS[step].id]: value }
      setAnswers(newAnswers)
      setSelected(null)

      if (step < STEPS.length - 1) {
        setStep(step + 1)
        return
      }

      try {
        setIsSaving(true)

        localStorage.setItem('quiz_answers', JSON.stringify(newAnswers))

        const savedProfile = await saveProfile(newAnswers)

        if (savedProfile?.id) {
          router.push(`/details?profileId=${savedProfile.id}`)
          return
        }

        setErrorMessage('Could not save your profile. Please try again.')
      } catch (error) {
        console.error('Unexpected quiz save error:', error)
        setErrorMessage('Something went wrong while saving your answers.')
      } finally {
        setIsSaving(false)
      }
    }, 300)
  }

  const current = STEPS[step]
  const progress = (step / STEPS.length) * 100

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
      <div
        style={{
          textAlign: 'center',
          marginBottom: '2.5rem',
        }}
      >
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

      <div
        style={{
          maxWidth: 560,
          margin: '0 auto 2.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Question {step + 1} of {STEPS.length}
          </span>
          <span style={{ fontSize: 13, color: '#02C39A', fontWeight: 600 }}>
            {Math.round((step / STEPS.length) * 100)}% complete
          </span>
        </div>

        <div
          style={{
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: progress + '%',
              background: 'linear-gradient(90deg, #028090, #02C39A)',
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 10,
          }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  i < step
                    ? '#02C39A'
                    : i === step
                    ? '#028090'
                    : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '2rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: 8,
              color: 'white',
            }}
          >
            {current.question}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
            }}
          >
            {current.subtitle}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {current.options.map((opt) => (
            <button
              key={opt}
              onClick={() => selectOption(opt)}
              disabled={isSaving}
              style={{
                padding: '15px 20px',
                textAlign: 'left',
                border:
                  selected === opt
                    ? '1.5px solid #02C39A'
                    : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                background:
                  selected === opt
                    ? 'rgba(2,195,154,0.15)'
                    : 'rgba(255,255,255,0.04)',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: 15,
                color:
                  selected === opt ? '#02C39A' : 'rgba(255,255,255,0.85)',
                fontWeight: selected === opt ? 600 : 400,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                opacity: isSaving ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (selected !== opt && !isSaving) {
                  e.currentTarget.style.borderColor = 'rgba(2,195,154,0.4)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                }
              }}
              onMouseLeave={(e) => {
                if (selected !== opt && !isSaving) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }
              }}
            >
              <span>{opt}</span>
              {selected === opt && (
                <span style={{ fontSize: 18, color: '#02C39A' }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#fecaca',
              fontSize: 14,
            }}
          >
            {errorMessage}
          </div>
        )}

        {isSaving && (
          <div
            style={{
              marginTop: '1rem',
              color: 'rgba(255,255,255,0.65)',
              fontSize: 14,
            }}
          >
            Saving your answers and finding matches...
          </div>
        )}

        {step > 0 && !isSaving && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              marginTop: '1.5rem',
              padding: '8px 0',
              border: 'none',
              background: 'none',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Back to previous question
          </button>
        )}
      </div>
    </div>
  )
}