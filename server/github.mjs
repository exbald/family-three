// GitHub through the Sprites gateway: the connector holds the token and only allows
// POST /user/repos and /repos/<owner>/family-three-*.
import { config } from './config.mjs'

export class GitHubError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function gh(method, path, body) {
  if (!config.githubBaseUrl) throw new GitHubError(0, 'No GitHub connector is configured.')
  const res = await fetch(`${config.githubBaseUrl}${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'family-three',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new GitHubError(res.status, data.message ?? data.error ?? `GitHub answered ${res.status}`)
  return data
}

// Creates a public repo, trying name, name-2, name-3… Returns the repo object.
export async function createRepo({ name, description, homepage }) {
  for (let i = 1; i <= 9; i += 1) {
    const candidate = i === 1 ? name : `${name}-${i}`
    try {
      // auto_init gives the repo a first commit; the Git Data API refuses an empty repo.
      return await gh('POST', '/user/repos', { name: candidate, description, homepage, private: false, auto_init: true, has_wiki: false })
    } catch (err) {
      if (err.status !== 422) throw err
    }
  }
  throw new GitHubError(422, `Every name from ${name} to ${name}-9 is taken.`)
}
