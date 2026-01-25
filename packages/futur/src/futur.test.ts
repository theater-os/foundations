import { describe, expect, it, jest } from 'bun:test'
import { Failure } from '@theateros/failure'
import { Result } from '@theateros/result'
import { AbortedFailure, Futur } from './futur'

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

  it('should provide an AbortController to the runner', async () => {
    let receivedController: AbortController | null = null

    const futur = Futur.of<string, never>(({ resolve, abortController }) => {
      receivedController = abortController
      resolve('test')
    })

    await futur

    expect(receivedController).toBeInstanceOf(AbortController)
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

describe('Futur - abortController', () => {
  it('should have a public abortController property', () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test')
    })

    expect(futur.abortController).toBeInstanceOf(AbortController)
  })

  it('should provide an AbortController to the runner', async () => {
    let receivedController: AbortController | null = null

    const futur = Futur.of<string, never>(({ resolve, abortController }) => {
      receivedController = abortController
      resolve('test')
    })

    await futur

    expect(receivedController).toBeInstanceOf(AbortController)
  })

  it('should pass the same abortController to the runner as the public property', async () => {
    let receivedController: AbortController | null = null

    const futur = Futur.of<string, never>(({ resolve, abortController }) => {
      receivedController = abortController
      resolve('test')
    })

    // Start the futur to trigger the runner
    await futur

    // The runner receives the same controller as the public property
    expect(receivedController as unknown as AbortController).toEqual(futur.abortController)
  })

  it('should allow using the abort signal', async () => {
    let signal: AbortSignal | null = null

    const futur = Futur.of<string, never>(({ resolve, abortController }) => {
      signal = abortController.signal
      resolve('test')
    })

    await futur

    expect(signal).not.toBeNull()
    expect((signal as unknown as AbortSignal)?.aborted).toBe(false)
  })

  it('should allow aborting the operation from within the runner', async () => {
    let wasAborted = false

    const futur = Futur.of<string, string>(({ abortController }) => {
      abortController.signal.addEventListener('abort', () => {
        wasAborted = true
      })

      // Abort immediately
      abortController.abort()
    })

    const result = await futur

    expect(wasAborted).toBe(true)
    expect(Result.isErr(result)).toBe(true)
  })

  it('should reject with AbortedFailure when aborted', async () => {
    const futur = Futur.of<string, never>(({ abortController }) => {
      // Abort immediately without resolving
      abortController.abort()
    })

    const result = await futur

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(AbortedFailure)
      expect(Failure.isNamed(result.error, 'AbortedFailure')).toBe(true)
      expect((result.error as AbortedFailure).message).toBe('Futur has been aborted')
    }
  })

  it('should allow aborting from outside using the public abortController', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      // Simulate a delayed resolution
      setTimeout(() => resolve('delayed'), 1000)
    })

    // Abort from outside before awaiting
    setTimeout(() => futur.abortController.abort(), 10)

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
    futur.abortController.abort()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('resolved before abort')
    }
  })

  it('should create a new abortController on each then call', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test')
    })

    const controllerBefore = futur.abortController

    await futur

    const controllerAfter = futur.abortController

    // A new controller is created when then is called
    expect(controllerBefore).not.toBe(controllerAfter)
  })

  it('should allow re-running the futur after abort', async () => {
    let callCount = 0

    const futur = Futur.of<number, never>(({ resolve, abortController }) => {
      callCount++
      // Abort on first call only
      if (callCount === 1) {
        abortController.abort()
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

    // Second run - should work normally with new AbortController
    const result2 = await futur

    expect(Result.isOk(result2)).toBe(true)

    if (Result.isOk(result2)) {
      expect(result2.value).toBe(2)
    }
  })

  it('should reset abortController before each run', async () => {
    const futur = Futur.of<string, never>(({ resolve }) => {
      resolve('test')
    })

    // Get the initial controller
    const initialController = futur.abortController

    // Abort the initial controller
    initialController.abort()
    expect(initialController.signal.aborted).toBe(true)

    // Run the futur - it should create a new controller
    const result = await futur

    // The new controller should not be aborted
    expect(futur.abortController.signal.aborted).toBe(false)
    expect(Result.isOk(result)).toBe(true)
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
