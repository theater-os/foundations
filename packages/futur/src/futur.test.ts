import { describe, expect, it, jest } from 'bun:test'
import { Failure } from '@theateros/failure'
import { Result } from '@theateros/result'
import { AbortedFailure, Futur, type FuturAbortion } from './futur'

describe('Futur', () => {
  it('should create a Futur instance with a deferred runner', () => {
    const mock = jest.fn().mockImplementation(({ resolve }) => {
      resolve('test')
    })
    const futur = Futur.of(mock)

    expect(futur).toBeInstanceOf(Futur)
    expect(mock).not.toHaveBeenCalled()
  })

  it('should be a PromiseLike', () => {
    const futur = Futur.of(({ resolve }) => {
      resolve('test')
    })

    expect(typeof futur.then).toBe('function')
  })
})

describe('Futur.of', () => {
  it('should create a Futur instance from a runner', () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test value')
    })

    expect(futur).toBeInstanceOf(Futur)
  })

  it('should resolve with a value wrapped in Result.ok', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test value')
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('test value')
    }
  })

  it('should reject with an error wrapped in Result.err', async () => {
    const futur = Futur.of<never, string>(({ reject }) => {
      reject('test error')
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('test error')
    }
  })

  it('should provide the abortion API to the runner', async () => {
    let receivedAbortion: FuturAbortion | undefined

    const futur = Futur.of<string, never>(({ resolve, abortion }) => {
      receivedAbortion = abortion
      resolve('test')
    })

    await futur

    expect(receivedAbortion).not.toBeNull()
    expect(typeof receivedAbortion?.abort).toBe('function')
    expect(typeof receivedAbortion?.isAborted).toBe('function')
    expect(typeof receivedAbortion?.onAbort).toBe('function')
    expect(receivedAbortion?.controller).toBeInstanceOf(AbortController)
  })
})

describe('Futur.ofPromise', () => {
  it('should create a Futur instance from a promise launcher', () => {
    const futur = Futur.ofPromise(() => Promise.resolve('test'))

    expect(futur).toBeInstanceOf(Futur)
  })

  it('should resolve with the promise value wrapped in Result.ok', async () => {
    const futur = Futur.ofPromise(() => Promise.resolve('promised value'))

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('promised value')
    }
  })

  it('should resolve with different value types', async () => {
    const stringFutur = Futur.ofPromise(() => Promise.resolve('string'))
    const numberFutur = Futur.ofPromise(() => Promise.resolve(42))
    const objectFutur = Futur.ofPromise(() => Promise.resolve({ key: 'value' }))
    const arrayFutur = Futur.ofPromise(() => Promise.resolve([1, 2, 3]))
    const nullFutur = Futur.ofPromise(() => Promise.resolve(null))

    const stringResult = await stringFutur
    const numberResult = await numberFutur
    const objectResult = await objectFutur
    const arrayResult = await arrayFutur
    const nullResult = await nullFutur

    expect(Result.isOk(stringResult) && stringResult.value).toBe('string')
    expect(Result.isOk(numberResult) && numberResult.value).toBe(42)
    expect(Result.isOk(objectResult) && objectResult.value).toEqual({ key: 'value' })
    expect(Result.isOk(arrayResult) && arrayResult.value).toEqual([1, 2, 3])
    expect(Result.isOk(nullResult) && nullResult.value).toBeNull()
  })

  it('should reject with the promise rejection wrapped in Result.err', async () => {
    const futur = Futur.ofPromise<Promise<never>, string>(() => Promise.reject('promise error'))

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('promise error')
    }
  })

  it('should handle async functions', async () => {
    const futur = Futur.ofPromise(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return 'async result'
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('async result')
    }
  })

  it('should handle async functions that throw', async () => {
    const futur = Futur.ofPromise<Promise<never>, Error>(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      throw new Error('async error')
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect((result.error as Error).message).toBe('async error')
    }
  })

  it('should work with fetch-like operations', async () => {
    const mockFetch = () =>
      Promise.resolve({
        status: 200,
        data: { id: 1, name: 'Test' },
      })

    const futur = Futur.ofPromise(mockFetch)

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toEqual({ status: 200, data: { id: 1, name: 'Test' } })
    }
  })

  it('should use catcher to transform errors', async () => {
    const futur = Futur.ofPromise(
      () => Promise.reject(new Error('original error')),
      error => `Transformed: ${(error as Error).message}`,
    )

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('Transformed: original error')
    }
  })

  it('should use catcher to transform different error types', async () => {
    interface AppError {
      code: string
      message: string
    }

    const futur = Futur.ofPromise(
      () => Promise.reject('string error'),
      error => ({ code: 'ERROR', message: String(error) }) as AppError,
    )

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toEqual({ code: 'ERROR', message: 'string error' })
    }
  })

  it('should use catcher with async functions that throw', async () => {
    const futur = Futur.ofPromise(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('async error')
      },
      error => `Caught: ${(error as Error).message}`,
    )

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('Caught: async error')
    }
  })

  it('should pass the original error to catcher without modification', async () => {
    const originalError = new Error('original')
    let receivedError: unknown = null

    const futur = Futur.ofPromise(
      () => Promise.reject(originalError),
      error => {
        receivedError = error
        return 'transformed'
      },
    )

    await futur

    expect(receivedError).toBe(originalError)
  })

  it('should not use catcher when promise resolves successfully', async () => {
    let catcherCalled = false

    const futur = Futur.ofPromise(
      () => Promise.resolve('success'),
      () => {
        catcherCalled = true
        return 'error'
      },
    )

    const result = await futur

    expect(catcherCalled).toBe(false)
    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('success')
    }
  })
})

describe('Futur.then - resolving', () => {
  it('should resolve with a value wrapped in Result.ok', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test value')
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('test value')
    }
  })

  it('should resolve with different value types', async () => {
    const stringFutur = Futur.of<string, never>(({ resolve }) => resolve('string'))
    const numberFutur = Futur.of<number, never>(({ resolve }) => resolve(42))
    const objectFutur = Futur.of<{ key: string }, never>(({ resolve }) => resolve({ key: 'value' }))
    const arrayFutur = Futur.of<number[], never>(({ resolve }) => resolve([1, 2, 3]))
    const nullFutur = Futur.of<null, never>(({ resolve }) => resolve(null))
    const undefinedFutur = Futur.of<undefined, never>(({ resolve }) => resolve(undefined))

    const stringResult = await stringFutur
    const numberResult = await numberFutur
    const objectResult = await objectFutur
    const arrayResult = await arrayFutur
    const nullResult = await nullFutur
    const undefinedResult = await undefinedFutur

    expect(Result.isOk(stringResult) && stringResult.value).toBe('string')
    expect(Result.isOk(numberResult) && numberResult.value).toBe(42)
    expect(Result.isOk(objectResult) && objectResult.value).toEqual({ key: 'value' })
    expect(Result.isOk(arrayResult) && arrayResult.value).toEqual([1, 2, 3])
    expect(Result.isOk(nullResult) && nullResult.value).toBeNull()
    expect(Result.isOk(undefinedResult) && undefinedResult.value).toBeUndefined()
  })

  it('should resolve with a Result when the runner resolves with a Result', async () => {
    const futur = Futur.of<string, string>(({ resolve }) => {
      resolve(Result.ok('wrapped value'))
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('wrapped value')
    }
  })

  it('should preserve Result.err when the runner resolves with a Result.err', async () => {
    const futur = Futur.of<string, string>(({ resolve }) => {
      resolve(Result.err('wrapped error'))
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('wrapped error')
    }
  })

  it('should work with async operations', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      setTimeout(() => resolve('async value'), 10)
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('async value')
    }
  })
})

describe('Futur.then - rejecting', () => {
  it('should reject with an error wrapped in Result.err', async () => {
    const futur = Futur.of<never, string>(({ reject }) => {
      reject('test error')
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('test error')
    }
  })

  it('should reject with different error types', async () => {
    const stringErrorFutur = Futur.of<never, string>(({ reject }) => reject('string error'))
    const numberErrorFutur = Futur.of<never, number>(({ reject }) => reject(404))
    const objectErrorFutur = Futur.of<never, { code: string }>(({ reject }) => reject({ code: 'ERROR' }))
    const errorInstanceFutur = Futur.of<never, Error>(({ reject }) => reject(new Error('Error instance')))

    const stringErrorResult = await stringErrorFutur
    const numberErrorResult = await numberErrorFutur
    const objectErrorResult = await objectErrorFutur
    const errorInstanceResult = await errorInstanceFutur

    expect(Result.isErr(stringErrorResult) && stringErrorResult.error).toBe('string error')
    expect(Result.isErr(numberErrorResult) && numberErrorResult.error).toBe(404)
    expect(Result.isErr(objectErrorResult) && objectErrorResult.error).toEqual({ code: 'ERROR' })
    expect(Result.isErr(errorInstanceResult) && (errorInstanceResult.error as Error).message).toBe('Error instance')
  })

  it('should work with async rejections', async () => {
    const futur = Futur.of<never, string>(({ reject }) => {
      setTimeout(() => reject('async error'), 10)
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('async error')
    }
  })
})

describe('Futur.then - onfulfilled callback', () => {
  it('should call onfulfilled with the result', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test value')
    })

    const transformed = await futur.then(result => {
      if (Result.isOk(result)) {
        return result.value.toUpperCase()
      }

      return 'error'
    })

    expect(transformed).toBe('TEST VALUE')
  })

  it('should allow transforming the result', async () => {
    const futur = Futur.of<number, never>(({ resolve }) => {
      resolve(21)
    })

    const transformed = await futur.then(result => {
      if (Result.isOk(result)) {
        return result.value * 2
      }

      return 0
    })

    expect(transformed).toBe(42)
  })

  it('should work without onfulfilled callback', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test value')
    })

    const result = await futur.then()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('test value')
    }
  })

  it('should handle null onfulfilled callback', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test value')
    })

    const result = await futur.then(null)

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('test value')
    }
  })
})

describe('AbortedFailure', () => {
  it('should be an instance of Failure', () => {
    const failure = new AbortedFailure('Test message')

    expect(failure).toBeInstanceOf(Error)
    expect(failure).toBeInstanceOf(Failure)
    expect(failure.name).toBe('AbortedFailure')
    expect(failure.message).toBe('Test message')
  })

  it('should be identifiable with Failure.isNamed', () => {
    const failure = new AbortedFailure('Test message')

    expect(Failure.is(failure)).toBe(true)
    expect(Failure.isNamed(failure, 'AbortedFailure')).toBe(true)
  })
})

describe('Futur - abort', () => {
  it('should provide the abortion API to the runner', async () => {
    let receivedAbortion: FuturAbortion | undefined

    const futur = Futur.of<string, never>(({ resolve, abortion }) => {
      receivedAbortion = abortion
      resolve('test')
    })

    await futur

    expect(receivedAbortion).not.toBeNull()
    expect(typeof receivedAbortion?.abort).toBe('function')
    expect(typeof receivedAbortion?.isAborted).toBe('function')
    expect(typeof receivedAbortion?.onAbort).toBe('function')
    expect(receivedAbortion?.controller).toBeInstanceOf(AbortController)
  })

  it('should allow checking aborted state from within the runner', async () => {
    let wasAborted = false

    const futur = Futur.of<string, never>(({ resolve, abortion }) => {
      // Check initial state
      expect(abortion.isAborted()).toBe(false)

      // Set up abort listener
      abortion.onAbort(() => {
        wasAborted = true
      })

      // Abort immediately
      abortion.abort()
      resolve('test')
    })

    const result = await futur

    expect(wasAborted).toBe(true)
    expect(Result.isErr(result)).toBe(true)
  })

  it('should reject with AbortedFailure when aborted from within the runner', async () => {
    const futur = Futur.of<string, never>(({ abortion }) => {
      // Abort immediately without resolving
      abortion.abort()
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(AbortedFailure)
      expect(Failure.isNamed(result.error, 'AbortedFailure')).toBe(true)
      expect((result.error as AbortedFailure).message).toBe('Futur has been aborted')
    }
  })

  it('should allow aborting from outside using the abort method', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      // Simulate a delayed resolution
      setTimeout(() => resolve('delayed'), 1000)
    })

    // Abort from outside before awaiting
    setTimeout(() => futur.abort(), 10)

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(AbortedFailure)
    }
  })

  it('should not reject with AbortedFailure if resolved before abort', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('resolved before abort')
    })

    const result = await futur

    // Try to abort after resolution (should have no effect)
    futur.abort()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('resolved before abort')
    }
  })

  it('should allow re-running the futur after abort', async () => {
    let callCount = 0

    const futur = Futur.of<number, never>(({ resolve, abortion }) => {
      callCount++
      // Abort on first call only
      if (callCount === 1) {
        abortion.abort()
      } else {
        resolve(callCount)
      }
    })

    // First run - aborts itself
    const result1 = await futur

    expect(Result.isErr(result1)).toBe(true)

    if (Result.isErr(result1)) {
      expect(result1.error).toBeInstanceOf(AbortedFailure)
    }

    // Second run - should work normally
    const result2 = await futur

    expect(Result.isOk(result2)).toBe(true)

    if (Result.isOk(result2)) {
      expect(result2.value).toBe(2)
    }
  })

  it('should create a new execution context on each then call', async () => {
    let callCount = 0

    const futur = Futur.of<string, never>(({ resolve }) => {
      callCount++
      resolve('test')
    })

    await futur
    await futur

    // Each then call creates a new execution
    expect(callCount).toBe(2)
  })

  it('should track aborted state correctly', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      setTimeout(() => resolve('delayed'), 100)
    })

    expect(futur.aborted).toBe(false)

    const promise = futur

    setTimeout(() => futur.abort(), 10)

    const result = await promise

    expect(Result.isErr(result)).toBe(true)
    expect(futur.aborted).toBe(false) // Should be false after cleanup
  })

  it('should return false for aborted when no controllers exist', () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test')
    })

    expect(futur.aborted).toBe(false)
  })

  it('should abort all active controllers', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      setTimeout(() => resolve('delayed'), 100)
    })

    // Explicitly call then() to start both promises and create controllers
    const promise1 = futur.then()
    const promise2 = futur.then()

    // Now abort all controllers (both should be in the Set)
    futur.abort()

    const result1 = await promise1
    const result2 = await promise2

    expect(Result.isErr(result1)).toBe(true)
    expect(Result.isErr(result2)).toBe(true)

    if (Result.isErr(result1)) {
      expect(result1.error).toBeInstanceOf(AbortedFailure)
    }
    if (Result.isErr(result2)) {
      expect(result2.error).toBeInstanceOf(AbortedFailure)
    }
  })

  it('should call onAbort callbacks when aborted', async () => {
    const callbacks: boolean[] = []

    const futur = Futur.of<string, never>(({ resolve }) => {
      setTimeout(() => resolve('delayed'), 100)
    })

    // Explicitly call then() to start the promise and create a controller
    const promise = futur.then()

    // Now add callbacks to the existing controller
    const removeCallback1 = futur.onAbort(() => {
      callbacks.push(true)
    })
    const removeCallback2 = futur.onAbort(() => {
      callbacks.push(true)
    })

    setTimeout(() => futur.abort(), 10)

    await promise

    expect(callbacks.length).toBe(2)

    // Test removing callbacks
    removeCallback1()
    removeCallback2()

    const futur2 = Futur.of<string, never>(({ resolve }) => {
      setTimeout(() => resolve('delayed'), 100)
    })

    const promise2 = futur2.then()

    futur2.onAbort(() => {
      callbacks.push(true)
    })

    setTimeout(() => futur2.abort(), 10)

    await promise2

    // Should only have 3 callbacks (2 from first, 1 from second)
    expect(callbacks.length).toBe(3)
  })

  it('should remove onAbort callbacks correctly', async () => {
    let callback1Called = false
    let callback2Called = false

    const futur = Futur.of<string, never>(({ resolve }) => {
      setTimeout(() => resolve('delayed'), 100)
    })

    // Explicitly call then() to start the promise and create a controller
    const promise = futur.then()

    // Now add callbacks to the existing controller
    const removeCallback1 = futur.onAbort(() => {
      callback1Called = true
    })

    futur.onAbort(() => {
      callback2Called = true
    })

    // Remove first callback
    removeCallback1()

    setTimeout(() => futur.abort(), 10)

    await promise

    expect(callback1Called).toBe(false)
    expect(callback2Called).toBe(true)
  })

  it('should provide abort controller for use with fetch and other APIs', async () => {
    let receivedController: AbortController | undefined

    const futur = Futur.of<string, never>(({ resolve, abortion }) => {
      receivedController = abortion.controller

      // The controller can be used with fetch or other APIs
      expect(abortion.controller).toBeInstanceOf(AbortController)
      expect(abortion.controller.signal).toBeInstanceOf(AbortSignal)

      // Abort immediately to test
      abortion.abort()
      resolve('test')
    })

    const result = await futur

    expect(receivedController).not.toBeNull()
    expect(receivedController?.signal.aborted).toBe(true)
    expect(Result.isErr(result)).toBe(true)
  })
})

describe('Futur - Promise interoperability', () => {
  it('should work with Promise.all', async () => {
    const futur1 = Futur.of<number, never>(({ resolve }) => resolve(1))
    const futur2 = Futur.of<number, never>(({ resolve }) => resolve(2))
    const futur3 = Futur.of<number, never>(({ resolve }) => resolve(3))

    const results = await Promise.all([futur1, futur2, futur3])

    expect(results.length).toBe(3)
    expect(Result.isOk(results[0]) && results[0].value).toBe(1)
    expect(Result.isOk(results[1]) && results[1].value).toBe(2)
    expect(Result.isOk(results[2]) && results[2].value).toBe(3)
  })

  it('should work with Promise.race', async () => {
    const slowFutur = Futur.of<string, never>(({ resolve }) => {
      setTimeout(() => resolve('slow'), 100)
    })

    const fastFutur = Futur.of<string, never>(({ resolve }) => {
      resolve('fast')
    })

    const result = await Promise.race([slowFutur, fastFutur])

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('fast')
    }
  })

  it('should work with async/await syntax', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('awaited value')
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('awaited value')
    }
  })
})

describe('Futur integration scenarios', () => {
  it('should handle a typical async operation', async () => {
    const fetchUser = (id: number) =>
      Futur.of<{ id: number; name: string }, string>(({ resolve, reject }) => {
        if (id > 0) {
          resolve({ id, name: 'John Doe' })
        } else {
          reject('Invalid user ID')
        }
      })

    const successResult = await fetchUser(1)

    expect(Result.isOk(successResult)).toBe(true)

    if (Result.isOk(successResult)) {
      expect(successResult.value).toEqual({ id: 1, name: 'John Doe' })
    }

    const errorResult = await fetchUser(-1)

    expect(Result.isErr(errorResult)).toBe(true)

    if (Result.isErr(errorResult)) {
      expect(errorResult.error).toBe('Invalid user ID')
    }
  })

  it('should handle chained operations', async () => {
    const futur = Futur.of<number, never>(({ resolve }) => {
      resolve(10)
    })

    const result = await futur.then(result => {
      if (Result.isOk(result)) {
        return Result.ok(result.value * 2)
      }

      return result
    })

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(20)
    }
  })

  it('should handle error recovery', async () => {
    const futur = Futur.of<string, string>(({ reject }) => {
      reject('Something went wrong')
    })

    const result = await futur.then(result => {
      if (Result.isErr(result)) {
        return 'default value'
      }

      return result.value
    })

    expect(result).toBe('default value')
  })

  it('should work with real async patterns like setTimeout', async () => {
    const delay = (ms: number, value: string) =>
      Futur.of<string, never>(({ resolve }) => {
        setTimeout(() => resolve(value), ms)
      })

    const result = await delay(10, 'delayed value')

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('delayed value')
    }
  })

  it('should work with ofPromise for wrapping existing promises', async () => {
    const existingPromise = () => Promise.resolve({ data: 'from promise' })

    const futur = Futur.ofPromise(existingPromise)

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toEqual({ data: 'from promise' })
    }
  })
})

describe('Futur edge cases', () => {
  it('should handle immediate resolution', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('immediate')
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('immediate')
    }
  })

  it('should handle immediate rejection', async () => {
    const futur = Futur.of<never, string>(({ reject }) => {
      reject('immediate error')
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('immediate error')
    }
  })

  it('should handle resolving with empty string', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('')
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('')
    }
  })

  it('should handle resolving with zero', async () => {
    const futur = Futur.of<number, never>(({ resolve }) => {
      resolve(0)
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(0)
    }
  })

  it('should handle resolving with false', async () => {
    const futur = Futur.of<boolean, never>(({ resolve }) => {
      resolve(false)
    })

    const result = await futur

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(false)
    }
  })
})
