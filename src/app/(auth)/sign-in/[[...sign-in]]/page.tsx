// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
// Clerk prebuilt sign-in UI — handles email/password, OAuth, MFA.
// Catch-all route required for Clerk's multi-step sign-in flows.

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return <SignIn />
}
