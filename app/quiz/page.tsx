'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import '@/lib/i18n'
import { supabase } from '@/lib/supabase'

const STEPS = [
  {
    id: 'industry',
    questionKey: 'quiz.industry_question',
    subtitleKey: 'quiz.industry_subtitle',
    options: [
      { value: 'Technology / Software', labelKey: 'quiz.industry_opt_1' },
      { value: 'Clean Energy / Cleantech', labelKey: 'quiz.industry_opt_2' },
      { value: 'Manufacturing', labelKey: 'quiz.industry_opt_3' },
      { value: 'Agriculture / Food', labelKey: 'quiz.industry_opt_4' },
      { value: 'Health & Life Sciences', labelKey: 'quiz.industry_opt_5' },
      { value: 'Retail / Hospitality', labelKey: 'quiz.industry_opt_6' },
      { value: 'Professional Services', labelKey: 'quiz.industry_opt_7' },
      { value: 'Construction', labelKey: 'quiz.industry_opt_8' },
      { value: 'Media / Creative', labelKey: 'quiz.industry_opt_9' },
      { value: 'Arts, Culture & Creative Industries', labelKey: 'quiz.industry_opt_11' },
      { value: 'Other', labelKey: 'quiz.industry_opt_10' },
    ],
  },
  {
    id: 'stage',
    questionKey: 'quiz.stage_question',
    subtitleKey: 'quiz.stage_subtitle',
    options: [
      { value: 'Idea / Pre-revenue', labelKey: 'quiz.stage_opt_1' },
      { value: 'Startup', labelKey: 'quiz.stage_opt_2' },
      { value: 'Growth', labelKey: 'quiz.stage_opt_3' },
      { value: 'Established', labelKey: 'quiz.stage_opt_4' },
    ],
  },
  {
    id: 'employees',
    questionKey: 'quiz.employees_question',
    subtitleKey: 'quiz.employees_subtitle',
    options: [
      { value: 'Just me (1)', labelKey: 'quiz.employees_opt_1' },
      { value: '2–4 employees', labelKey: 'quiz.employees_opt_2' },
      { value: '5–15 employees', labelKey: 'quiz.employees_opt_3' },
      { value: '16–50 employees', labelKey: 'quiz.employees_opt_4' },
      { value: '50+ employees', labelKey: 'quiz.employees_opt_5' },
    ],
  },
  {
    id: 'does_rd',
    questionKey: 'quiz.does_rd_question',
    subtitleKey: 'quiz.does_rd_subtitle',
    options: [
      {
        value: 'Yes — strong R&D / innovation focus',
        labelKey: 'quiz.does_rd_opt_1',
      },
      {
        value: 'Some — occasional innovation work',
        labelKey: 'quiz.does_rd_opt_2',
      },
      {
        value: 'No — mainly operations or services',
        labelKey: 'quiz.does_rd_opt_3',
      },
    ],
  },
  {
    id: 'goal',
    questionKey: 'quiz.goal_question',
    subtitleKey: 'quiz.goal_subtitle',
    options: [
      { value: 'Hiring staff', labelKey: 'quiz.goal_opt_1' },
      { value: 'Product development / innovation', labelKey: 'quiz.goal_opt_2' },
      { value: 'R&D / commercialization', labelKey: 'quiz.goal_opt_3' },
      { value: 'Export / new markets', labelKey: 'quiz.goal_opt_4' },
      { value: 'Equipment / capital investment', labelKey: 'quiz.goal_opt_5' },
      { value: 'Digital adoption / automation', labelKey: 'quiz.goal_opt_6' },
      { value: 'Training employees', labelKey: 'quiz.goal_opt_7' },
      { value: 'Sustainability / energy efficiency', labelKey: 'quiz.goal_opt_8' },
      { value: 'General business growth', labelKey: 'quiz.goal_opt_9' },
    ],
  },
  {
    id: 'funding_need_type',
    questionKey: 'quiz.funding_need_type_question',
    subtitleKey: 'quiz.funding_need_type_subtitle',
    options: [
      { value: 'Grant', labelKey: 'quiz.funding_need_type_opt_1' },
      { value: 'Loan', labelKey: 'quiz.funding_need_type_opt_2' },
      { value: 'Investment', labelKey: 'quiz.funding_need_type_opt_3' },
      { value: 'Tax Credit', labelKey: 'quiz.funding_need_type_opt_4' },
      { value: 'Not sure', labelKey: 'quiz.funding_need_type_opt_5' },
    ],
  },
  {
    id: 'ownership_type',
    questionKey: 'quiz.ownership_type_question',
    subtitleKey: 'quiz.ownership_type_subtitle',
    options: [
      { value: 'Women-led', labelKey: 'quiz.ownership_type_opt_1' },
      { value: 'Indigenous-led', labelKey: 'quiz.ownership_type_opt_2' },
      { value: 'Youth-led', labelKey: 'quiz.ownership_type_opt_3' },
      { value: 'General', labelKey: 'quiz.ownership_type_opt_4' },
    ],
  },
]

export default function QuizPage() {
  const { t } = useTranslation()
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
      data.does_rd === 'Yes — strong R&D / innovation focus'
        ? true
        : data.does_rd === 'Some — occasional innovation work'
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
          funding_need_type: data.funding_need_type ?? null,
          ownership_type: data.ownership_type ?? null,
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

        setErrorMessage(t('quiz.saveError'))
      } catch (error) {
        console.error('Unexpected quiz save error:', error)
        setErrorMessage(t('quiz.unexpectedError'))
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
        <span className="brand">{t('common.brand')}</span>
      </div>

      <div className="container">
        <div className="progressWrap">
          <div className="progressHeader">
            <span className="mutedText">
              {t('quiz.questionCounter', {
                current: step + 1,
                total: STEPS.length,
              })}
            </span>
            <span className="progressText">
              {t('quiz.progressComplete', { value: Math.round(progress) })}
            </span>
          </div>

          <div className="progressBarTrack">
            <div className="progressBarFill" style={{ width: `${progress}%` }} />
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
          <div className="questionBadge">{t('quiz.badge')}</div>

          <h1 className="questionTitle">{t(current.questionKey)}</h1>

          <p className="questionSubtitle">{t(current.subtitleKey)}</p>
        </div>

        <div className="optionsList">
          {current.options.map((opt) => {
            const isSelected = selected === opt.value

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectOption(opt.value)}
                disabled={isSaving}
                className={`optionButton ${isSelected ? 'selected' : ''}`}
              >
                <span className="optionText">{t(opt.labelKey)}</span>
                <span className={`optionCheck ${isSelected ? 'visible' : ''}`}>
                  ✓
                </span>
              </button>
            )
          })}
        </div>

        {errorMessage && <div className="errorBox">{errorMessage}</div>}

        {isSaving && <div className="savingText">{t('quiz.savingAnswers')}</div>}

        <div className="footerActions">
          {step > 0 && !isSaving ? (
            <button type="button" onClick={goBack} className="backButton">
              {t('quiz.back')}
            </button>
          ) : (
            <div />
          )}

          <div className="stepIndicator">
            {t('quiz.stepIndicator', {
              current: step + 1,
              total: STEPS.length,
            })}
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