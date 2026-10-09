import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
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
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('URL host resolves to a private address')
  }

  return fetch(validation.url, { ...init, redirect: 'manual' })
}
