import { useState, type FormEvent } from 'react'
import { SampleTag } from '../../components/area/AreaBits'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { errorMessage, inviteCodeExists } from '../../lib/db'
import { LANGUAGES, useChildren, useParentSettings } from '../../lib/sampleData'

export default function ParentSettings() {
  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="your way" title="Settings" />
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
        <LanguageCard />
        <LinkChildCard />
      </div>
    </>
  )
}

function LanguageCard() {
  const notify = useToast()
  const { language, setLanguage } = useParentSettings()
  const [picked, setPicked] = useState(language)
  const changed = picked !== language

  const save = () => {
    setLanguage(picked)
    notify(`Saved. We’ll use ${LANGUAGES.find((l) => l.id === picked)?.english ?? picked}.`)
  }

  return (
    <Frame label="language.frame" tabEnd={<SampleTag />} bodyClassName="p-6 md:p-7">
      <fieldset>
        <legend className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Preferred language</legend>
        <p className="mt-1 font-inter text-[16px] leading-7 text-navy-soft">The language we use for your updates and messages from school.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {LANGUAGES.map((l) => {
            const on = picked === l.id
            return (
              <label
                key={l.id}
                lang={l.id === 'Korean' ? 'ko' : l.id === 'Russian' ? 'ru' : l.id === 'Mongolian' ? 'mn' : 'en'}
                className={`flex min-h-[72px] cursor-pointer flex-col justify-center rounded-2xl border-2 px-4 py-3 transition-colors duration-150 active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select ${
                  on ? 'border-navy bg-navy text-white' : 'border-card-line bg-white text-navy hover:border-navy'
                }`}
              >
                <input type="radio" name="language" value={l.id} checked={on} onChange={() => setPicked(l.id)} className="sr-only" />
                <span className="flex items-center justify-between gap-2 font-inter text-[18px] font-semibold">
                  {l.label}
                  {on && <Icon name="check_circle" className="text-[20px] text-accent-soft" filled />}
                </span>
                {l.label !== l.english && (
                  <span lang="en" className={`font-inter text-[14px] ${on ? 'text-white/85' : 'text-navy-soft'}`}>
                    {l.english}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-dashed border-card-line pt-5">
        <Button variant="navy" icon={changed ? 'save' : 'check'} onClick={save} disabled={!changed}>
          {changed ? 'Save language' : 'Saved'}
        </Button>
        <p className="font-inter text-[14px] text-navy-soft">Saved on this device for now.</p>
      </div>
    </Frame>
  )
}

function LinkChildCard() {
  const notify = useToast()
  const { children } = useChildren()
  const { pendingLinks, addPending } = useParentSettings()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean) {
      setError('Type the invite code from your child’s Compass page.')
      document.getElementById('link-code')?.focus()
      return
    }
    if (pendingLinks.includes(clean)) {
      setError('You already added that code.')
      return
    }
    setChecking(true)
    setError('')
    try {
      if (!(await inviteCodeExists(clean))) {
        setError('We couldn’t find that code. Check it with your child and try again.')
        document.getElementById('link-code')?.focus()
        return
      }
      addPending(clean)
      setCode('')
      notify('Code found. We’ll link it as soon as linking is switched on.')
    } catch (err) {
      setError(errorMessage(err, 'We couldn’t check that code. Try again in a moment.'))
    } finally {
      setChecking(false)
    }
  }

  return (
    <Frame label="link_child.frame" bodyClassName="p-6 md:p-7">
      <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Your children</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {children.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-[#F3F7FC] px-4 py-3 font-inter text-[16px]">
            <Icon name="person" className="text-[22px] text-select" />
            <span className="flex-1">
              <span className="font-semibold">{c.name}</span>
              <span className="block text-[14px] text-navy-soft">{c.className}</span>
            </span>
            <SampleTag />
          </li>
        ))}
        {pendingLinks.map((p) => (
          <li key={p} className="flex items-center gap-3 rounded-2xl border border-dashed border-card-line px-4 py-3 font-inter text-[16px]">
            <Icon name="hourglass_top" className="text-[22px] text-navy-soft" />
            <span className="flex-1">
              <span className="font-mono font-semibold">{p}</span>
              <span className="block text-[14px] text-navy-soft">Code found. Waiting to link.</span>
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4 border-t border-dashed border-card-line pt-5">
        <h3 className="font-inter text-[17px] font-semibold">Link another child</h3>
        <Field id="link-code" label="Invite code" icon="key" error={error} hint="Your child finds it on their Compass Home page.">
          <TextInput id="link-code" autoCapitalize="characters" placeholder="KIM-7KQ2X" value={code} error={error} hint onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Button type="submit" variant="orange" icon={checking ? undefined : 'link'} disabled={checking} className="w-full sm:w-fit">
          {checking ? 'Checking…' : 'Link child'}
        </Button>
      </form>
    </Frame>
  )
}
