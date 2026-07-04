export const sleep = (ms?: number) => new Promise(resolve => setTimeout(resolve, ms))

export const sleepSync = (ms: number) => {
  const start = Date.now()
  while (Date.now() - start < ms) {
    /* empty */
  }
}

export const defer = Promise.resolve()['then']
