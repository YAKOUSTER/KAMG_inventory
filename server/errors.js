export function asClientError(error, status = 400) {
  if (error?.status) return error
  return Object.assign(error instanceof Error ? error : new Error(String(error)), { status })
}

export function runDomain(fn, ...args) {
  try {
    return fn(...args)
  } catch (error) {
    throw asClientError(error)
  }
}
