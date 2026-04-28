import { ReactNode } from 'react'
import LeftSidebar from './LeftSidebar'
import ModeToggle from './ModeToggle'

interface Props {
  children: ReactNode
  currentSlug?: string
  rightPanel?: ReactNode
}

export default function Layout({ children, currentSlug, rightPanel }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      <LeftSidebar currentSlug={currentSlug} />

      {/* Main scrollable content — no visible scrollbar */}
      <main className="flex-1 overflow-y-auto min-w-0 no-scrollbar">
        {/* Sticky mode bar */}
        <div className="sticky top-0 z-10 flex justify-end px-5 py-2 bg-background/70 backdrop-blur-md border-b border-border/20">
          <ModeToggle />
        </div>

        <div className="px-6 py-8 max-w-3xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Right panel — independently scrollable, no visible scrollbar */}
      {rightPanel && (
        <div className="hidden xl:flex flex-shrink-0 no-scrollbar">
          {rightPanel}
        </div>
      )}
    </div>
  )
}
