// src/app/(auth)/layout.tsx
// Shared layout for sign-in and sign-up pages.
// Centers Clerk's prebuilt UI card on a dark background.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F1117]">
      {children}
    </main>
  )
}
