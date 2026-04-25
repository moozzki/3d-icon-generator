"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      // Suppress Next.js 16 / Turbopack warning about script tags in RSC
      scriptProps={{ "data-cfasync": "false" }}
    >
      {children}
    </NextThemesProvider>
  )
}
