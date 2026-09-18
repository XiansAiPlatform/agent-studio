import type { XiansClient } from '@/lib/xians/client'

function unstubbed(method: string) {
  return () => {
    throw new Error(`XiansClient.${method} was called but not stubbed in this test`)
  }
}

/** Stub XiansClient methods; unstubbed verbs fail with a clear setup error. */
export function mockXiansClient(
  overrides: Partial<Pick<XiansClient, 'get' | 'post' | 'put' | 'patch' | 'delete'>> = {}
): XiansClient {
  return {
    get: overrides.get ?? unstubbed('get'),
    post: overrides.post ?? unstubbed('post'),
    put: overrides.put ?? unstubbed('put'),
    patch: overrides.patch ?? unstubbed('patch'),
    delete: overrides.delete ?? unstubbed('delete'),
  } as unknown as XiansClient
}
