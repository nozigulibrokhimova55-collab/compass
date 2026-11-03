import { Icon } from '../Icon'

/** Shown when this copy of Compass has no Supabase keys, so there are no accounts to check. */
// oxlint-disable-next-line react/only-export-components
export const NOT_CONNECTED = 'Accounts aren’t switched on for this copy of Compass yet, so this won’t work. Add the Supabase keys to .env.local and restart the app.'

/** The beige "accounts aren't switched on" note on log in and sign up. */
export function NotConnectedNote() {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6 text-navy">
      <span className="text-[#6B3F0E]">
        <Icon name="info" className="mt-0.5 text-[20px]" />
      </span>
      {NOT_CONNECTED}
    </p>
  )
}
