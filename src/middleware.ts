// Clerk authentication middleware — protects /dashboard and /api routes.
// TODO(Backend API Agent): implement after installing @clerk/nextjs.

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
