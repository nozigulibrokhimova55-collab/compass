import { useSession } from '../../lib/session'
import { Icon } from '../Icon'
import { useToast } from '../Toast'
import { Button } from '../ui/Button'
import { Frame } from '../ui/Frame'

/** "Your parents see this same summary", plus the invite code a parent types to link up. */
export function FamilyCard({ className = '' }: { className?: string }) {
  const { user } = useSession()
  const notify = useToast()
  const code = user.inviteCode

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      notify('Invite code copied.', 'content_copy')
    } catch {
      notify('Couldn’t copy. Select the code and copy it by hand.', 'info')
    }
  }

  return (
    <Frame label="family.frame" className={`h-full ${className}`} bodyClassName="flex h-full flex-col gap-3 p-6">
      <p className="flex items-start gap-2 font-inter text-[16px] leading-6">
        <Icon name="family_restroom" className="mt-0.5 text-[22px] text-select" />
        <span>
          <span className="font-semibold">Your parents see this same summary.</span> Nothing more, nothing less.
        </span>
      </p>
      {code ? (
        <>
          <p className="font-inter text-[15px] leading-6 text-navy-soft">To link up, they type your invite code when they sign up.</p>
          <p className="font-mono text-[22px] font-semibold tracking-[0.08em]">{code}</p>
          <Button variant="outline" icon="content_copy" onClick={copy} className="mt-auto w-fit">
            Copy invite code
          </Button>
        </>
      ) : (
        <p className="font-inter text-[15px] leading-6 text-navy-soft">Your invite code isn’t ready yet. Reload the page in a moment.</p>
      )}
    </Frame>
  )
}
