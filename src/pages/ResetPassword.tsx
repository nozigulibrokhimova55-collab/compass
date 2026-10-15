import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Button } from '../components/ui/Button'
import { Field, PasswordInput } from '../components/ui/Field'
import { Frame } from '../components/ui/Frame'
import { PageShell } from '../components/ui/PageShell'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ROLE_HOME } from '../lib/roles'
import { useSession } from '../lib/session'
import { isSupabaseConfigured } from '../lib/supabase'

/**
 * Where the "reset your password" email link lands. Supabase signs the person in from the link,
 * so if there is a session here, they can choose a new password.
 */
export default function ResetPassword() {
  const { session, loading, updatePassword } = useSession()
  const navigate = useNavigate()
  const notify = useToast()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isSupabaseConfigured) return <Navigate to="/login" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8 || !/\d/.test(password)) {
      setError('Use at least 8 characters, including a number.')
      document.getElementById('reset-password')?.focus()
      return
    }
    setError('')
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    notify('Password updated.')
    navigate(session ? ROLE_HOME[session.role] : '/login')
  }

  return (
    <PageShell>
      <SectionHeader as="h1" size="md" script="almost there" title="New password" />

      <Frame label="reset.frame" className="mx-auto mt-12 w-full max-w-[480px]" bodyClassName="p-6 sm:p-8">
        {loading ? (
          <p className="font-inter text-[16px] text-navy-soft">Checking your link…</p>
        ) : !session ? (
          <div role="alert" className="flex flex-col gap-4">
            <p className="font-inter text-[16px] leading-7 text-navy-soft">This reset link has expired or was already used. Ask for a new one on the log in page.</p>
            <div>
              <Button to="/login" variant="navy" icon="arrow_forward">
                Back to log in
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <p className="font-inter text-[16px] leading-6 text-navy-soft">Choose a new password for {session.email}.</p>
            <Field id="reset-password" label="New password" icon="key" error={error} hint="At least 8 characters, including a number.">
              <PasswordInput id="reset-password" autoComplete="new-password" placeholder="Make it a good one" value={password} error={error} hint onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="orange" size="lg" icon={submitting ? undefined : 'check'} disabled={submitting} className="w-full">
              {submitting ? 'Saving…' : 'Save new password'}
            </Button>
            <p className="flex items-center justify-center gap-1 text-center font-inter text-[15px] text-navy-soft">
              <Icon name="arrow_back" className="text-[18px]" />
              <Link to="/login" className="font-semibold text-accent-strong underline-offset-4 hover:underline">
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </Frame>
    </PageShell>
  )
}
