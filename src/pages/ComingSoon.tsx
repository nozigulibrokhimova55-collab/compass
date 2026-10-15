import { Button } from '../components/ui/Button'
import { Frame } from '../components/ui/Frame'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useSession } from '../lib/session'

/** Placeholder for the parent area until it's built. */
export default function ComingSoon() {
  const { isDemo } = useSession()
  const note = isDemo
    ? 'Notes from Ms. Park, how Minji is doing, and one simple way to help at home.'
    : 'Notes from the teacher, how your child is doing, and one simple way to help at home.'

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="coming soon" title="Parent view" />
      <Frame label="parent.frame" className="mt-10 max-w-xl" bodyClassName="p-6 md:p-8">
        <p className="font-inter text-[17px] leading-7">{isDemo ? 'This side of the demo is still being built. It will show:' : 'This page is still being built. It will show:'}</p>
        <p className="mt-2 font-inter text-[17px] leading-7 text-navy-soft">{note}</p>
        {isDemo && (
          <div className="mt-6">
            <Button to="/teacher" variant="navy" icon="arrow_forward">
              See the teacher view
            </Button>
          </div>
        )}
      </Frame>
    </>
  )
}
