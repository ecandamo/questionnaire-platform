/**
 * Respondent-facing routes — shared surface: subtle brand gradient (navy → ink)
 * so pages feel tied to API Global Solutions without heavy chrome.
 */
export default function RespondLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sidebar/[0.07] from-0% via-background via-[min(28rem,45vh)] to-[color-mix(in_oklab,var(--muted)_78%,var(--sidebar)_5%)] text-foreground">
      {children}
    </div>
  )
}
