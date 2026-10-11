import type { ReactNode } from 'react'
import { NotebookBackground } from './NotebookBackground'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/** Notebook background, site header, the page content, and the footer. For every page except the landing page. */
export function PageShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-screen flex-col font-inter text-navy antialiased">
      <NotebookBackground />
      <SiteHeader />
      <main id="main" className={`mx-auto w-full max-w-[1240px] flex-1 px-4 pb-28 pt-16 md:px-8 md:pt-20 ${className}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
