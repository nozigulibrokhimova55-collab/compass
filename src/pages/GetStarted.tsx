import { RolePicker } from '../components/landing/RolePicker'
import { SiteFooter } from '../components/landing/SiteFooter'
import { SiteHeader } from '../components/landing/SiteHeader'
import { SkyBackground } from '../components/landing/SkyBackground'

/** Standalone role picker, used by "Log in" and "Sign up" when the visitor isn't on the landing page. */
export default function GetStarted() {
  return (
    <div className="flex min-h-screen flex-col font-inter text-navy antialiased">
      <SkyBackground />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-20 md:px-8 md:py-28">
        <RolePicker headingLevel="h1" />
      </main>
      <SiteFooter />
    </div>
  )
}
