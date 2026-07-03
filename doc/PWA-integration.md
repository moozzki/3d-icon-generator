Ini file `prd.md` yang sudah dirancang khusus dengan instruksi teknis yang sangat spesifik, terstruktur, dan bersih. Lu tinggal *copy-paste* file ini langsung ke AI Agent lu untuk dieksekusi tanpa banyak tanya.

---

# prd.md

## 📌 Feature Overview

* **Feature Name:** PWA Integration & Custom "Install App" Menu Trigger
* **Objective:** Transform Audora into an installable Progressive Web App (PWA) and expose a native installation trigger inside the User Profile Dropdown menu.


* **Target Copywriting:** "Install App"
* **Target UI Placement:** Inside the user profile dashboard dropdown component (above the "Sign Out" section).


* **Tech Stack Compatibility:** Next.js 16 (App Router), TypeScript, Shadcn UI (`DropdownMenu` or `Popover`), Lucide Icons.



---

## 1. Technical Requirements & Scope

### A. Web App Manifest Setup

AI Agent must create a native Next.js 16 metadata route manifest file at `app/manifest.ts`.

* **Display Mode:** Must be set to `standalone` to strip browser search bars and navigation footers, providing an immersive, Figma-like studio experience.


* **Start URL:** Must point directly to `/dashboard`.


* **Aset Icons:** Path icons located at `/icon-192.png` and `/icon-512.png` inside the `public/` folder.

### B. Apple iOS Compatibility Meta Tags

Since Apple/Safari does not support the automated installation prompt API, AI Agent must inject standalone display meta properties into the root layout metadata config (`app/layout.tsx`) to support manual "Add to Home Screen" execution.

### C. Custom Installation Prompt Logic (Chromium-based Browsers)

AI Agent must intercept the browser's default `beforeinstallprompt` event within the client-side profile menu component:

1. Prevent the default automated native browser banner from popping up.
2. Store the installation event payload into a local React state.
3. Conditionally render the **"Install App"** menu item *only* if the application is installable (not yet installed and running on a supported browser).
4. Trigger the cached prompt execution upon clicking the menu button.
5. Clear the state once installation is accepted or dismissed.

---

## 2. Code Implementation Blueprints

### 📄 Step 1: Create `app/manifest.ts`

```typescript
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Audora - AI 3D Isometric Icon Generator',
    short_name: 'Audora',
    description: 'Generate high-quality 3D isometric icons in seconds for your landing pages, apps, and Figma projects',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/assets/audora-square-logo-192.jpg',
        sizes: '192x192',
        type: 'image/jpg',
      },
      {
        src: '/assets/audora-square-logo-512.jpg',
        sizes: '512x512',
        type: 'image/jpg',
      },
    ],
  }
}

```

### 📄 Step 2: Inject iOS Metadata in `app/layout.tsx`

Ensure the global layout metadata object contains the apple web app configuration properties:

```typescript
export const metadata = {
  // Metadata existing lainnya...
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Audora",
  },
}

```

### 📄 Step 3: Update User Dropdown Menu Component

Locate the existing profile dropdown component. Convert it to a client component (`'use client'`) if it isn't already, and inject the state machinery below:

```tsx
'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { User, Receipt, LogOut, Download } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu" // Sesuaikan path target shadcn lu

export function UserDropdown() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === "accepted") {
      console.log("Audora PWA installation accepted.")
    }

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return (
    <div className="w-56 p-1">
      {/* Existing Code: User Profile Info & Theme Toggle Section */}
      {/* ... */}
      
      <div className="my-1 border-t border-muted" />

      {/* Main Actions Group */}
      <div className="space-y-0.5">
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
            <User className="h-4 w-4 opacity-70" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/transactions" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
            <Receipt className="h-4 w-4 opacity-70" />
            <span>Transactions</span>
          </Link>
        </DropdownMenuItem>

        {/* CONDITIONALLY RENDERED PWA INSTALL MENU */}
        {isInstallable && (
          <DropdownMenuItem 
            onClick={handleInstallClick}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Download className="h-4 w-4 opacity-70" />
            <span>Install App</span>
          </DropdownMenuItem>
        )}
      </div>

      <div className="my-1 border-t border-muted" />

      {/* Existing Code: Destructive Actions Group (Sign Out) */}
      <DropdownMenuItem className="text-destructive focus:text-destructive flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </DropdownMenuItem>
    </div>
  )
}

```

---

## 3. Definition of Done (DoD) & Testing Criteria

* [ ] Application root serves a valid JSON file when accessing `/manifest.webmanifest` or `/manifest.json` on localhost.
* [ ] The custom "Install App" button **does not show up** by default if the user opens the web via desktop Safari or native iOS browsers (graceful degradation mechanism).
* [ ] The custom "Install App" button **dynamically appears** when the dashboard is opened inside Google Chrome or Microsoft Edge desktop via localhost/staging environment.
* [ ] Clicking "Install App" natively invokes the operating system's application confirmation pop-up window.
* [ ] Once confirmed and installed, the button **automatically unmounts and hides itself** from the menu layout options.