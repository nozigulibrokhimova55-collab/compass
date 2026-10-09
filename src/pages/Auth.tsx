import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ROLE_HOME, type Role } from '../lib/roles'
import { useSession } from '../lib/session'

const input =
  'w-full py-3 rounded-lg bg-surface-container-lowest border border-[#EED4D7] text-on-surface placeholder:text-outline/70 font-body-md text-body-md focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20 shadow-sm aria-[invalid=true]:border-error'
const label = 'block font-label-md text-label-md text-on-surface mb-1.5'

function Field({
  id,
  label: text,
  icon,
  error,
  children,
  aside,
}: {
  id: string
  label: string
  icon?: string
  error?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={label} htmlFor={id}>
          {text}
        </label>
        {aside}
      </div>
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none"
          />
        )}
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 font-body-sm text-body-sm text-error flex items-center gap-1">
          <Icon name="error" className="text-[14px]" />
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  error?: string
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${input} pl-11 pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors p-1"
      >
        <Icon name={visible ? 'visibility_off' : 'visibility'} className="text-[20px]" />
      </button>
    </>
  )
}

const ROLES: {
  id: Role
  icon: string
  title: string
  body: string
  badge: string
}[] = [
  {
    id: 'teacher',
    icon: 'school',
    title: 'Teacher',
    body: 'Run quizzes and see what your class needs.',
    badge: 'Teacher',
  },
  {
    id: 'student',
    icon: 'explore',
    title: 'Student',
    body: 'Practice at your own pace.',
    badge: 'Student',
  },
  {
    id: 'parent',
    icon: 'diversity_1',
    title: 'Parent or guardian',
    body: 'Get weekly updates on your child.',
    badge: 'Parent',
  },
]

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function nameFromEmail(email: string) {
  if (email.toLowerCase() === 'e.vance@lyceum.edu') return 'Dr. Eleanor Vance'
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return local.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Compass Educator'
}

function LoginPanel({ dimmed, onSignup }: { dimmed: boolean; onSignup: () => void }) {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!isEmail(email)) next.email = 'Enter a valid email address.'
    if (password.length < 1) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    window.setTimeout(() => {
      signIn({ name: nameFromEmail(email), email, role: 'teacher' })
      navigate(ROLE_HOME.teacher)
    }, 450)
  }

  return (
    <section
      id="panel-login"
      aria-labelledby="login-title"
      className={`lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 sm:p-8 md:p-10 shadow-xl transition-all duration-300 scroll-mt-6 ${
        dimmed ? 'lg:opacity-85 lg:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between pb-6 mb-6 bg-surface-container-low -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 md:-mx-10 md:-mt-10 p-6 md:p-8 rounded-t-2xl">
        <div>
          <h1 id="login-title" className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mt-1">
            Welcome back
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-primary shrink-0">
          <Icon name="auto_stories" className="text-[22px]" />
        </div>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-6">
        Pick up where you left off.
      </p>
      <form className="space-y-5" onSubmit={submit} noValidate>
        <Field id="login-email" label="Email address" icon="mail" error={errors.email}>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher.name@lyceum.edu"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className={`${input} pl-11 pr-4`}
          />
        </Field>
        <Field
          id="login-password"
          label="Password"
          icon="key"
          error={errors.password}
          aside={
            <button
              type="button"
              onClick={() => setForgotSent(true)}
              className="mb-1.5 font-label-sm text-label-sm text-primary-container hover:underline underline-offset-2"
            >
              Forgot password?
            </button>
          }
        >
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••••••"
            error={errors.password}
            autoComplete="current-password"
          />
        </Field>
        {forgotSent && (
          <p role="status" className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-lg p-3 flex gap-2">
            <Icon name="mark_email_read" className="text-[18px] text-primary" />
            {isEmail(email)
              ? `If an account exists for ${email}, a reset link is on its way.`
              : 'Enter your email above and we’ll send a reset link.'}
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input defaultChecked className="w-4 h-4 rounded cursor-pointer accent-primary-container" type="checkbox" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">Keep me signed in</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] py-3.5 px-6 rounded-lg bg-primary-container text-on-primary font-title-sm text-title-sm font-semibold tracking-wide shadow-md hover:bg-tertiary-container hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-80 disabled:hover:translate-y-0"
        >
          <span>{submitting ? 'Signing in…' : 'Log in'}</span>
          <Icon name={submitting ? 'progress_activity' : 'arrow_forward'} className={`text-[18px] ${submitting ? 'animate-spin' : ''}`} />
        </button>
        <p className="font-body-sm text-body-sm text-secondary text-center">
          Just exploring?{' '}
          <Link to="/app" className="text-primary-container font-semibold hover:underline underline-offset-2">
            Open the demo workspace
          </Link>
        </p>
      </form>
      <div className="relative my-8 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-surface-container-high" />
        </div>
        <span className="relative px-4 bg-surface-container-lowest font-label-sm text-label-sm uppercase tracking-wider text-outline">
          or
        </span>
      </div>
      <div className="rounded-xl bg-surface-container-low p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-title-sm text-title-sm text-on-surface">New to Compass?</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Join as a teacher, student, or parent.</p>
        </div>
        <button
          type="button"
          onClick={onSignup}
          className="shrink-0 px-4 py-2 rounded-lg bg-secondary-container text-primary font-title-sm text-title-sm hover:bg-primary-fixed transition-colors"
        >
          Sign up
        </button>
      </div>
    </section>
  )
}

function SignupPanel({ dimmed }: { dimmed: boolean }) {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('parent')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const [classCode, setClassCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [agreed, setAgreed] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Tell us your name.'
    if (!isEmail(email)) next.email = 'Enter a valid email address.'
    if (password.length < 8 || !/\d/.test(password)) next.password = 'Use at least 8 characters and 1 number.'
    if (role === 'student' && !/^[A-Z0-9]{3,}-?[A-Z0-9]*$/i.test(classCode.trim())) next.classCode = 'Enter the class code from your teacher.'
    if (role === 'parent' && !inviteCode.trim()) next.inviteCode = 'Enter your child’s invite code.'
    if (!agreed) next.agreed = 'Please accept the privacy policy to continue.'
    setErrors(next)
    if (Object.keys(next).length) {
      document.getElementById(`signup-${Object.keys(next)[0]}`)?.focus()
      return
    }
    setSubmitting(true)
    window.setTimeout(() => {
      signIn({ name: name.trim(), email, role })
      navigate(ROLE_HOME[role])
    }, 500)
  }

  const activeRole = ROLES.find((r) => r.id === role)!

  return (
    <section
      id="panel-signup"
      aria-labelledby="signup-title"
      className={`lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 sm:p-8 md:p-10 shadow-xl transition-all duration-300 scroll-mt-6 ${
        dimmed ? 'lg:opacity-85 lg:scale-[0.99]' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 bg-surface-container-low -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 md:-mx-10 md:-mt-10 p-6 md:p-8 rounded-t-2xl">
        <h2 id="signup-title" className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
          Create your account
        </h2>
      </div>
      <form className="space-y-8" onSubmit={submit} noValidate>
        <fieldset className="space-y-4" aria-labelledby="role-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <span className="block font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Step 1</span>
              <h3 id="role-heading" className="font-headline-md text-headline-md text-on-surface">
                Who are you?
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {ROLES.map((r) => {
              const selected = r.id === role
              return (
                <label
                  key={r.id}
                  className={`relative cursor-pointer p-4 rounded-xl transition-all duration-200 flex flex-col justify-between has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${
                    selected ? 'bg-secondary-fixed/50 shadow-md' : 'bg-surface-container-lowest hover:bg-surface-container-low shadow-sm'
                  }`}
                >
                  <input
                    className="sr-only"
                    name="account-role"
                    type="radio"
                    value={r.id}
                    checked={selected}
                    onChange={() => setRole(r.id)}
                  />
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        selected ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-primary'
                      }`}
                    >
                      <Icon name={r.icon} className="text-[24px]" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-on-primary transition-colors ${
                        selected ? 'bg-primary-container' : 'bg-surface-container'
                      }`}
                    >
                      {selected && <Icon name="check" className="text-[14px]" />}
                    </div>
                  </div>
                  <div>
                    <h4 className={`font-title-sm text-title-sm mb-1 ${selected ? 'text-primary' : 'text-on-surface'}`}>{r.title}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">{r.body}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Step 2</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Your details</h3>
            </div>
            <span aria-live="polite" className="font-label-sm text-label-sm px-3 py-1 rounded-full bg-secondary-fixed text-primary font-semibold">
              {activeRole.badge}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field id="signup-name" label="Full Name" icon="badge" error={errors.name}>
                <input
                  id="signup-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'parent' ? 'Your full name' : role === 'student' ? 'Minji Kim' : 'Dr. Eleanor Vance'}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'signup-name-error' : undefined}
                  className={`${input} pl-11 pr-4`}
                />
              </Field>
            </div>
            <Field id="signup-email" label="Email Address" icon="mail" error={errors.email}>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'teacher' ? 'teacher.name@lyceum.edu' : role === 'student' ? 'minji.kim@student.lyceum.edu' : 'parent@compass-ed.org'}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                className={`${input} pl-11 pr-4`}
              />
            </Field>
            <Field id="signup-password" label="Create Password" icon="lock" error={errors.password}>
              <PasswordInput
                id="signup-password"
                value={password}
                onChange={setPassword}
                placeholder="Min 8 characters, 1 number"
                error={errors.password}
                autoComplete="new-password"
              />
            </Field>
          </div>

          <div className="p-5 rounded-xl bg-surface-container-low space-y-4">
            {role === 'teacher' && (
              <div className="space-y-4 animate-fade-up">
                <div className="flex items-center gap-2 text-primary font-title-sm text-title-sm">
                  <Icon name="account_balance" className="text-[20px]" />
                  <span>Your school</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field id="signup-school" label="School name">
                    <input
                      id="signup-school"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="Lyceum High School"
                      className={`${input} px-4`}
                    />
                  </Field>
                  <Field id="signup-subject" label="Subject">
                    <select id="signup-subject" className={`${input} px-4 cursor-pointer`}>
                      <option>AP Physics / Newtonian Mechanics</option>
                      <option>Chemistry / Stoichiometry</option>
                      <option>Biology / Molecular Genetics</option>
                      <option>Earth & Space Science</option>
                    </select>
                  </Field>
                </div>
              </div>
            )}
            {role === 'student' && (
              <div className="space-y-4 animate-fade-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-title-sm text-title-sm">
                    <Icon name="group_add" className="text-[20px]" />
                    <span>Join your class</span>
                  </div>
                </div>
                <Field id="signup-classCode" label="Class Code" icon="pin" error={errors.classCode}>
                  <input
                    id="signup-classCode"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder="PHYS-P3"
                    aria-invalid={!!errors.classCode}
                    aria-describedby={errors.classCode ? 'signup-classCode-error' : undefined}
                    className={`${input} pl-11 pr-4 text-primary font-title-sm tracking-wider uppercase`}
                  />
                </Field>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Your teacher gives you this code.
                </p>
              </div>
            )}
            {role === 'parent' && (
              <div className="space-y-4 animate-fade-up">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-primary font-title-sm text-title-sm">
                    <Icon name="family_restroom" className="text-[20px]" />
                    <span>Connect to your child</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Field id="signup-inviteCode" label="Child’s invite code" icon="key_vertical" error={errors.inviteCode}>
                      <input
                        id="signup-inviteCode"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="MINJI-784"
                        aria-invalid={!!errors.inviteCode}
                        aria-describedby={errors.inviteCode ? 'signup-inviteCode-error' : undefined}
                        className={`${input} pl-11 pr-4 text-primary font-title-sm tracking-wider uppercase`}
                      />
                    </Field>
                    {!errors.inviteCode && (
                      <span className="font-label-sm text-label-sm text-on-surface-variant block mt-1">
                        Find it in your child’s student account.
                      </span>
                    )}
                  </div>
                  <div>
                    <Field id="signup-language" label="Preferred language" icon="translate">
                      <select id="signup-language" defaultValue="ko" className={`${input} pl-11 pr-8 appearance-none cursor-pointer`}>
                        <option value="ko">Korean (한국어)</option>
                        <option value="en">English</option>
                        <option value="ru">Russian (Русский)</option>
                        <option value="es">Spanish (Español)</option>
                        <option value="mn">Mongolian (Монгол хэл)</option>
                        <option value="vi">Vietnamese (Tiếng Việt)</option>
                      </select>
                      <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]" />
                    </Field>
                    <span className="font-label-sm text-label-sm text-on-surface-variant block mt-1">
                      Weekly updates will be sent in this language.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                id="signup-agreed"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded cursor-pointer shrink-0 accent-primary-container"
                type="checkbox"
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                I agree to the{' '}
                <a className="text-primary-container font-semibold hover:underline underline-offset-2" href="#privacy">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a className="text-primary-container font-semibold hover:underline underline-offset-2" href="#terms">
                  terms of academic use
                </a>
                . Student data is never sold.
              </span>
            </label>
            {errors.agreed && <p className="mt-1 font-body-sm text-body-sm text-error">{errors.agreed}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-lg bg-primary-container text-on-primary font-title-sm text-title-sm font-semibold tracking-wide shadow-md hover:bg-tertiary-container hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-80 disabled:hover:translate-y-0"
          >
            <Icon name={submitting ? 'progress_activity' : 'verified_user'} className={`text-[18px] ${submitting ? 'animate-spin' : ''}`} />
            <span>{submitting ? 'Creating account…' : 'Create account'}</span>
          </button>
        </div>
      </form>
    </section>
  )
}

export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const mode = location.pathname === '/signup' ? 'signup' : 'login'
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current && mode === 'login') {
      firstRender.current = false
      return
    }
    firstRender.current = false
    document.getElementById(`panel-${mode}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [mode])

  const tab = (active: boolean) =>
    `flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg text-title-sm font-title-sm transition-all duration-200 ${
      active ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'
    }`

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="relative w-full overflow-hidden px-4 py-8 md:py-14 lg:px-8 max-w-[1360px] mx-auto">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[380px] bg-secondary-fixed/40 rounded-full blur-3xl opacity-70" />
        <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 bg-primary-fixed/25 rounded-full blur-3xl opacity-60" />
        <div className="pointer-events-none absolute bottom-12 -left-20 w-80 h-80 bg-secondary-fixed/50 rounded-full blur-3xl opacity-50" />

        <header className="relative z-10 flex flex-col items-center text-center mb-8 md:mb-12">
          <Link to="/" className="flex items-center justify-center gap-3.5 mb-3">
            <span className="w-12 h-12 rounded-xl bg-surface-container-lowest p-2 shadow-md flex items-center justify-center">
              <img alt="" className="w-9 h-9 object-contain" src="/images/logo.png" />
            </span>
            <span className="font-headline-lg text-headline-lg text-primary tracking-tight font-semibold">Compass</span>
          </Link>
          <p className="font-headline-sm text-headline-sm text-on-surface-variant max-w-xl mx-auto italic font-normal">
            Find out why students get answers wrong.
          </p>
          <div role="tablist" aria-label="Account access" className="mt-6 inline-flex p-1 rounded-xl bg-surface-container-high shadow-inner">
            <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => navigate('/login')} className={tab(mode === 'login')}>
              <Icon name="lock_open" className="text-[18px]" />
              <span>Log In</span>
            </button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => navigate('/signup')} className={tab(mode === 'signup')}>
              <Icon name="person_add" className="text-[18px]" />
              <span>Sign Up</span>
            </button>
          </div>
        </header>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <LoginPanel dimmed={mode === 'signup'} onSignup={() => navigate('/signup')} />
          <SignupPanel dimmed={mode === 'login'} />
        </div>

        <footer className="relative z-10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-on-surface-variant">
          <span className="font-body-sm text-body-sm">© 2025 Compass</span>
          <div className="flex flex-wrap justify-center items-center gap-6 font-body-sm text-body-sm">
            <Link className="hover:text-primary transition-colors" to="/app">
              Teacher demo
            </Link>
            <Link className="hover:text-primary transition-colors" to="/app/family">
              Parent demo
            </Link>
            <a className="hover:text-primary transition-colors" href="#privacy">
              Privacy
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}
