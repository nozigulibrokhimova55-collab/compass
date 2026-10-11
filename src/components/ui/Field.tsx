import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Icon } from '../Icon'

export const inputClass =
  'block min-h-12 w-full rounded-xl border-[1.5px] border-card-line bg-white px-4 font-inter text-[16px] text-navy placeholder:text-navy-soft transition-[border-color,box-shadow] duration-150 focus:border-select focus:outline-none focus:ring-4 focus:ring-select/20 aria-[invalid=true]:border-accent-strong'

type FieldProps = {
  id: string
  label: string
  /** Material icon inside the input on the left. */
  icon?: string
  error?: string
  /** Short help under the input. */
  hint?: string
  /** Something on the right of the label row, e.g. "Forgot password?". */
  aside?: ReactNode
  children: ReactNode
}

/** Label, input slot, and a hint or an error right under the input. */
export function Field({ id, label, icon, error, hint, aside, children }: FieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-inter text-[15px] font-semibold text-navy">
          {label}
        </label>
        {aside}
      </div>
      <div className={`relative ${icon ? '[&_input]:pl-11 [&_select]:pl-11' : ''}`}>
        {icon && <Icon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[20px] text-navy-soft" />}
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 font-inter text-[14px] font-medium text-accent-strong">
          <Icon name="error" className="text-[16px]" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 font-inter text-[14px] text-navy-soft">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** Text input wired to a `Field`: sets aria-invalid and points aria-describedby at the error or hint. */
export function TextInput({ id, error, hint, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { id: string; error?: string; hint?: boolean }) {
  return (
    <input
      id={id}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      className={`${inputClass} ${className}`}
      {...rest}
    />
  )
}

/** Password input with a show/hide button. */
export function PasswordInput({ id, error, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { id: string; error?: string; hint?: boolean }) {
  const [visible, setVisible] = useState(false)
  return (
    <>
      <TextInput id={id} error={error} hint={hint} type={visible ? 'text' : 'password'} className="pr-12" {...rest} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-navy-soft transition-colors hover:bg-sky-bottom/40 hover:text-navy"
      >
        <Icon name={visible ? 'visibility_off' : 'visibility'} className="text-[20px]" />
      </button>
    </>
  )
}
