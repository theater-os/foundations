import { describe, expect, it } from 'bun:test'
import { Failure } from '@theateros/failure'
import { Result } from './result'

describe('Result.ok', () => {
  it('should create an Ok result with a value', () => {
    const result = Result.ok('test value')

    expect(result).toHaveProperty('_type')
    expect(result).toHaveProperty('_kind')
    expect(result).toHaveProperty('value')
    expect(result.value).toBe('test value')
  })

  it('should create an Ok result with different value types', () => {
    const stringResult = Result.ok('string')
    const numberResult = Result.ok(42)
    const objectResult = Result.ok({ key: 'value' })
    const arrayResult = Result.ok([1, 2, 3])
    const nullResult = Result.ok(null)
    const undefinedResult = Result.ok(undefined)

    expect(stringResult.value).toBe('string')
    expect(numberResult.value).toBe(42)
    expect(objectResult.value).toEqual({ key: 'value' })
    expect(arrayResult.value).toEqual([1, 2, 3])
    expect(nullResult.value).toBeNull()
    expect(undefinedResult.value).toBeUndefined()
  })

  it('should not have an error property', () => {
    const result = Result.ok('test')

    expect(result.error).toBeUndefined()
  })
})

describe('Result.err', () => {
  it('should create an Err result with an error', () => {
    const result = Result.err('test error')

    expect(result).toHaveProperty('_type')
    expect(result).toHaveProperty('_kind')
    expect(result).toHaveProperty('error')
    expect(result.error).toBe('test error')
  })

  it('should create an Err result with different error types', () => {
    const stringError = Result.err('string error')
    const errorObject = Result.err(new Error('Error object'))
    const numberError = Result.err(404)
    const objectError = Result.err({ code: 'ERROR', message: 'Something went wrong' })

    expect(stringError.error).toBe('string error')
    expect(errorObject.error).toBeInstanceOf(Error)
    expect(numberError.error).toBe(404)
    expect(objectError.error).toEqual({ code: 'ERROR', message: 'Something went wrong' })
  })

  it('should not have a value property', () => {
    const result = Result.err('test error')

    expect(result.value).toBeUndefined()
  })
})

describe('Result.is', () => {
  it('should return true for Ok results', () => {
    const okResult = Result.ok('test')

    expect(Result.is(okResult)).toBe(true)
  })

  it('should return true for Err results', () => {
    const errResult = Result.err('error')

    expect(Result.is(errResult)).toBe(true)
  })

  it('should return false for non-result values', () => {
    expect(Result.is(null)).toBe(false)
    expect(Result.is(undefined)).toBe(false)
    expect(Result.is('string')).toBe(false)
    expect(Result.is(123)).toBe(false)
    expect(Result.is({})).toBe(false)
    expect(Result.is([])).toBe(false)
    expect(Result.is(new Error('test'))).toBe(false)
  })

  it('should return false for objects with similar structure but wrong symbols', () => {
    const fakeResult = {
      _type: Symbol.for('wrong'),
      _kind: Symbol.for('wrong'),
      value: 'test',
    }

    expect(Result.is(fakeResult)).toBe(false)
  })

  it('should narrow the type correctly', () => {
    const value: unknown = Result.ok('test')

    if (Result.is(value)) {
      expect(value.value || value.error).toBeDefined()
    }
  })
})

describe('Result.isOk', () => {
  it('should return true for Ok results', () => {
    const okResult = Result.ok('test')

    expect(Result.isOk(okResult)).toBe(true)
  })

  it('should return false for Err results', () => {
    const errResult = Result.err('error')

    expect(Result.isOk(errResult)).toBe(false)
  })

  it('should return false for non-result values', () => {
    expect(Result.isOk(null)).toBe(false)
    expect(Result.isOk(undefined)).toBe(false)
    expect(Result.isOk('string')).toBe(false)
    expect(Result.isOk({})).toBe(false)
  })

  it('should narrow the type correctly', () => {
    const value: unknown = Result.ok('test')

    if (Result.isOk(value)) {
      expect(value.value).toBe('test')
      expect(value.error).toBeUndefined()
    }
  })
})

describe('Result.isErr', () => {
  it('should return true for Err results', () => {
    const errResult = Result.err('error')

    expect(Result.isErr(errResult)).toBe(true)
  })

  it('should return false for Ok results', () => {
    const okResult = Result.ok('test')

    expect(Result.isErr(okResult)).toBe(false)
  })

  it('should return false for non-result values', () => {
    expect(Result.isErr(null)).toBe(false)
    expect(Result.isErr(undefined)).toBe(false)
    expect(Result.isErr('string')).toBe(false)
    expect(Result.isErr({})).toBe(false)
  })

  it('should narrow the type correctly', () => {
    const value: unknown = Result.err('error')

    if (Result.isErr(value)) {
      expect(value.error).toBe('error')
      expect(value.value).toBeUndefined()
    }
  })
})

describe('Result.unwrap', () => {
  it('should return the value for Ok results', () => {
    const okResult = Result.ok('test value')

    expect(Result.unwrap(okResult)).toBe('test value')
  })

  it('should return the value for Ok results with different types', () => {
    expect(Result.unwrap(Result.ok(42))).toBe(42)
    expect(Result.unwrap(Result.ok({ key: 'value' }))).toEqual({ key: 'value' })
    expect(Result.unwrap(Result.ok([1, 2, 3]))).toEqual([1, 2, 3])
    expect(Result.unwrap(Result.ok(null))).toBeNull()
  })

  it('should throw the error for Err results when no default value is provided', () => {
    const errResult = Result.err('test error')

    expect(() => Result.unwrap(errResult)).toThrow('test error')
  })

  it('should return the default value for Err results when provided', () => {
    const errResult = Result.err('test error')

    expect(Result.unwrap(errResult, 'default value')).toBe('default value')
  })

  it('should return the default value for Err results with different types', () => {
    const errResult = Result.err('error')

    expect(Result.unwrap(errResult, 0)).toBe(0)
    expect(Result.unwrap(errResult, { default: true })).toEqual({ default: true })
    expect(Result.unwrap(errResult, null)).toBeNull()
  })

  it('should prefer the value over default value for Ok results', () => {
    const okResult = Result.ok('actual value')

    expect(Result.unwrap(okResult, 'default value')).toBe('actual value')
  })
})

describe('Result.safe', () => {
  it('should return a function that returns Ok result for successful execution', () => {
    const safeFn = Result.safe(() => 'success')
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('success')
    }
  })

  it('should return a function that returns Ok result with the function return value', () => {
    const safeFn = Result.safe(() => 42)
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(42)
    }
  })

  it('should return a function that returns Err result for throwing functions', () => {
    const safeFn = Result.safe(() => {
      throw new Error('Something went wrong')
    })

    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe('Something went wrong')
    }
  })

  it('should return a function that returns Err result with the thrown error', () => {
    const customError = 'Custom error message'
    const safeFn = Result.safe(() => {
      throw customError
    })
    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe(customError)
    }
  })

  it('should use onError callback to transform errors', () => {
    const safeFn = Result.safe(
      () => {
        throw new Error('Original error')
      },
      error => `Transformed: ${(error as Error).message}`,
    )

    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('Transformed: Original error')
    }
  })

  it('should use onError callback to transform different error types', () => {
    const safeFn = Result.safe(
      () => {
        throw 'string error'
      },
      error => ({ message: String(error), code: 'ERROR' }),
    )

    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toEqual({ message: 'string error', code: 'ERROR' })
    }
  })

  it('should handle functions with parameters', () => {
    const safeAdd = Result.safe((a: number, b: number) => a + b)
    const result = safeAdd(2, 3)

    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toBe(5)
    }
  })

  it('should handle functions with multiple parameters', () => {
    const safeConcat = Result.safe((a: string, b: string, c: string) => `${a}${b}${c}`)
    const result = safeConcat('a', 'b', 'c')

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('abc')
    }
  })

  it('should handle functions that return undefined', () => {
    const safeFn = Result.safe(() => undefined)
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBeUndefined()
    }
  })

  it('should handle functions that return null', () => {
    const safeFn = Result.safe(() => null)
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('should be reusable - can call the wrapped function multiple times', () => {
    const safeFn = Result.safe((x: number) => x * 2)
    const result1 = safeFn(5)
    const result2 = safeFn(10)

    expect(Result.isOk(result1)).toBe(true)
    expect(Result.isOk(result2)).toBe(true)

    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toBe(10)
      expect(result2.value).toBe(20)
    }
  })

  it('should handle errors on subsequent calls', () => {
    let shouldThrow = false
    const safeFn = Result.safe(() => {
      if (shouldThrow) {
        throw new Error('Error on second call')
      }

      return 'success'
    })

    const result1 = safeFn()
    expect(Result.isOk(result1)).toBe(true)

    shouldThrow = true
    const result2 = safeFn()
    expect(Result.isErr(result2)).toBe(true)
  })
})

describe('Result type system', () => {
  it('should correctly type Ok and Err as Result', () => {
    const okResult: Result<string, Error> = Result.ok('test')
    const errResult: Result<string, Error> = Result.err(new Error('error'))

    expect(Result.is(okResult)).toBe(true)
    expect(Result.is(errResult)).toBe(true)
  })

  it('should allow type narrowing with isOk', () => {
    const result: Result<number, string> = Result.ok(42)

    if (Result.isOk(result)) {
      // TypeScript should know this is Ok<number>
      expect(result.value).toBe(42)
      expect(result.error).toBeUndefined()
    }
  })

  it('should allow type narrowing with isErr', () => {
    const result: Result<number, string> = Result.err('error')

    if (Result.isErr(result)) {
      // TypeScript should know this is Err<string>
      expect(result.error).toBe('error')
      expect(result.value).toBeUndefined()
    }
  })
})

describe('Result.unwrapErr', () => {
  it('should return the error for Err results', () => {
    const errResult = Result.err('test error')

    expect(Result.unwrapErr(errResult)).toBe('test error')
  })

  it('should return the error for Err results with different types', () => {
    expect(Result.unwrapErr(Result.err(404))).toBe(404)
    expect(Result.unwrapErr(Result.err(new Error('oops')))).toBeInstanceOf(Error)
    expect(Result.unwrapErr(Result.err({ code: 'NOT_FOUND' }))).toEqual({ code: 'NOT_FOUND' })
  })

  it('should throw UnwrapErrFailure for Ok results when no default value is provided', () => {
    const okResult = Result.ok('value')

    expect(() => Result.unwrapErr(okResult)).toThrow(Result.UnwrapErrFailure)
  })

  it('should throw a Failure instance for Ok results when no default value is provided', () => {
    const okResult = Result.ok('value')

    expect(() => Result.unwrapErr(okResult)).toThrow(Failure)
  })

  it('should return the default value for Ok results when provided', () => {
    const okResult = Result.ok('value')

    expect(Result.unwrapErr(okResult, 'default error')).toBe('default error')
  })

  it('should return the default value for Ok results with different types', () => {
    const okResult = Result.ok('value')

    expect(Result.unwrapErr(okResult, 404)).toBe(404)
    expect(Result.unwrapErr(okResult, { code: 'DEFAULT' })).toEqual({ code: 'DEFAULT' })
  })

  it('should prefer the error over default value for Err results', () => {
    const errResult = Result.err('actual error')

    expect(Result.unwrapErr(errResult, 'default error')).toBe('actual error')
  })
})

describe('Result.unwrapLift', () => {
  it('should unwrap a simple Ok result', () => {
    const result = Result.ok(42)

    expect(Result.unwrapLift(result)).toBe(42)
  })

  it('should recursively unwrap nested Ok results', () => {
    const nested = Result.ok(Result.ok(Result.ok('deep value')))

    expect(Result.unwrapLift(nested)).toBe('deep value')
  })

  it('should unwrap two levels of nesting', () => {
    const nested = Result.ok(Result.ok(99))

    expect(Result.unwrapLift(nested)).toBe(99)
  })

  it('should return a non-Result value as-is', () => {
    expect(Result.unwrapLift(42)).toBe(42)
    expect(Result.unwrapLift('hello')).toBe('hello')
  })

  it('should throw the error for Err results when no default value is provided', () => {
    const errResult = Result.err('something failed')

    expect(() => Result.unwrapLift(errResult)).toThrow('something failed')
  })

  it('should return the default value for Err results when provided', () => {
    const errResult: Result<string, string> = Result.err('something failed')

    expect(Result.unwrapLift(errResult, 'fallback')).toBe('fallback')
  })

  it('should throw when a nested Result is Err', () => {
    const nested = Result.ok(Result.err('inner error'))

    expect(() => Result.unwrapLift(nested)).toThrow('inner error')
  })

  it('should return default when a nested Result is Err and default is provided', () => {
    const nested = Result.ok(Result.err('inner error'))

    expect(Result.unwrapLift(nested, 'fallback')).toBe('fallback')
  })
})

describe('Result.unwrapLiftErr', () => {
  it('should unwrap a simple Err result', () => {
    const result = Result.err('test error')

    expect(Result.unwrapLiftErr(result)).toBe('test error')
  })

  it('should recursively unwrap nested Err results', () => {
    const nested = Result.err(Result.err(Result.err('deep error')))

    expect(Result.unwrapLiftErr(nested)).toBe('deep error')
  })

  it('should unwrap two levels of Err nesting', () => {
    const nested = Result.err(Result.err('inner error'))

    expect(Result.unwrapLiftErr(nested)).toBe('inner error')
  })

  it('should throw UnwrapErrFailure for Ok results when no default value is provided', () => {
    const okResult = Result.ok('value')

    expect(() => Result.unwrapLiftErr(okResult)).toThrow(Result.UnwrapErrFailure)
  })

  it('should return the default value for Ok results when provided', () => {
    const okResult = Result.ok('value')

    expect(Result.unwrapLiftErr(okResult, 'default error')).toBe('default error')
  })
})

describe('Result.safeLifteded', () => {
  it('should wrap a plain return value in an Ok result', () => {
    const safeFn = Result.safeLifted(() => 42)
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(42)
    }
  })

  it('should unwrap a returned Ok result', () => {
    const safeFn = Result.safeLifted(() => Result.ok('lifted'))
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('lifted')
    }
  })

  it('should recursively unwrap nested Ok results', () => {
    const safeFn = Result.safeLifted(() => Result.ok(Result.ok(Result.ok('deep'))))
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('deep')
    }
  })

  it('should return Err when the function returns an Err result', () => {
    const safeFn = Result.safeLifted(() => Result.err('inner error'))
    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('inner error')
    }
  })

  it('should return Err when a nested Ok wraps an Err result', () => {
    const safeFn = Result.safeLifted(() => Result.ok(Result.err('nested error')))
    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('nested error')
    }
  })

  it('should return Err when the function throws', () => {
    const safeFn = Result.safeLifted(() => {
      throw new Error('thrown error')
    })
    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe('thrown error')
    }
  })

  it('should use onError callback to transform thrown errors', () => {
    const safeFn = Result.safeLifted(
      () => {
        throw new Error('original')
      },
      error => `Transformed: ${(error as Error).message}`,
    )
    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('Transformed: original')
    }
  })

  it('should use onError callback when an inner Err is propagated', () => {
    const safeFn = Result.safeLifted(
      () => Result.err('inner'),
      () => 'transformed',
    )
    const result = safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('transformed')
    }
  })

  it('should handle functions with parameters', () => {
    const safeAdd = Result.safeLifted((a: number, b: number) => Result.ok(a + b))
    const result = safeAdd(3, 4)

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(7)
    }
  })

  it('should handle functions that return undefined', () => {
    const safeFn = Result.safeLifted(() => undefined)
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBeUndefined()
    }
  })

  it('should handle functions that return null', () => {
    const safeFn = Result.safeLifted(() => null)
    const result = safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('should be reusable across multiple calls', () => {
    const safeFn = Result.safeLifted((x: number) => Result.ok(x * 2))
    const result1 = safeFn(5)
    const result2 = safeFn(10)

    expect(Result.isOk(result1)).toBe(true)
    expect(Result.isOk(result2)).toBe(true)

    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toBe(10)
      expect(result2.value).toBe(20)
    }
  })

  it('should handle errors on subsequent calls', () => {
    let shouldFail = false
    const safeFn = Result.safeLifted(() => {
      if (shouldFail) {
        return Result.err('failed')
      }

      return Result.ok('success')
    })

    const result1 = safeFn()
    expect(Result.isOk(result1)).toBe(true)

    shouldFail = true
    const result2 = safeFn()
    expect(Result.isErr(result2)).toBe(true)
  })
})

describe('Result.asyncSafeLifted', () => {
  it('should wrap a plain return value in an Ok result', async () => {
    const safeFn = await Result.asyncSafeLifted(() => 42)
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(42)
    }
  })

  it('should unwrap a returned Ok result', async () => {
    const safeFn = await Result.asyncSafeLifted(() => Result.ok('lifted'))
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('lifted')
    }
  })

  it('should recursively unwrap nested Ok results', async () => {
    const safeFn = await Result.asyncSafeLifted(() => Result.ok(Result.ok(Result.ok('deep'))))
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('deep')
    }
  })

  it('should return Err when the function returns an Err result', async () => {
    const safeFn = await Result.asyncSafeLifted(() => Result.err('inner error'))
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('inner error')
    }
  })

  it('should return Err when a nested Ok wraps an Err result', async () => {
    const safeFn = await Result.asyncSafeLifted(() => Result.ok(Result.err('nested error')))
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('nested error')
    }
  })

  it('should return Err when the function throws', async () => {
    const safeFn = await Result.asyncSafeLifted(() => {
      throw new Error('thrown error')
    })
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe('thrown error')
    }
  })

  it('should use onError callback to transform thrown errors', async () => {
    const safeFn = await Result.asyncSafeLifted(
      () => {
        throw new Error('original')
      },
      error => `Transformed: ${(error as Error).message}`,
    )
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('Transformed: original')
    }
  })

  it('should use onError callback when an inner Err is propagated', async () => {
    const safeFn = await Result.asyncSafeLifted(
      () => Result.err('inner'),
      () => 'transformed',
    )
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('transformed')
    }
  })

  it('should handle async functions that return a plain value', async () => {
    const safeFn = await Result.asyncSafeLifted(async () => 'async value')
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('async value')
    }
  })

  it('should handle async functions that return an Ok result', async () => {
    const safeFn = await Result.asyncSafeLifted(async () => Result.ok('async ok'))
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('async ok')
    }
  })

  it('should handle async functions that return an Err result', async () => {
    const safeFn = await Result.asyncSafeLifted(async () => Result.err('async error'))
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('async error')
    }
  })

  it('should handle async functions that reject', async () => {
    const safeFn = await Result.asyncSafeLifted(async () => {
      throw new Error('async rejection')
    })
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe('async rejection')
    }
  })

  it('should handle functions with parameters', async () => {
    const safeAdd = await Result.asyncSafeLifted(async (a: number, b: number) => Result.ok(a + b))
    const result = await safeAdd(3, 4)

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(7)
    }
  })

  it('should handle functions that return undefined', async () => {
    const safeFn = await Result.asyncSafeLifted(() => undefined)
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBeUndefined()
    }
  })

  it('should handle functions that return null', async () => {
    const safeFn = await Result.asyncSafeLifted(() => null)
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('should be reusable across multiple calls', async () => {
    const safeFn = await Result.asyncSafeLifted(async (x: number) => Result.ok(x * 2))
    const result1 = await safeFn(5)
    const result2 = await safeFn(10)

    expect(Result.isOk(result1)).toBe(true)
    expect(Result.isOk(result2)).toBe(true)

    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toBe(10)
      expect(result2.value).toBe(20)
    }
  })

  it('should handle errors on subsequent calls', async () => {
    let shouldFail = false
    const safeFn = await Result.asyncSafeLifted(async () => {
      if (shouldFail) {
        return Result.err('failed')
      }

      return Result.ok('success')
    })

    const result1 = await safeFn()
    expect(Result.isOk(result1)).toBe(true)

    shouldFail = true
    const result2 = await safeFn()
    expect(Result.isErr(result2)).toBe(true)
  })
})

describe('Result.asyncSafe', () => {
  it('should return a function that returns Ok result for a successful sync function', async () => {
    const safeFn = await Result.asyncSafe(() => 'success')
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('success')
    }
  })

  it('should return a function that returns Ok result for a successful async function', async () => {
    const safeFn = await Result.asyncSafe(async () => 'async success')
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe('async success')
    }
  })

  it('should return Ok with different value types', async () => {
    const numberFn = await Result.asyncSafe(async () => 42)
    const objectFn = await Result.asyncSafe(async () => ({ key: 'value' }))
    const arrayFn = await Result.asyncSafe(async () => [1, 2, 3])

    expect(Result.unwrap(await numberFn())).toBe(42)
    expect(Result.unwrap(await objectFn())).toEqual({ key: 'value' })
    expect(Result.unwrap(await arrayFn())).toEqual([1, 2, 3])
  })

  it('should return Err when the sync function throws', async () => {
    const safeFn = await Result.asyncSafe(() => {
      throw new Error('sync error')
    })
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe('sync error')
    }
  })

  it('should return Err when the async function rejects', async () => {
    const safeFn = await Result.asyncSafe(async () => {
      throw new Error('async rejection')
    })
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe('async rejection')
    }
  })

  it('should use onError callback to transform thrown errors', async () => {
    const safeFn = await Result.asyncSafe(
      () => {
        throw new Error('original')
      },
      error => `Transformed: ${(error as Error).message}`,
    )
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('Transformed: original')
    }
  })

  it('should use onError callback to transform async rejections', async () => {
    const safeFn = await Result.asyncSafe(
      async () => {
        throw 'async string error'
      },
      error => ({ message: String(error), code: 'ASYNC_ERROR' }),
    )
    const result = await safeFn()

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toEqual({ message: 'async string error', code: 'ASYNC_ERROR' })
    }
  })

  it('should NOT lift - wraps a returned Result inside an Ok', async () => {
    const safeFn = await Result.asyncSafe(async () => Result.ok('inner'))
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(Result.isOk(result.value)).toBe(true)
    }
  })

  it('should handle functions with parameters', async () => {
    const safeAdd = await Result.asyncSafe(async (a: number, b: number) => a + b)
    const result = await safeAdd(3, 4)

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(7)
    }
  })

  it('should handle functions that return undefined', async () => {
    const safeFn = await Result.asyncSafe(async () => undefined)
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBeUndefined()
    }
  })

  it('should handle functions that return null', async () => {
    const safeFn = await Result.asyncSafe(async () => null)
    const result = await safeFn()

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('should be reusable across multiple calls', async () => {
    const safeFn = await Result.asyncSafe(async (x: number) => x * 2)
    const result1 = await safeFn(5)
    const result2 = await safeFn(10)

    expect(Result.isOk(result1)).toBe(true)
    expect(Result.isOk(result2)).toBe(true)

    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toBe(10)
      expect(result2.value).toBe(20)
    }
  })

  it('should handle errors on subsequent calls', async () => {
    let shouldThrow = false
    const safeFn = await Result.asyncSafe(async () => {
      if (shouldThrow) {
        throw new Error('Error on second call')
      }

      return 'success'
    })

    const result1 = await safeFn()
    expect(Result.isOk(result1)).toBe(true)

    shouldThrow = true
    const result2 = await safeFn()
    expect(Result.isErr(result2)).toBe(true)
  })
})

describe('Result integration scenarios', () => {
  function divide(a: number, b: number): Result<number, string> {
    if (b === 0) {
      return Result.err('Division by zero')
    }

    return Result.ok(a / b)
  }

  it('should handle a typical success scenario', () => {
    const result = divide(10, 2)

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(result.value).toBe(5)
    }
  })

  it('should handle a typical error scenario', () => {
    const result = divide(10, 0)

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBe('Division by zero')
    }
  })

  it('should chain operations with unwrap', () => {
    const result = Result.ok(10)
    const value = Result.unwrap(result)

    expect(value).toBe(10)
  })

  it('should handle error recovery with unwrap default', () => {
    const result = Result.err('Failed to fetch')
    const value = Result.unwrap(result, 'default data')

    expect(value).toBe('default data')
  })

  it('should wrap potentially throwing operations', () => {
    const safeParseJSON = Result.safe(
      (json: string) => JSON.parse(json),
      error => `Parse error: ${String(error)}`,
    )

    const success = safeParseJSON('{"key": "value"}')
    expect(Result.isOk(success)).toBe(true)

    const failure = safeParseJSON('invalid json')

    expect(Result.isErr(failure)).toBe(true)

    if (Result.isErr(failure)) {
      expect(failure.error).toContain('Parse error')
    }
  })
})
