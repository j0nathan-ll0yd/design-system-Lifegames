// Serves the built fixture app (tests/browser/fixture-app/dist) on an ephemeral
// localhost port for the node-side Playwright suites (scripts-off, text-page).
import {createServer, type Server} from 'node:http'
import {readFile} from 'node:fs/promises'
import {extname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'

const DIST = fileURLToPath(new URL('./fixture-app/dist/', import.meta.url))
const MIME: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml'}

export interface DistServer {
  baseUrl: string
  close(): Promise<void>
}

export async function serveDist(): Promise<DistServer> {
  const server: Server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    const file = normalize(join(DIST, path.endsWith('/') ? `${path}index.html` : path))
    if (!file.startsWith(DIST)) {
      res.statusCode = 403
      return res.end()
    }
    try {
      res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
      res.end(await readFile(file))
    } catch {
      res.statusCode = 404
      res.end()
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  return {
    baseUrl: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`,
    close: () => new Promise((resolve) => server.close(() => resolve()))
  }
}
