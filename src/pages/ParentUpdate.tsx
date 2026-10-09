import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'

type Lang = 'en' | 'ko'

const COPY = {
  en: {
    langName: 'English',
    meta: '10th grade · AP Physics 1 · Unit 3',
    active: 'Active',
    week: 'Week of Oct 14 to 18',
    eyebrow: 'Weekly update',
    updated: 'Friday',
    title: 'Minji’s week in physics',
    intro: 'What Minji learned, what she’s working on, and how you can help.',
    overviewEyebrow: 'This week',
    overviewTitle: 'In class',
    labs: '3 labs',
    overviewBody:
      'The class studied how objects move when forces are balanced. Minji was active in the air-track lab and asked good questions.',
    overviewNote: 'Dr. Vance noted that she helped her lab partner set up the motion sensors.',
    labLabel: 'Lab',
    labTitle: 'Air-track motion',
    strengthEyebrow: 'Strengths',
    strengthTitle: 'What she understands well',
    mastery: 'Solid',
    strengthQuote: '“Minji understands Newton’s first law for objects at rest.”',
    strengthBody: 'She can draw the forces on a book sitting on a table and explain why they cancel out.',
    strengthA: 'Draws force diagrams with ease',
    strengthB: 'Explains her reasoning clearly',
    focusEyebrow: 'Working on',
    focusTitle: 'What she’s working on',
    stepping: 'Common step',
    focusBody: (
      <>
        She is still learning how forces work on objects that are <em>already moving</em>. Sometimes she thinks something
        needs a constant push to keep going.
      </>
    ),
    focusNote: 'This is one of the most common ideas students have in physics. Aristotle thought so too.',
    microTitle: 'Practice for this week',
    microBody: '4 short problems she can do at her own pace.',
    preview: 'Preview',
    homeEyebrow: 'At home',
    homeTitle: 'How you can help',
    talk: '5 minutes',
    homeIntro: 'Try this question at dinner. No science background needed.',
    prompt: '“What happens to a hockey puck sliding on smooth ice if nobody touches it?”',
    promptNote: 'Let her explain out loud. If she stops to think or changes her answer, that’s a good sign.',
    noPressure: 'No quizzing. Just a conversation.',
    message: 'Message Dr. Vance',
    privacy: 'Only your family and the school can see these updates.',
  },
  ko: {
    langName: '한국어',
    meta: '10학년 · AP 물리 1 · 3단원',
    active: '활동 중',
    week: '10월 14일 ~ 18일',
    eyebrow: '주간 업데이트',
    updated: '금요일',
    title: '민지의 이번 주 물리',
    intro: '민지가 배운 것, 연습 중인 것, 그리고 집에서 도울 수 있는 방법입니다.',
    overviewEyebrow: '이번 주',
    overviewTitle: '수업에서',
    labs: '실험 3회',
    overviewBody: '힘이 균형을 이룰 때 물체가 어떻게 움직이는지 배웠습니다. 민지는 에어트랙 실험에 적극적으로 참여하고 좋은 질문을 했습니다.',
    overviewNote: 'Vance 선생님은 민지가 실험 짝의 운동 센서 설치를 도왔다고 전했습니다.',
    labLabel: '실험',
    labTitle: '에어트랙 운동',
    strengthEyebrow: '강점',
    strengthTitle: '잘 이해하고 있는 것',
    mastery: '탄탄함',
    strengthQuote: '“민지는 정지한 물체에 대한 뉴턴 제1법칙을 이해하고 있습니다.”',
    strengthBody: '책상 위의 책에 작용하는 힘을 그리고, 왜 서로 상쇄되는지 설명할 수 있습니다.',
    strengthA: '힘 그림을 쉽게 그림',
    strengthB: '자기 생각을 분명하게 설명함',
    focusEyebrow: '연습 중',
    focusTitle: '민지가 연습하고 있는 것',
    stepping: '흔한 단계',
    focusBody: (
      <>
        <em>이미 움직이고 있는</em> 물체에 힘이 어떻게 작용하는지 배우는 중입니다. 가끔은 계속 움직이려면 계속 밀어 줘야
        한다고 생각합니다.
      </>
    ),
    focusNote: '물리에서 학생들이 가장 흔히 갖는 생각 중 하나입니다. 아리스토텔레스도 그렇게 생각했어요.',
    microTitle: '이번 주 연습',
    microBody: '자기 속도에 맞춰 풀 수 있는 짧은 문제 4개입니다.',
    preview: '미리보기',
    homeEyebrow: '가정에서',
    homeTitle: '집에서 도와주는 방법',
    talk: '5분',
    homeIntro: '저녁 식사 때 이 질문을 해 보세요. 과학 지식은 필요 없어요.',
    prompt: '“매끄러운 얼음 위를 미끄러지는 하키 퍽을 아무도 건드리지 않으면 어떻게 될까?”',
    promptNote: '소리 내어 설명하게 해 주세요. 생각하느라 멈추거나 답을 바꾸면 좋은 신호입니다.',
    noPressure: '시험이 아니라 대화입니다.',
    message: 'Vance 선생님께 메시지 보내기',
    privacy: '이 업데이트는 가족과 학교만 볼 수 있습니다.',
  },
} satisfies Record<Lang, Record<string, unknown>>

const PRACTICE = [
  { title: 'The coasting skateboard', kind: 'Prediction', minutes: 3 },
  { title: 'Hockey puck on ice: draw the forces', kind: 'Free-body diagram', minutes: 4 },
  { title: 'Why does the ball stop rolling?', kind: 'Explain it', minutes: 3 },
  { title: 'Spacecraft with engines off', kind: 'Simulation', minutes: 5 },
]

function LanguageMenu({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface text-on-surface hover:bg-surface-container font-body-sm text-body-sm transition-all shadow-sm"
      >
        <Icon name="translate" className="text-[18px] text-primary" />
        <span className="font-title-sm text-title-sm">{COPY[lang].langName}</span>
        <Icon name="expand_more" className="text-[16px] text-secondary" />
      </button>
      {open && (
        <div role="menu" className="animate-fade-up absolute right-0 mt-2 w-48 rounded-xl bg-surface-container-lowest shadow-xl z-30 py-1.5">
          {(['en', 'ko'] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={lang === l}
              onClick={() => {
                onChange(l)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container flex items-center justify-between ${
                lang === l ? 'text-on-surface' : 'text-secondary'
              }`}
            >
              <span>{l === 'en' ? 'English' : '한국어 (Korean)'}</span>
              <Icon name="check" className={`text-[16px] text-primary ${lang === l ? '' : 'opacity-0'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const LANG_KEY = 'compass.parent.lang'

export default function ParentUpdate() {
  const notify = useToast()
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'ko' ? 'ko' : 'en'
    } catch {
      return 'en'
    }
  })
  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* ignore */
    }
  }
  const [previewOpen, setPreviewOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [message, setMessage] = useState('')
  const t = COPY[lang]

  const sendMessage = (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setMessage('')
    setMessageOpen(false)
    notify('Message sent to Dr. Vance', 'mark_email_read')
  }

  return (
    <div lang={lang} className="flex flex-col w-full pb-16">
      {/* Child context bar */}
      <section className="w-full max-w-4xl mx-auto pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-low p-4 sm:p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm shrink-0">
              <img className="w-full h-full object-cover" alt="Minji Kim" src="/images/minji.jpg" />
              <div className="absolute inset-0 bg-primary/10 mix-blend-multiply pointer-events-none" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight">Minji Kim</span>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider">
                  {t.active}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-secondary">{t.meta}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <LanguageMenu lang={lang} onChange={setLang} />
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container font-label-md text-label-md text-secondary">
              <Icon name="calendar_today" className="text-[16px]" />
              <span>{t.week}</span>
            </div>
          </div>
        </div>
      </section>

      <header className="w-full max-w-4xl mx-auto mb-8 px-2 sm:px-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">{t.eyebrow}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-surface-tint" />
          <span className="font-label-sm text-label-sm text-secondary">{t.updated}</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight">{t.title}</h1>
        <p className="font-body-lg text-body-lg text-secondary mt-1.5 max-w-2xl">{t.intro}</p>
      </header>

      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        {/* This week */}
        <article className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 border border-[#EED4D7] shadow-xs transition-all hover:shadow-lift">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                <Icon name="explore" className="text-primary text-[22px]" />
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{t.overviewEyebrow}</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t.overviewTitle}</h2>
              </div>
            </div>
            <span className="font-label-md text-label-md px-3 py-1 rounded-full bg-surface-container text-secondary whitespace-nowrap">
              {t.labs}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
            <div className="md:col-span-8 flex flex-col gap-3">
              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">{t.overviewBody}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{t.overviewNote}</p>
            </div>
            <div className="md:col-span-4 relative rounded-lg overflow-hidden h-40 bg-surface-container shadow-inner">
              <img
                className="w-full h-full object-cover"
                alt="Physics classroom with an air-track setup and motion sensors"
                src="/images/air-track-lab.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 text-on-primary">
                <span className="font-label-sm text-label-sm uppercase tracking-wide opacity-90">{t.labLabel}</span>
                <p className="font-title-sm text-title-sm font-medium leading-tight">{t.labTitle}</p>
              </div>
            </div>
          </div>
        </article>

        {/* Strengths */}
        <article className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 border border-[#EED4D7] shadow-xs transition-all hover:shadow-lift">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF3EB] text-[#4F6D54] flex items-center justify-center shrink-0">
                <Icon name="check_circle" className="text-[22px]" filled />
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#4F6D54]">{t.strengthEyebrow}</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t.strengthTitle}</h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3EB] text-[#4F6D54] font-label-md text-label-md whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6D54]" />
              {t.mastery}
            </span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-5 sm:p-6 mb-4">
            <p className="font-headline-sm text-headline-sm text-on-surface leading-snug mb-3">{t.strengthQuote}</p>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{t.strengthBody}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-secondary pt-1">
            <div className="flex items-center gap-2">
              <Icon name="verified" className="text-primary text-[18px]" />
              <span className="font-body-sm text-body-sm">{t.strengthA}</span>
            </div>
            <span className="hidden sm:inline text-outline-variant">·</span>
            <div className="flex items-center gap-2">
              <Icon name="psychology" className="text-primary text-[18px]" />
              <span className="font-body-sm text-body-sm">{t.strengthB}</span>
            </div>
          </div>
        </article>

        {/* Working on */}
        <article className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 border border-[#EED4D7] shadow-xs transition-all hover:shadow-lift">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-fixed text-tertiary-container flex items-center justify-center shrink-0">
                <Icon name="lightbulb" className="text-[22px]" />
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-surface-tint">{t.focusEyebrow}</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t.focusTitle}</h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              {t.stepping}
            </span>
          </div>
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-lg bg-surface-container">
              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">{t.focusBody}</p>
              <div className="mt-3 flex items-start gap-2.5 text-secondary font-body-sm text-body-sm">
                <Icon name="info" className="text-[18px] text-outline shrink-0 mt-0.5" />
                <span>{t.focusNote}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <Icon name="play_circle" className="text-[18px]" />
                </div>
                <div>
                  <p className="font-title-sm text-title-sm text-on-surface">{t.microTitle}</p>
                  <p className="font-body-sm text-body-sm text-secondary">{t.microBody}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-4 py-2 rounded-lg bg-surface text-primary font-title-sm text-title-sm hover:bg-surface-container transition-colors shrink-0 shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>{t.preview}</span>
                <Icon name="arrow_forward" className="text-[16px]" />
              </button>
            </div>
          </div>
        </article>

        {/* How you can help */}
        <article className="bg-secondary-fixed/40 rounded-xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary-fixed/50 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Icon name="forum" className="text-[22px]" />
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">{t.homeEyebrow}</span>
                  <h2 className="font-headline-md text-headline-md text-primary">{t.homeTitle}</h2>
                </div>
              </div>
              <span className="font-label-md text-label-md px-3 py-1 rounded-full bg-surface text-primary font-medium shadow-sm whitespace-nowrap">
                {t.talk}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface font-medium mb-5">{t.homeIntro}</p>
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm mb-5">
              <div className="flex items-start gap-4">
                <Icon name="format_quote" className="text-primary text-[28px] shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-headline-sm text-headline-sm text-primary italic leading-snug">{t.prompt}</p>
                  <p className="font-body-md text-body-md text-secondary leading-relaxed pt-1">{t.promptNote}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-secondary font-body-sm text-body-sm">
              <Icon name="favorite" className="text-[18px] text-surface-tint" />
              <span>{t.noPressure}</span>
            </div>
          </div>
        </article>
      </div>

      <footer className="w-full max-w-4xl mx-auto mt-10 flex flex-col items-center gap-5 text-center">
        <button
          type="button"
          onClick={() => setMessageOpen(true)}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-tertiary-container hover:-translate-y-0.5 transition-all"
        >
          <Icon name="mark_email_unread" className="text-[20px]" />
          <span>{t.message}</span>
        </button>
        <div className="flex items-center gap-2 text-secondary font-body-sm text-body-sm">
          <Icon name="lock" className="text-[16px] text-outline" />
          <span>{t.privacy}</span>
        </div>
      </footer>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} eyebrow={t.microTitle} title="This week’s practice">
        <ul className="flex flex-col gap-space-sm">
          {PRACTICE.map((p, i) => (
            <li key={p.title} className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low">
              <span className="w-8 h-8 rounded-full bg-secondary-container text-primary font-title-sm text-title-sm flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-title-sm text-title-sm text-on-surface">{p.title}</p>
                <p className="font-body-sm text-body-sm text-secondary">
                  {p.kind} · {p.minutes} min
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-space-md font-body-sm text-body-sm text-secondary">
          Minji can open these in her student account. There are no scores, just hints.
        </p>
      </Modal>

      <Modal
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        eyebrow="AP Physics 1 · Period 3"
        title="Message Dr. Vance"
        footer={
          <button
            type="submit"
            form="message-teacher"
            disabled={!message.trim()}
            className="bg-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed text-on-primary px-space-lg py-space-sm rounded-lg font-title-sm text-title-sm inline-flex items-center gap-space-xs"
          >
            <Icon name="send" className="text-[18px]" />
            Send message
          </button>
        }
      >
        <form id="message-teacher" onSubmit={sendMessage}>
          <label htmlFor="teacher-message" className="block font-label-md text-label-md text-on-surface mb-1.5">
            Your message
          </label>
          <textarea
            id="teacher-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Thank you for the update! Minji explained the hockey puck at dinner…"
            className="w-full px-4 py-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-space-xs font-body-sm text-body-sm text-secondary">
            {lang === 'ko' ? 'Your message will be translated for Dr. Vance.' : 'Dr. Vance usually replies within a school day.'}
          </p>
        </form>
      </Modal>
    </div>
  )
}
