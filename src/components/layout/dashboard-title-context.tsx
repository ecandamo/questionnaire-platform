"use client"

import * as React from "react"

export interface DashboardTitleOverride {
  title?: string
  subtitle?: string
}

interface DashboardTitleContextValue {
  override: DashboardTitleOverride | null
  setOverride: (value: DashboardTitleOverride | null) => void
}

const DashboardTitleContext = React.createContext<DashboardTitleContextValue | null>(
  null
)

export function DashboardTitleProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [override, setOverrideState] =
    React.useState<DashboardTitleOverride | null>(null)

  const setOverride = React.useCallback(
    (value: DashboardTitleOverride | null) => {
      setOverrideState(value)
    },
    []
  )

  const value = React.useMemo(
    () => ({ override, setOverride }),
    [override, setOverride]
  )

  return (
    <DashboardTitleContext.Provider value={value}>
      {children}
    </DashboardTitleContext.Provider>
  )
}

export function useDashboardTitle() {
  const ctx = React.useContext(DashboardTitleContext)
  if (!ctx) {
    throw new Error("useDashboardTitle must be used within DashboardTitleProvider")
  }
  return ctx
}
