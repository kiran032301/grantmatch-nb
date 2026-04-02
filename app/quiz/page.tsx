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

  const current = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

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
        setStep((prev) => prev + 1)
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
    }, 220)
  }

  function goBack() {
    if (step === 0 || isSaving) return
    setErrorMessage(null)
    setSelected(null)
    setStep((prev) => prev - 1)
  }

  return (
    <main className="page">
      <div className="topBrand">
        <span className="brand">GrantMatch NB</span>
      </div>

      <div className="container">
        <div className="progressWrap">
          <div className="progressHeader">
            <span className="mutedText">
              Question {step + 1} of {STEPS.length}
            </span>
            <span className="progressText">{Math.round(progress)}% complete</span>
          </div>

          <div className="progressBarTrack">
            <div
              className="progressBarFill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="dotsRow">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="questionCard">
          <div className="questionBadge">NB Funding Match Quiz</div>

          <h1 className="questionTitle">{current.question}</h1>

          <p className="questionSubtitle">{current.subtitle}</p>
        </div>

        <div className="optionsList">
          {current.options.map((opt) => {
            const isSelected = selected === opt

            return (
              <button
                key={opt}
                type="button"
                onClick={() => selectOption(opt)}
                disabled={isSaving}
                className={`optionButton ${isSelected ? 'selected' : ''}`}
              >
                <span className="optionText">{opt}</span>
                <span className={`optionCheck ${isSelected ? 'visible' : ''}`}>✓</span>
              </button>
            )
          })}
        </div>

        {errorMessage && <div className="errorBox">{errorMessage}</div>}

        {isSaving && (
          <div className="savingText">
            Saving your answers and preparing your personalized matches...
          </div>
        )}

        <div className="footerActions">
          {step > 0 && !isSaving ? (
            <button type="button" onClick={goBack} className="backButton">
              ← Back to previous question
            </button>
          ) : (
            <div />
          )}

          <div className="stepIndicator">
            Step {step + 1} / {STEPS.length}
          </div>
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

        .topBrand {
          text-align: center;
          margin-bottom: 28px;
        }

        .brand {
          font-size: 20px;
          font-weight: 700;
          color: #02c39a;
        }

        .container {
          max-width: 760px;
          margin: 0 auto;
        }

        .progressWrap {
          max-width: 640px;
          margin: 0 auto 24px;
        }

        .progressHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .mutedText {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.48);
        }

        .progressText {
          font-size: 13px;
          color: #02c39a;
          font-weight: 700;
        }

        .progressBarTrack {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
        }

        .progressBarFill {
          height: 100%;
          background: linear-gradient(90deg, #028090, #02c39a);
          border-radius: 999px;
          transition: width 0.35s ease;
        }

        .dotsRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          transition: all 0.25s ease;
          flex: 0 0 auto;
        }

        .dot.done {
          background: #02c39a;
        }

        .dot.active {
          background: #028090;
          transform: scale(1.15);
        }

        .questionCard {
          max-width: 640px;
          margin: 0 auto 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
        }

        .questionBadge {
          display: inline-block;
          margin-bottom: 14px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(2, 195, 154, 0.1);
          border: 1px solid rgba(2, 195, 154, 0.22);
          color: #02c39a;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .questionTitle {
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          line-height: 1.2;
          font-weight: 800;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
        }

        .questionSubtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.58);
          margin: 0;
          line-height: 1.65;
        }

        .optionsList {
          max-width: 640px;
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .optionButton {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.88);
          padding: 16px 18px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.12s ease;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
        }

        .optionButton:hover:not(:disabled) {
          border-color: rgba(2, 195, 154, 0.4);
          background: rgba(255, 255, 255, 0.07);
          transform: translateY(-1px);
        }

        .optionButton:disabled {
          cursor: not-allowed;
          opacity: 0.72;
        }

        .optionButton.selected {
          border: 1.5px solid #02c39a;
          background: rgba(2, 195, 154, 0.14);
          color: #02c39a;
        }

        .optionText {
          font-size: 15px;
          line-height: 1.5;
          font-weight: 500;
        }

        .optionCheck {
          font-size: 18px;
          color: #02c39a;
          opacity: 0;
          transform: scale(0.8);
          transition: opacity 0.18s ease, transform 0.18s ease;
          flex: 0 0 auto;
        }

        .optionCheck.visible {
          opacity: 1;
          transform: scale(1);
        }

        .errorBox {
          max-width: 640px;
          margin: 16px auto 0;
          padding: 14px 16px;
          border-radius: 14px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fecaca;
          font-size: 14px;
          line-height: 1.5;
        }

        .savingText {
          max-width: 640px;
          margin: 16px auto 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 14px;
          line-height: 1.5;
        }

        .footerActions {
          max-width: 640px;
          margin: 18px auto 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .backButton {
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.42);
          cursor: pointer;
          font-size: 14px;
          padding: 8px 0;
          transition: color 0.2s ease;
        }

        .backButton:hover {
          color: rgba(255, 255, 255, 0.72);
        }

        .stepIndicator {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.35);
        }

        @media (max-width: 640px) {
          .page {
            padding: 18px 14px 32px;
          }

          .topBrand {
            margin-bottom: 22px;
          }

          .brand {
            font-size: 18px;
          }

          .questionCard {
            padding: 22px 18px;
            border-radius: 18px;
          }

          .optionButton {
            padding: 15px 14px;
            border-radius: 14px;
          }

          .optionText {
            font-size: 14px;
          }

          .footerActions {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  )
}