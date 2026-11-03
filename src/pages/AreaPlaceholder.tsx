import { EmptyState } from '../components/ui/EmptyState'
import { SectionHeader } from '../components/ui/SectionHeader'

type AreaPlaceholderProps = {
  title: string
  /** One plain sentence about what this page will show. */
  about: string
  icon: string
  /** Where "Back to Home" goes, e.g. `/parent`. */
  home: string
  /** Hide the button when this placeholder is the Home page itself. */
  isHome?: boolean
}

/** Stands in for a section that hasn't been built yet. */
export default function AreaPlaceholder({ title, about, icon, home, isHome = false }: AreaPlaceholderProps) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="on its way" title={title} />
      <EmptyState
        label={`${slug}.frame`}
        icon={icon}
        title="We’re still building this page"
        action={isHome ? undefined : { label: 'Back to Home', to: home, icon: 'home' }}
        className="mt-10 max-w-xl"
      >
        {about}
      </EmptyState>
    </>
  )
}
