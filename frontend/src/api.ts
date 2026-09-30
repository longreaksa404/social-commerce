const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type Health = { status: string }

export async function fetchHealth(): Promise<Health> {
  const response = await fetch(`${API_URL}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }
  return response.json()
}
