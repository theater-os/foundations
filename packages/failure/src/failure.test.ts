import { describe, expect, it } from 'bun:test'
import { Failure } from './failure'

describe('Failure', () => {
  it('should create a failure with a message', () => {
    const failure = new Failure('Test error')

    expect(failure).toBeInstanceOf(Failure)
    expect(failure).toBeInstanceOf(Error)
    expect(failure.message).toBe('Test error')
    expect(failure.name).toBe('Failure')
  })

  it('should create a failure with options', () => {
    const cause = new Error('Original error')
    const failure = new Failure('Test error', { cause })

    expect(failure.message).toBe('Test error')
    expect(failure.cause).toBe(cause)
    expect(failure.options).toEqual({ cause })
  })

  it('should create a failure without options', () => {
    const failure = new Failure('Test error')

    expect(failure.options).toBeUndefined()
    expect(failure.cause).toBeUndefined()
  })

  it('should have a stack trace', () => {
    const failure = new Failure('Test error')

    expect(failure.stack).toBeDefined()
    expect(typeof failure.stack).toBe('string')
  })
})

describe('Failure.named', () => {
  it('should create a named failure class', () => {
    const CustomFailure = Failure.named('CustomFailure')

    const failure = new CustomFailure('Test error')

    expect(failure).toBeInstanceOf(Failure)
    expect(failure.name).toBe('CustomFailure')
    expect(failure.message).toBe('Test error')
  })

  it('should create a named failure class with options', () => {
    const CustomFailure = Failure.named('CustomFailure')

    const cause = new Error('Original error')
    const failure = new CustomFailure('Test error', { cause })

    expect(failure.name).toBe('CustomFailure')
    expect(failure.message).toBe('Test error')
    expect(failure.cause).toBe(cause)
  })

  it('should create different named failure classes', () => {
    const NotFoundFailure = Failure.named('NotFoundFailure')
    const ValidationFailure = Failure.named('ValidationFailure')

    const notFound = new NotFoundFailure('Not found')
    const validation = new ValidationFailure('Invalid input')

    expect(notFound.name).toBe('NotFoundFailure')
    expect(validation.name).toBe('ValidationFailure')
    expect(notFound).toBeInstanceOf(Failure)
    expect(validation).toBeInstanceOf(Failure)
  })
})

describe('Failure.of', () => {
  it('should create a standard failure with message only', () => {
    const f = Failure.of('Test error')

    expect(f).toBeInstanceOf(Failure)
    expect(f.message).toBe('Test error')
    expect(f.name).toBe('Failure')
  })

  it('should create a standard failure with message and options', () => {
    const cause = new Error('Original error')
    const f = Failure.of('Test error', { cause })

    expect(f).toBeInstanceOf(Failure)
    expect(f.message).toBe('Test error')
    expect(f.cause).toBe(cause)
  })

  it('should create a failure without options', () => {
    const f = Failure.of('Test error')

    expect(f.options).toBeUndefined()
    expect(f.cause).toBeUndefined()
  })
})

describe('Failure.ofNamed', () => {
  it('should create a failure using a failure class', () => {
    const CustomFailure = Failure.named('CustomFailure')

    const f = Failure.ofNamed(CustomFailure, 'Test error')

    expect(f).toBeInstanceOf(CustomFailure)
    expect(f).toBeInstanceOf(Failure)
    expect(f.name).toBe('CustomFailure')
    expect(f.message).toBe('Test error')
  })

  it('should create a failure using a failure class with options', () => {
    const CustomFailure = Failure.named('CustomFailure')
    const cause = new Error('Original error')
    const f = Failure.ofNamed(CustomFailure, 'Test error', { cause })

    expect(f).toBeInstanceOf(CustomFailure)
    expect(f.name).toBe('CustomFailure')
    expect(f.message).toBe('Test error')
    expect(f.cause).toBe(cause)
  })

  it('should create a failure using a failure class without options', () => {
    const CustomFailure = Failure.named('CustomFailure')
    const f = Failure.ofNamed(CustomFailure, 'Test error')

    expect(f.options).toBeUndefined()
    expect(f.cause).toBeUndefined()
  })
})

describe('Failure.is', () => {
  it('should return true for Failure instances', () => {
    const failure = new Failure('Test error')

    expect(Failure.is(failure)).toBe(true)
  })

  it('should return true for named failure instances', () => {
    const CustomFailure = Failure.named('CustomFailure')
    const failure = new CustomFailure('Test error')

    expect(Failure.is(failure)).toBe(true)
  })

  it('should return false for standard Error instances', () => {
    const error = new Error('Test error')

    expect(Failure.is(error)).toBe(false)
  })

  it('should return false for non-error values', () => {
    expect(Failure.is(null)).toBe(false)
    expect(Failure.is(undefined)).toBe(false)
    expect(Failure.is('string')).toBe(false)
    expect(Failure.is(123)).toBe(false)
    expect(Failure.is({})).toBe(false)
    expect(Failure.is([])).toBe(false)
  })

  it('should narrow the type correctly', () => {
    const value: unknown = new Failure('Test error')

    if (Failure.is(value)) {
      expect(value.message).toBe('Test error')
      expect(value.name).toBe('Failure')
    }
  })
})

describe('Failure.isNamed', () => {
  it('should return true for matching named failure', () => {
    const CustomFailure = Failure.named('CustomFailure')
    const failure = new CustomFailure('Test error')

    expect(Failure.isNamed(failure, 'CustomFailure')).toBe(true)
  })

  it('should return false for non-matching named failure', () => {
    const CustomFailure = Failure.named('CustomFailure')
    const failure = new CustomFailure('Test error')

    expect(Failure.isNamed(failure, 'OtherFailure')).toBe(false)
  })

  it('should return true for standard Failure with matching name', () => {
    const failure = new Failure('Test error')

    expect(Failure.isNamed(failure, 'Failure')).toBe(true)
    expect(Failure.isNamed(failure, 'CustomFailure')).toBe(false)
  })

  it('should return false for standard Error', () => {
    const error = new Error('Test error')

    expect(Failure.isNamed(error, 'Failure')).toBe(false)
    expect(Failure.isNamed(error, 'CustomFailure')).toBe(false)
  })

  it('should return false for non-error values', () => {
    expect(Failure.isNamed(null, 'CustomFailure')).toBe(false)
    expect(Failure.isNamed(undefined, 'CustomFailure')).toBe(false)
    expect(Failure.isNamed('string', 'CustomFailure')).toBe(false)
    expect(Failure.isNamed(123, 'CustomFailure')).toBe(false)
  })

  it('should narrow the type correctly', () => {
    const CustomFailure = Failure.named('CustomFailure')
    const value: unknown = new CustomFailure('Test error')

    if (Failure.isNamed(value, 'CustomFailure')) {
      expect(value.name).toBe('CustomFailure')
      expect(value.message).toBe('Test error')
    }
  })
})

describe('Failure.panic', () => {
  it('should throw the given error', () => {
    const error = new Error('Test error')

    expect(() => Failure.panic(error)).toThrow('Test error')
  })

  it('should throw a Failure', () => {
    const failure = new Failure('Test failure')

    expect(() => Failure.panic(failure)).toThrow(failure)
    expect(() => Failure.panic(failure)).toThrow(Failure)
  })

  it('should throw a named failure', () => {
    const CustomFailure = Failure.named('CustomFailure')
    const failure = new CustomFailure('Test failure')

    expect(() => Failure.panic(failure)).toThrow(failure)
    expect(() => Failure.panic(failure)).toThrow(CustomFailure)
  })

  it('should have never return type', () => {
    const error = new Error('Test error')
    // TypeScript should infer that this code is unreachable
    // This is a compile-time check, but we can verify the runtime behavior
    try {
      Failure.panic(error)
    } catch (e) {
      expect(e).toBe(error)
    }
  })
})
