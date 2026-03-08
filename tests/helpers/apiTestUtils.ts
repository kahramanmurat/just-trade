// Mock user IDs
export const MOCK_CLERK_ID = 'clerk_test_user_1'
export const MOCK_USER_ID = 'user-uuid-1'
export const MOCK_CLERK_ID_2 = 'clerk_test_user_2'
export const MOCK_USER_ID_2 = 'user-uuid-2'

// Helper to create a mock Request
export function mockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
}): Request {
  const { method = 'GET', url = 'http://localhost:3000/api/test', body, headers = {} } = options
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new Request(url, init)
}

// Helper to get JSON from NextResponse
export async function getResponseJson(response: Response): Promise<unknown> {
  return response.json()
}
