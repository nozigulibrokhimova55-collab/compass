import { Button } from '../components/ui/Button'
import { Frame } from '../components/ui/Frame'
import { SectionHeader } from '../components/ui/SectionHeader'

const COPY = {
  student: {
    title: 'Minji’s view',
    note: 'Quizzes one question at a time, what to work on next, and her own attendance.',
  },
  parent: {
    title: 'Parent view',
    note: 'Notes from Ms. Park, how Minji is doing, and one simple way to help at home.',
  },
}

/** Placeholder for the student and parent areas until they're built. */
export default function ComingSoon({ view }: { view: 'student' | 'parent' }) {
  const copy = COPY[view]
  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="coming soon" title={copy.title} />
      <Frame label={`${view}.frame`} className="mt-10 max-w-xl" bodyClassName="p-6 md:p-8">
        <p className="font-inter text-[17px] leading-7">This side of the demo is still being built. It will show:</p>
        <p className="mt-2 font-inter text-[17px] leading-7 text-navy-soft">{copy.note}</p>
        <div className="mt-6">
          <Button to="/teacher" variant="navy" icon="arrow_forward">
            See the teacher view
          </Button>
        </div>
      </Frame>
    </>
  )
}
