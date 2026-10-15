import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Button } from '../components/ui/Button'
import { Field, PasswordInput, TextInput } from '../components/ui/Field'
import { Frame } from '../components/ui/Frame'
import { PageShell } from '../components/ui/PageShell'
import { SectionHeader } from '../components/ui/SectionHeader'
import { nameFromEmail } from '../lib/people'
import { ROLE_HOME } from '../lib/roles'
import { DEMO_SESSION, useSession } from '../lib/session'
import { isSupabaseConfigured } from '../lib/supabase'
import { isEmail } from '../lib/validate'

export default function Login() {
  const { session, loading, signIn, logIn, sendReset } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keep, setKeep] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Already signed in with a real account: go straight to your own area.
  if (isSupabaseConfigured && !loading && session && !session.demo) return <Navigate to={ROLE_HOME[session.role]} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!isEmail(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    setFormError('')
    if (next.email || next.password) {
      document.getElementById(next.email ? 'login-email' : 'login-password')?.focus()
      return
    }
    setSubmitting(true)

    if (!isSupabaseConfigured) {
      // Demo only: there is no real account check.
      window.setTimeout(() => {
        signIn({ name: nameFromEmail(email), email, role: 'teacher' })
        navigate(ROLE_HOME.teacher)
      }, 450)
      return
    }

    const result = await logIn(email.trim(), password, keep)
    if (!result.ok) {
      setSubmitting(false)
      setFormError(result.error)
      return
    }
    navigate(ROLE_HOME[result.session.role])
  }

  const forgot = async () => {
    if (!isEmail(email)) {
      setErrors({ email: 'Type your email first, then we can send a reset link.' })
      document.getElementById('login-email')?.focus()
      return
    }
    setErrors({})
    setFormError('')
    if (isSupabaseConfigured) {
      const result = await sendReset(email.trim())
      if (!result.ok) {
        setFormError(result.error)
        return
      }
    }
    setResetSent(true)
  }

  return (
    <PageShell>
      <SectionHeader as="h1" size="md" script="welcome back" title="Log in" />

      <Frame label="login.frame" className="mx-auto mt-12 w-full max-w-[480px]" bodyClassName="p-6 sm:p-8">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <p className="font-inter text-[16px] leading-6 text-navy-soft">Pick up right where you left off.</p>

          <Field id="login-email" label="Email" icon="mail" error={errors.email}>
            <TextInput
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@school.edu"
              value={email}
              error={errors.email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field
            id="login-password"
            label="Password"
            icon="key"
            error={errors.password}
            aside={
              <button type="button" onClick={forgot} className="cursor-pointer font-inter text-[14px] font-semibold text-accent-strong underline-offset-4 hover:underline">
                Forgot password?
              </button>
            }
          >
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              error={errors.password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {resetSent && (
            <p role="status" className="step-in flex items-start gap-2 rounded-xl bg-[#E3F5EA] px-4 py-3 font-inter text-[15px] leading-6 text-[#1F5C35]">
              <Icon name="mark_email_read" className="mt-0.5 text-[20px]" />
              If {email} has an account, a reset link is on its way.
            </p>
          )}

          {formError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
              <Icon name="error" className="mt-0.5 text-[20px]" />
              {formError}
            </p>
          )}

          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-inter text-[15px] text-navy">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="h-5 w-5 cursor-pointer accent-[#161B26]" />
            Keep me signed in
          </label>

          <Button type="submit" variant="orange" size="lg" icon={submitting ? undefined : 'arrow_forward'} disabled={submitting} className="w-full">
            {submitting ? 'Logging you in…' : 'Log in'}
          </Button>

          <div className="flex flex-col items-center gap-1 border-t border-dashed border-card-line pt-5 text-center font-inter text-[15px] text-navy-soft">
            <p>
              New here?{' '}
              <Link to="/get-started" className="font-semibold text-accent-strong underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
            <p>
              Just looking around?{' '}
              <Link to="/teacher" onClick={() => signIn(DEMO_SESSION)} className="font-semibold text-navy underline-offset-4 hover:underline">
                Open the demo
              </Link>
            </p>
          </div>
        </form>
      </Frame>
    </PageShell>
  )
}
