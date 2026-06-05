const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function runDemo() {
  const res = await fetch(`${API_URL}/demo`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function runAudit(file, targetCol, protectedCol) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('target_col', targetCol)
  formData.append('protected_col', protectedCol)
  const res = await fetch(`${API_URL}/audit`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getColumns(fileId) {
  const res = await fetch(`${API_URL}/columns?file_id=${fileId}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchDemoMetadata() {
  const res = await fetch(`${API_URL}/demo/metadata`)
  if (!res.ok) throw new Error('Failed to fetch metadata')
  return res.json()
}

export async function fetchDemoIntersectional() {
  const res = await fetch(`${API_URL}/demo/intersectional`)
  if (!res.ok) throw new Error('Failed to fetch intersectional')
  return res.json()
}

export async function fetchDemoTradeoff() {
  const res = await fetch(`${API_URL}/demo/tradeoff`)
  if (!res.ok) throw new Error('Failed to fetch tradeoff')
  return res.json()
}
