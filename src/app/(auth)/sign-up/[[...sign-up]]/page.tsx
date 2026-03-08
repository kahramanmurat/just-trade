// src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
// Clerk prebuilt sign-up UI — handles email/password, OAuth, email verification.
// Catch-all route required for Clerk's multi-step sign-up flows.

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return <SignUp />
}
