import { supabase } from './supabase.js'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '')

export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = new Headers({ Accept: 'application/json' })
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  if (auth && supabase) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)
    if (data.session?.access_token) {
      headers.set('Authorization', `Bearer ${data.session.access_token}`)
    }
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the API. Check that the backend is running and VITE_API_BASE_URL is correct.')
  }

  if (response.status === 204) return null

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Keep a useful fallback if the server returned a non-JSON error page.
  }

  if (!response.ok) {
    throw new Error(payload?.error || `The API returned an error (${response.status}).`)
  }

  return payload
}

export async function loadArticles() {
  const items = []
  let total = 0

  do {
    const offset = items.length
    const response = await apiRequest(`/truths?limit=100&offset=${offset}`, { auth: false })
    items.push(...response.items)
    total = response.pagination.total
  } while (items.length < total)

  return items
}
