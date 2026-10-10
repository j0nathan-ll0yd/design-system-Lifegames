export function esc(s: string | null | undefined): string {
  if (!s) {
    return ''
  }
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** The URL when it parses as https, otherwise null (no javascript:, data: or relative). */
export function safeHttpsUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null
  }
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
