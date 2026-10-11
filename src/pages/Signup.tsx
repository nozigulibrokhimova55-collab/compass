import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { RoleCards } from '../components/landing/RolePicker'
import { ROLE_OPTIONS } from '../components/landing/roleOptions'
import { Button } from '../components/ui/Button'
import { Field, inputClass, PasswordInput, TextInput } from '../components/ui/Field'
import { Frame } from '../components/ui/Frame'
import { PageShell } from '../components/ui/PageShell'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ROLE_HOME, type Role } from '../lib/roles'
import { useSession } from '../lib/session'
import { isEmail } from '../lib/validate'

const LANGUAGES = ['English', '한국어 (Korean)', 'Español (Spanish)', '中文 (Chinese)', 'Tiếng Việt (Vietnamese)']

type Errors = Partial<Record<'name' | 'email' | 'password' | 'classCode' | 'inviteCode' | 'agreed', string>>

/** Two steps: pick a role, then your details. `/signup?role=teacher` skips straight to step 2. */
export default function Signup() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromLink = ROLE_OPTIONS.find((r) => r.id === params.get('role'))?.id ?? null

  const [role, setRole] = useState<Role | null>(fromLink)
  const [step, setStep] = useState<1 | 2>(fromLink ? 2 : 1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [classCode, setClassCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const stepHeading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    // Move focus to the new step's heading so keyboard and screen reader users land in the right place.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    stepHeading.current?.focus()
  }, [step])

  const picked = ROLE_OPTIONS.find((r) => r.id === role)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!role) return
    const next: Errors = {}
    if (!name.trim()) next.name = 'Tell us your name.'
    if (!isEmail(email)) next.email = 'Enter a valid email address.'
    if (password.length < 8 || !/\d/.test(password)) next.password = 'Use at least 8 characters, including a number.'
    if (role === 'student' && !/^[A-Z0-9]{2,}(-[A-Z0-9]+)?$/i.test(classCode.trim())) next.classCode = 'Enter the class code from your teacher, like PARK-P3.'
    if (role === 'parent' && !inviteCode.trim()) next.inviteCode = 'Enter the invite code your child or their teacher shared.'
    if (!agreed) next.agreed = 'Please agree to the privacy policy to continue.'
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      document.getElementById(`signup-${first}`)?.focus()
      return
    }
    setSubmitting(true)
    // Demo only: nothing is saved to a server yet.
    window.setTimeout(() => {
      signIn({ name: name.trim(), email, role })
      navigate(ROLE_HOME[role])
    }, 450)
  }

  return (
    <PageShell>
      <SectionHeader as="h1" size="md" script="nice to meet you" title="Sign up" />

      <Frame label="signup.frame" className="mx-auto mt-12 w-full max-w-[760px]" bodyClassName="p-6 sm:p-8 md:p-10">
        {/* Step indicator */}
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-navy-soft">
            Step {step} of 2 · {step === 1 ? 'Who are you?' : 'Your details'}
          </p>
          <div className="flex w-28 gap-1.5" aria-hidden="true">
            <span className="h-1.5 flex-1 rounded-full bg-accent-strong" />
            <span className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step === 2 ? 'bg-accent-strong' : 'bg-card-line'}`} />
          </div>
        </div>

        {step === 1 ? (
          <div key="step1" className="step-in mt-6">
            <h2 ref={stepHeading} tabIndex={-1} className="font-grotesk text-[28px] font-extrabold tracking-[-0.02em] text-navy outline-none md:text-[32px]">
              Who are you?
            </h2>
            <p className="mt-1 font-inter text-[16px] text-navy-soft">Pick the one that fits you. We’ll set things up for it.</p>
            <div className="mt-6">
              <RoleCards picked={role} onPick={setRole} compact />
            </div>
            <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-center font-inter text-[15px] text-navy-soft sm:text-left">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-accent-strong underline-offset-4 hover:underline">
                  Log in
                </Link>
              </p>
              <Button variant="navy" size="lg" icon="arrow_forward" disabled={!role} onClick={() => setStep(2)}>
                {picked ? `Continue as ${picked.as}` : 'Pick a role to continue'}
              </Button>
            </div>
          </div>
        ) : (
          <form key="step2" onSubmit={submit} noValidate className="step-in mt-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 ref={stepHeading} tabIndex={-1} className="font-grotesk text-[28px] font-extrabold tracking-[-0.02em] text-navy outline-none md:text-[32px]">
                Your details
              </h2>
              {picked && (
                <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-select bg-[#F2F8FE] py-1 pl-3 pr-1 font-inter text-[14px] font-medium text-navy">
                  <Icon name={picked.icon} className="text-[18px]" />
                  {picked.title.slice(0, -1)}
                  <button type="button" onClick={() => setStep(1)} className="min-h-8 cursor-pointer rounded-full px-2.5 font-semibold text-accent-strong underline-offset-4 hover:underline">
                    Change
                  </button>
                </span>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field id="signup-name" label="Full name" icon="badge" error={errors.name}>
                <TextInput id="signup-name" autoComplete="name" placeholder="Minji Kim" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field id="signup-email" label="Email" icon="mail" error={errors.email}>
                <TextInput
                  id="signup-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  value={email}
                  error={errors.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>

            <Field id="signup-password" label="Password" icon="key" error={errors.password} hint="At least 8 characters, including a number.">
              <PasswordInput
                id="signup-password"
                autoComplete="new-password"
                placeholder="Make it a good one"
                value={password}
                error={errors.password}
                hint
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {role === 'student' && (
              <Field id="signup-classCode" label="Class code" icon="tag" error={errors.classCode} hint="Your teacher will give you this. It looks like PARK-P3.">
                <TextInput
                  id="signup-classCode"
                  autoCapitalize="characters"
                  placeholder="PARK-P3"
                  value={classCode}
                  error={errors.classCode}
                  hint
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase tracking-[0.08em]"
                />
              </Field>
            )}

            {role === 'parent' && (
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="signup-inviteCode" label="Your child’s invite code" icon="link" error={errors.inviteCode} hint="Your child can find it under Settings.">
                  <TextInput
                    id="signup-inviteCode"
                    autoCapitalize="characters"
                    placeholder="MINJI-4821"
                    value={inviteCode}
                    error={errors.inviteCode}
                    hint
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-[0.08em]"
                  />
                </Field>
                <Field id="signup-language" label="Preferred language" icon="translate" hint="Updates from the teacher come in this language.">
                  <select id="signup-language" aria-describedby="signup-language-hint" value={language} onChange={(e) => setLanguage(e.target.value)} className={`${inputClass} cursor-pointer appearance-none pr-10`}>
                    {LANGUAGES.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  <Icon name="expand_more" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[22px] text-navy-soft" />
                </Field>
              </div>
            )}

            <div>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 font-inter text-[15px] leading-6 text-navy">
                <input
                  id="signup-agreed"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  aria-invalid={!!errors.agreed}
                  aria-describedby={errors.agreed ? 'signup-agreed-error' : undefined}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#161B26]"
                />
                <span>
                  I agree to the{' '}
                  <Link to="/privacy" className="font-semibold text-accent-strong underline underline-offset-4">
                    privacy policy
                  </Link>
                  .
                </span>
              </label>
              {errors.agreed && (
                <p id="signup-agreed-error" className="mt-1 flex items-center gap-1 font-inter text-[14px] font-medium text-accent-strong">
                  <Icon name="error" className="text-[16px]" />
                  {errors.agreed}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-dashed border-card-line pt-6 sm:flex-row sm:items-center">
              <Button variant="outline" icon="arrow_back" onClick={() => setStep(1)} className="flex-row-reverse">
                Back
              </Button>
              <Button type="submit" variant="orange" size="lg" icon={submitting ? undefined : 'arrow_forward'} disabled={submitting}>
                {submitting ? 'Setting things up…' : 'Create my account'}
              </Button>
            </div>
          </form>
        )}
      </Frame>
    </PageShell>
  )
}
