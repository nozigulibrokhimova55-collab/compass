import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'

type Lang = 'en' | 'ko'

const COPY = {
  en: {
    langName: 'English',
    meta: '10th Grade · AP Physics 1 · Unit 3 Dynamics',
    active: 'Active',
    week: 'Week of Oct 14–18',
    eyebrow: 'Weekly Narrative Diagnosis',
    updated: 'Updated Friday afternoon',
    title: 'A calm window into Minji’s conceptual growth.',
    intro: 'We look beyond test numbers to see how your child makes sense of the physical world. Here is how Minji explored physics this past week.',
    overviewEyebrow: 'Pedagogical Overview',
    overviewTitle: 'This week in the classroom',
    labs: '3 Labs Completed',
    overviewBody:
      'This week in Physics, the class explored how objects move when forces are balanced. Minji participated actively in the frictionless air-track lab and showed strong curiosity when investigating subtle momentum shifts.',
    overviewNote:
      'Dr. Vance noted that she posed thoughtful questions about everyday gravity and voluntarily assisted her lab partner in calibrating the ultrasonic motion detectors.',
    labLabel: 'Lab Activity',
    labTitle: 'Frictionless Surfaces & Vectors',
    strengthEyebrow: 'Demonstrated Intuition',
    strengthTitle: 'Strengths & Solid Ground',
    mastery: 'Deep Mastery',
    strengthQuote: '“Minji has completely mastered Newton’s first law in static equilibrium.”',
    strengthBody:
      'She can confidently identify balanced forces in stationary objects, like books resting on a table or hanging picture frames, correctly diagramming why the net force equals zero without hesitation.',
    strengthA: 'Zero hesitation on static free-body diagrams',
    strengthB: 'Clear verbal justification during peer reviews',
    focusEyebrow: 'Gentle Focus Area',
    focusTitle: 'What She’s Working On',
    stepping: 'Natural Stepping Stone',
    focusBody: (
      <>
        She is currently building confidence with force diagrams when objects are <em>already in motion</em>. She
        occasionally feels that continuous forward motion requires an active push to sustain it.
      </>
    ),
    focusNote:
      'This is one of the most common and natural hurdles in high school physics (Aristotle felt the same way!). It represents a healthy pivot point in scientific reasoning.',
    microTitle: 'Curated micro-exploration',
    microBody: 'Compass has prepared 4 short interactive practice problems for her to explore this week at her own pace.',
    preview: 'Preview Activities',
    homeEyebrow: 'Family Connection',
    homeTitle: 'How You Can Help at Home',
    talk: '5-Minute Talk',
    homeIntro: 'One simple conversation to try at home (no science knowledge required):',
    prompt: '“Ask Minji to explain what happens to a hockey puck sliding across smooth ice when nobody touches it.”',
    promptNote:
      'Just listening to her explain it out loud helps her organize the concept. If she pauses or changes her mind halfway through, smile and let her ponder—that is where real understanding clicks!',
    noPressure: 'No pressure, no quizzing. Just dinner-table curiosity.',
    message: 'Message Dr. Vance (Teacher)',
    privacy: 'Compass updates are private to your family and school. Zero punitive grading.',
  },
  ko: {
    langName: '한국어',
    meta: '10학년 · AP 물리 1 · 3단원 역학',
    active: '활동 중',
    week: '10월 14–18일 주간',
    eyebrow: '주간 서술형 진단',
    updated: '금요일 오후 업데이트',
    title: '민지의 개념적 성장을 차분히 들여다보는 창.',
    intro: '시험 점수 너머, 자녀가 물리 세계를 어떻게 이해하는지 살펴봅니다. 지난 한 주 민지가 물리를 탐구한 모습입니다.',
    overviewEyebrow: '수업 개요',
    overviewTitle: '이번 주 교실에서는',
    labs: '실험 3회 완료',
    overviewBody:
      '이번 주 물리 시간에는 힘이 균형을 이룰 때 물체가 어떻게 움직이는지 탐구했습니다. 민지는 마찰 없는 에어트랙 실험에 적극적으로 참여했고, 미세한 운동량 변화를 관찰하며 큰 호기심을 보였습니다.',
    overviewNote:
      'Vance 선생님은 민지가 일상 속 중력에 대해 깊이 있는 질문을 던졌고, 실험 짝이 초음파 운동 감지기를 보정하는 것을 자발적으로 도왔다고 전했습니다.',
    labLabel: '실험 활동',
    labTitle: '마찰 없는 표면과 벡터',
    strengthEyebrow: '드러난 직관',
    strengthTitle: '강점과 탄탄한 기초',
    mastery: '깊은 이해',
    strengthQuote: '“민지는 정적 평형 상태에서의 뉴턴 제1법칙을 완벽히 이해했습니다.”',
    strengthBody:
      '책상 위의 책이나 벽에 걸린 액자처럼 정지한 물체에 작용하는 균형 잡힌 힘을 자신 있게 찾아내고, 알짜힘이 0인 이유를 망설임 없이 그림으로 설명합니다.',
    strengthA: '정적 자유물체도를 망설임 없이 작성',
    strengthB: '동료 평가에서 명확한 언어적 설명',
    focusEyebrow: '부드러운 성장 영역',
    focusTitle: '민지가 연습하고 있는 것',
    stepping: '자연스러운 디딤돌',
    focusBody: (
      <>
        민지는 <em>이미 움직이고 있는</em> 물체의 힘 그림을 그리는 데 자신감을 키워 가고 있습니다. 가끔은 앞으로 계속
        움직이려면 계속 밀어 주어야 한다고 느끼기도 합니다.
      </>
    ),
    focusNote:
      '이는 고등학교 물리에서 가장 흔하고 자연스러운 고비입니다(아리스토텔레스도 같은 생각을 했어요!). 과학적 사고가 건강하게 전환되는 지점입니다.',
    microTitle: '맞춤형 미니 탐구',
    microBody: 'Compass가 이번 주 민지가 자기 속도에 맞춰 풀어 볼 수 있는 짧은 인터랙티브 문제 4개를 준비했습니다.',
    preview: '활동 미리보기',
    homeEyebrow: '가정 연계',
    homeTitle: '가정에서 도와주는 방법',
    talk: '5분 대화',
    homeIntro: '집에서 시도해 볼 간단한 대화 하나 (과학 지식은 필요 없어요):',
    prompt: '“매끄러운 얼음 위를 미끄러지는 하키 퍽을 아무도 건드리지 않으면 어떻게 되는지 민지에게 설명해 달라고 해 보세요.”',
    promptNote:
      '소리 내어 설명하는 것을 들어 주기만 해도 개념이 정리됩니다. 중간에 멈추거나 생각을 바꾸면 미소 지으며 기다려 주세요. 바로 그때 진짜 이해가 일어납니다!',
    noPressure: '부담도, 시험도 없이. 저녁 식탁의 호기심이면 충분합니다.',
    message: 'Vance 선생님께 메시지 보내기',
    privacy: 'Compass 업데이트는 가족과 학교만 볼 수 있습니다. 처벌적 채점은 없습니다.',
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
        <article className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
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
        <article className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
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
        <article className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
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

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} eyebrow={t.microTitle} title="This week’s explorations">
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
          Minji can open these from her student portal anytime. There are no scores—only hints and explanations.
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
            {lang === 'ko' ? 'Messages are translated for Dr. Vance automatically.' : 'Replies usually arrive within one school day.'}
          </p>
        </form>
      </Modal>
    </div>
  )
}
