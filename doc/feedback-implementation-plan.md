# Feedback Feature Implementation Plan

Based on:
- `doc/feedback-app.md` (PRD)
- `lib/resend.ts` (Resend email utility)

Admin Email: `rizky@useaudora.com`

---

## Phase 1: Database Schema

**File:** `lib/db/schema.ts`

Add `feedbacks` table:

```typescript
export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  suggestions: text("suggestions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Export inferred TypeScript type for type safety.

---

## Phase 2: Server Action

**File:** `app/actions/feedback.ts` (NEW)

1. Validate input with Zod schema:
   - `rating`: number, 1-5
   - `content`: string, min 10 characters
   - `suggestions`: string, optional

2. Insert into `feedbacks` table via Drizzle

3. Send email notification to `rizky@useaudora.com` using existing `sendEmail()` from `lib/resend.ts`

Email content: formatted HTML with rating stars, feedback text, suggestions, user name, user email, and timestamp.

---

## Phase 3: Feedback Dialog UI

**File:** `components/feedback/feedback-dialog.tsx` (NEW)

- Use Shadcn `Dialog` component
- Display user profile (name, email) from session via `useSession()`
- **Rating (1-5 stars):** Required, visual star input component
- **Feedback textarea:** Required, min 10 chars validation
- **Suggestions textarea:** Optional
- Submit button with loading state
- On success: close dialog + show toast: *"Thank you! Your feedback helps us build a better Audora."*

---

## Phase 4: Trigger Buttons

**File:** `components/layout/dashboard-layout.tsx`

Add feedback trigger in 2 locations:

1. **Sidebar footer** - above user profile dropdown
   - Icon + "Share Feedback" text or icon-only in collapsed mode

2. **Top header** - right side, next to credits/Top Up button
   - Icon button with tooltip

Both triggers open the Feedback Dialog.

---

## Phase 5: Toast Integration

No additional setup needed - `Toaster` from `sonner` already configured in `app/layout.tsx`.

---

## Dependencies

| Package | Status |
|---------|--------|
| `zod` | Not installed - needs `npm install zod` |

---

## Files Summary

| File | Action |
|------|--------|
| `lib/db/schema.ts` | Add `feedbacks` table |
| `app/actions/feedback.ts` | Create new file |
| `components/feedback/feedback-dialog.tsx` | Create new file |
| `components/layout/dashboard-layout.tsx` | Add 2 trigger buttons |

---

## Post-Implementation

1. Run `npm install zod` to install validation dependency
2. Run `npm run db:push` to push schema changes to database
3. Test the full flow: submit feedback -> verify DB entry -> verify email received