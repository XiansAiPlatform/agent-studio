import { lookup } from 'node:dns/promises'
import { request } from 'node:https'
import { isIP, type LookupFunction } from 'node:net'
import { isPrivateAddress, validateExternalUrl } from './url'

export async function fetchExternalUrl(
  value: string | URL,
  init?: RequestInit
): Promise<Response> {
  const validation = validateExternalUrl(value.toString())
  if (!validation.ok || !validation.url) {
    throw new Error(validation.reason ?? 'External URL is invalid')
  }

  const hostname = validation.url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('URL host resolves to a private address')
  }

  const [{ address, family }] = addresses
  return requestPinned(validation.url, address, family, init)
}

function requestPinned(
  url: URL,
  address: string,
  family: number,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const requestBody = init?.body?.toString()
    const outbound = request(url, {
      method: init?.method,
      headers: Object.fromEntries(new Headers(init?.headers)),
      lookup: pinnedLookup(address, family),
      signal: init?.signal ?? undefined,
    }, incoming => {
      const chunks: Buffer[] = []
      incoming.on('data', chunk => chunks.push(Buffer.from(chunk)))
      incoming.on('error', reject)
      incoming.on('end', () => resolve(new Response(Buffer.concat(chunks), {
        status: incoming.statusCode,
        statusText: incoming.statusMessage,
        headers: incoming.headers as HeadersInit,
      })))
    })
    outbound.on('error', reject)
    if (requestBody) outbound.write(requestBody)
    outbound.end()
  })
}

export function pinnedLookup(address: string, family: number): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address, family }])
      return
    }
    callback(null, address, family)
  }
}
