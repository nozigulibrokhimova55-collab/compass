import { RolePicker } from '../components/landing/RolePicker'
import { PageShell } from '../components/ui/PageShell'

/** Choose your role. "Sign up" in the header comes here from every page except the landing page. */
export default function GetStarted() {
  return (
    <PageShell>
      <RolePicker headingLevel="h1" />
    </PageShell>
  )
}
