import { useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Accordion } from '../components/ui/Accordion'
import { BrowserWindow } from '../components/ui/BrowserWindow'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Frame } from '../components/ui/Frame'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ShowcasePanel } from '../components/ui/ShowcasePanel'
import { SiteFooter } from '../components/ui/SiteFooter'
import { SiteHeader } from '../components/ui/SiteHeader'
import { SkyBackground } from '../components/ui/SkyBackground'
import { StatCard } from '../components/ui/StatCard'
import { StatementCard } from '../components/ui/StatementCard'
import { StickyNote } from '../components/ui/StickyNote'
import { ThreadCard, type Person } from '../components/ui/ThreadCard'
import { ATTENDANCE, attendanceStats, CLASS, markFor, PARENT, quizStats, STUDENTS, TEACHER, TOPICS } from '../lib/sample'

const MARK_STYLE = {
  present: 'bg-[#E3F5EA] text-[#1F6B3A]',
  late: 'bg-note text-[#7A4A12]',
  absent: 'bg-[#FBE1D8] text-accent-strong',
}

/** A labeled block on this page. */
function Block({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="mt-24">
      <h2 className="mb-6 w-fit rounded-full bg-white/85 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy backdrop-blur-sm">{name}</h2>
      {children}
    </section>
  )
}

/** Every design-system component on one page, filled with sample data, for checking the look. */
export default function DesignSystem() {
  const [chip, setChip] = useState('all')
  const today = ATTENDANCE[ATTENDANCE.length - 1]
  const week = attendanceStats()
  const minji = attendanceStats('minji')
  const quizzes = quizStats()
  const teacher: Person = { name: TEACHER.name, initials: TEACHER.initials, tone: 'orange' }
  const parent: Person = { name: PARENT.name, initials: PARENT.initials, tone: 'beige' }
  const weakest = TOPICS[TOPICS.length - 1]

  return (
    <div className="flex min-h-screen flex-col font-inter text-navy antialiased">
      <SkyBackground />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-32 pt-20 md:px-8">
        <SectionHeader as="h1" script="the building blocks" title="Design system" note="Every piece on this page uses sample data from Ms. Park’s class." />

        <Block name="1 · Frame">
          <div className="grid gap-8 md:grid-cols-2">
            <Frame
              label="attendance.frame"
              tabEnd={<span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">{today.day}, Oct 9</span>}
            >
              <h3 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{CLASS.name}</h3>
              <ul className="mt-4 divide-y divide-card-line">
                {STUDENTS.slice(0, 5).map((s) => {
                  const mark = markFor(today, s.id)
                  return (
                    <li key={s.id} className="flex items-center justify-between py-2.5">
                      <span className="font-inter text-[16px]">{s.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] ${MARK_STYLE[mark]}`}>{mark}</span>
                    </li>
                  )
                })}
              </ul>
            </Frame>
            <Frame label="note.frame" tone="navy">
              <h3 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Dark frames work too</h3>
              <p className="mt-3 font-inter text-[16px] leading-7 text-white/85">
                Hover a frame, or tab to something inside it, and the blue selection outline shows up. Each frame also draws it once when it first scrolls into view.
              </p>
            </Frame>
          </div>
        </Block>

        <Block name="2 · Section header and sticky note">
          <div className="flex flex-wrap items-start gap-10">
            <StickyNote>Ask Minji: “Why does a sled keep sliding after you let go?”</StickyNote>
            <StickyNote tilt={2}>The section header at the top of this page is the full version.</StickyNote>
          </div>
        </Block>

        <Block name="3 · Statement card">
          <div className="grid gap-8 md:grid-cols-2">
            <StatementCard title="Minji is doing well with" highlight="Newton’s first law." footer={['Sample summary', 'Updated Fri, Oct 9']}>
              She can explain why things keep moving. Next up: {weakest.name}, where action and reaction forces still get mixed up.
            </StatementCard>
            <StatCard
              title="This week · whole class"
              stats={[
                { value: String(week.rate), symbol: '%', label: 'Attendance' },
                { value: String(week.absent), label: 'Absences' },
                { value: String(week.late), label: 'Late arrivals' },
              ]}
              note={`Counted from ${week.days} school days in ${CLASS.name}.`}
            />
          </div>
        </Block>

        <Block name="4 · Dark stat card">
          <StatCard
            className="max-w-xl"
            title="Minji · this week"
            stats={[
              { value: String(minji.rate), symbol: '%', label: 'Attendance' },
              { value: String(quizzes.completed), symbol: `/${quizzes.assigned}`, label: 'Quizzes done' },
            ]}
          />
        </Block>

        <Block name="5 · Chip buttons">
          <div className="flex flex-wrap gap-3">
            {[
              ['all', 'All quizzes', 'list'],
              ['due', 'Due soon', 'schedule'],
              ['done', 'Finished', 'check_circle'],
            ].map(([id, label, icon]) => (
              <Chip key={id} icon={icon} selected={chip === id} onClick={() => setChip(id)}>
                {label}
              </Chip>
            ))}
            <Chip static icon="bolt">
              Static tag
            </Chip>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button icon="arrow_forward">Orange button</Button>
            <Button variant="navy">Navy button</Button>
            <Button variant="outline">Outline button</Button>
            <Button variant="soft">Soft button</Button>
          </div>
        </Block>

        <Block name="6 · Thread card">
          <ThreadCard
            className="max-w-2xl"
            title="Minji’s week in physics"
            subtitle={`${CLASS.name} · Sample thread`}
            people={[teacher, parent]}
            items={[
              { kind: 'divider', label: '01 · This week' },
              {
                kind: 'message',
                from: teacher,
                time: 'Fri 3:40 PM',
                text: 'Minji finished Quiz 3 and got 5 of 6 right. She explained the sled question really well in class.',
                files: [{ name: 'quiz_3_results.pdf' }],
              },
              { kind: 'divider', label: '02 · Working on' },
              { kind: 'message', from: teacher, time: 'Fri 3:41 PM', text: 'Action and reaction forces. A short retry quiz is waiting for her.' },
              { kind: 'message', from: parent, time: 'Fri 7:12 PM', text: 'Thank you! We’ll try the sled question at dinner.', mine: true },
            ]}
            footer={
              <div className="flex items-center gap-3">
                <label htmlFor="ds-reply" className="sr-only">
                  Reply to {TEACHER.name}
                </label>
                <input id="ds-reply" placeholder={`Reply to ${TEACHER.name}`} className="min-h-11 flex-1 rounded-xl border border-card-line bg-white px-4 font-inter text-[16px] text-navy placeholder:text-navy-soft" />
                <Button variant="navy" icon="send">
                  Send
                </Button>
              </div>
            }
          />
        </Block>

        <Block name="7 · Accordion">
          <Accordion
            className="max-w-3xl"
            items={[
              { tab: 'step_01.frame', title: 'Paste your lesson notes', body: 'Drop in a file or paste text. Compass reads it and suggests topics.' },
              { tab: 'step_02.frame', title: 'Pick a topic and difficulty', body: 'Choose how many questions you want and how hard they should be.' },
              { tab: 'step_03.frame', title: 'Review, then publish', body: 'Edit any question. Nothing reaches students until you press publish.' },
            ]}
          />
        </Block>

        <Block name="8 · Showcase panel">
          <ShowcasePanel
            number={1}
            title="Quizzes from"
            highlight="your own notes"
            text="Paste what you taught today and get a short quiz back. You check every question before anyone sees it."
            actions={<Button variant="navy" icon="arrow_forward">Try it</Button>}
          >
            <BrowserWindow url="compass.app/teacher/quiz">
              <div className="rounded-xl border border-card-line bg-white p-4">
                <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">Sample · Question 1 of 5</p>
                <p className="mt-2 font-inter text-[16px] font-semibold leading-6 text-navy">A cart rolls at a steady speed. Is there a net force on it?</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {['Yes, or it would stop', 'No, the forces balance'].map((a, i) => (
                    <li key={a} className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-inter text-[15px] ${i === 1 ? 'border-select bg-[#EEF5FD]' : 'border-card-line'}`}>
                      <Icon name={i === 1 ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-[18px] text-select" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </BrowserWindow>
          </ShowcasePanel>
        </Block>
      </main>
      <SiteFooter />
    </div>
  )
}
