import { describe, expect, it } from 'bun:test'
import { Match } from './match'

describe('Match.of', () => {
  const isString: Match.Predicate<string> = (value): value is string => typeof value === 'string'
  const isNumber: Match.Predicate<number> = (value): value is number => typeof value === 'number'
  const isBoolean: Match.Predicate<boolean> = (value): value is boolean => typeof value === 'boolean'
  const isNull: Match.Predicate<null> = (value): value is null => value === null
  const isUndefined: Match.Predicate<undefined> = (value): value is undefined => value === undefined
  const isArray: Match.Predicate<unknown[]> = (value): value is unknown[] => Array.isArray(value)
  const isObject: Match.Predicate<object> = (value): value is object =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

  describe('with default matcher only', () => {
    it('should always return the default value', () => {
      const matcher = Match.of([Match.any, () => 'default'])

      expect(matcher('anything')).toBe('default')
      expect(matcher(123)).toBe('default')
      expect(matcher(null)).toBe('default')
      expect(matcher({})).toBe('default')
    })

    it('should pass the value to the default handler', () => {
      const matcher = Match.of([Match.any, value => value])

      expect(matcher('test')).toBe('test')
      expect(matcher(42)).toBe(42)
    })
  })

  describe('with single matcher and default', () => {
    it('should match string values', () => {
      const matcher = Match.of([isString, value => value.toUpperCase()], [Match.any, () => 'not a string'])

      expect(matcher('hello')).toBe('HELLO')
      expect(matcher(123)).toBe('not a string')
    })

    it('should match number values', () => {
      const matcher = Match.of([isNumber, value => value * 2], [Match.any, () => 0])

      expect(matcher(5)).toBe(10)
      expect(matcher('not a number')).toBe(0)
    })

    it('should match boolean values', () => {
      const matcher = Match.of([isBoolean, value => (value ? 'yes' : 'no')], [Match.any, () => 'unknown'])

      expect(matcher(true)).toBe('yes')
      expect(matcher(false)).toBe('no')
      expect(matcher('true')).toBe('unknown')
    })
  })

  describe('with multiple matchers', () => {
    it('should match the first matching predicate', () => {
      const matcher = Match.of(
        [isString, value => `string: ${value}`],
        [isNumber, value => `number: ${value}`],
        [isBoolean, value => `boolean: ${value}`],
        [Match.any, () => 'unknown type'],
      )

      expect(matcher('hello')).toBe('string: hello')
      expect(matcher(42)).toBe('number: 42')
      expect(matcher(true)).toBe('boolean: true')
      expect(matcher(null)).toBe('unknown type')
    })

    it('should handle null and undefined', () => {
      const matcher = Match.of(
        [isNull, () => 'null value'],
        [isUndefined, () => 'undefined value'],
        [Match.any, () => 'other'],
      )

      expect(matcher(null)).toBe('null value')
      expect(matcher(undefined)).toBe('undefined value')
      expect(matcher(0)).toBe('other')
    })

    it('should handle arrays and objects', () => {
      const matcher = Match.of(
        [isArray, arr => `array with ${arr.length} items`],
        [isObject, () => 'plain object'],
        [Match.any, () => 'primitive'],
      )

      expect(matcher([1, 2, 3])).toBe('array with 3 items')
      expect(matcher({ key: 'value' })).toBe('plain object')
      expect(matcher('string')).toBe('primitive')
    })
  })

  describe('matcher order', () => {
    it('should use the first matching predicate when multiple could match', () => {
      // Both predicates match numbers, but first one should win
      const isPositive: Match.Predicate<number> = (value): value is number => typeof value === 'number' && value > 0
      const isAnyNumber: Match.Predicate<number> = (value): value is number => typeof value === 'number'

      const matcher = Match.of(
        [isPositive, () => 'positive'],
        [isAnyNumber, () => 'any number'],
        [Match.any, () => 'not a number'],
      )

      expect(matcher(5)).toBe('positive')
      expect(matcher(-5)).toBe('any number')
      expect(matcher('string')).toBe('not a number')
    })
  })

  describe('complex predicates', () => {
    it('should work with custom object type guards', () => {
      interface User {
        type: 'user'
        name: string
      }

      interface Admin {
        type: 'admin'
        name: string
        permissions: string[]
      }

      const isUser: Match.Predicate<User> = (value): value is User =>
        typeof value === 'object' && value !== null && (value as User).type === 'user'

      const isAdmin: Match.Predicate<Admin> = (value): value is Admin =>
        typeof value === 'object' && value !== null && (value as Admin).type === 'admin'

      const matcher = Match.of(
        [isAdmin, admin => `Admin: ${admin.name} with ${admin.permissions.length} permissions`],
        [isUser, user => `User: ${user.name}`],
        [Match.any, () => 'Unknown entity'],
      )

      const user: User = { type: 'user', name: 'John' }
      const admin: Admin = { type: 'admin', name: 'Jane', permissions: ['read', 'write'] }

      expect(matcher(user)).toBe('User: John')
      expect(matcher(admin)).toBe('Admin: Jane with 2 permissions')
      expect(matcher({ type: 'guest' })).toBe('Unknown entity')
    })

    it('should work with discriminated unions', () => {
      type Success = { status: 'success'; data: string }
      type Error = { status: 'error'; message: string }
      type Loading = { status: 'loading' }

      const isSuccess: Match.Predicate<Success> = (value): value is Success =>
        typeof value === 'object' && value !== null && (value as Success).status === 'success'

      const isError: Match.Predicate<Error> = (value): value is Error =>
        typeof value === 'object' && value !== null && (value as Error).status === 'error'

      const isLoading: Match.Predicate<Loading> = (value): value is Loading =>
        typeof value === 'object' && value !== null && (value as Loading).status === 'loading'

      const matcher = Match.of(
        [isSuccess, state => `Data: ${state.data}`],
        [isError, state => `Error: ${state.message}`],
        [isLoading, () => 'Loading...'],
        [Match.any, () => 'Unknown state'],
      )

      expect(matcher({ status: 'success', data: 'Hello' })).toBe('Data: Hello')
      expect(matcher({ status: 'error', message: 'Something went wrong' })).toBe('Error: Something went wrong')
      expect(matcher({ status: 'loading' })).toBe('Loading...')
    })
  })

  describe('return type transformation', () => {
    it('should allow different return types for each matcher', () => {
      const matcher = Match.of(
        [isString, () => 1],
        [isNumber, () => 'two'],
        [isBoolean, () => ({ three: 3 })],
        [Match.any, () => [4]],
      )

      expect(matcher('test')).toBe(1)
      expect(matcher(2)).toBe('two')
      expect(matcher(true)).toEqual({ three: 3 })
      expect(matcher(null)).toEqual([4])
    })

    it('should work with async handlers', async () => {
      const matcher = Match.of([isString, async value => `async: ${value}`], [Match.any, async () => 'async default'])

      expect(await matcher('hello')).toBe('async: hello')
      expect(await matcher(123)).toBe('async default')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const matcher = Match.of(
        [isString, value => (value === '' ? 'empty' : 'not empty')],
        [Match.any, () => 'default'],
      )

      expect(matcher('')).toBe('empty')
      expect(matcher('hello')).toBe('not empty')
    })

    it('should handle zero', () => {
      const matcher = Match.of([isNumber, value => (value === 0 ? 'zero' : 'non-zero')], [Match.any, () => 'default'])

      expect(matcher(0)).toBe('zero')
      expect(matcher(5)).toBe('non-zero')
    })

    it('should handle NaN', () => {
      const isNaNValue: Match.Predicate<number> = (value): value is number =>
        typeof value === 'number' && Number.isNaN(value)

      const matcher = Match.of(
        [isNaNValue, () => 'is NaN'],
        [isNumber, () => 'is number'],
        [Match.any, () => 'default'],
      )

      expect(matcher(NaN)).toBe('is NaN')
      expect(matcher(5)).toBe('is number')
    })

    it('should handle Infinity', () => {
      const isInfinity: Match.Predicate<number> = (value): value is number =>
        typeof value === 'number' && !Number.isFinite(value) && !Number.isNaN(value)

      const matcher = Match.of(
        [isInfinity, () => 'infinity'],
        [isNumber, () => 'finite number'],
        [Match.any, () => 'default'],
      )

      expect(matcher(Infinity)).toBe('infinity')
      expect(matcher(-Infinity)).toBe('infinity')
      expect(matcher(42)).toBe('finite number')
    })
  })
})

describe('Match.UnhandledMatchCaseFailure', () => {
  it('should be an instance of Failure', () => {
    const failure = new Match.UnhandledMatchCaseFailure('Test message')

    expect(failure).toBeInstanceOf(Error)
    expect(failure.name).toBe('UnhandledMatchCaseFailure')
    expect(failure.message).toBe('Test message')
  })
})

describe('Match.any', () => {
  it('should be a unique symbol', () => {
    expect(typeof Match.any).toBe('symbol')
    expect(Match.any.toString()).toBe('Symbol(@theateros/match/any)')
  })

  it('should be retrievable via Symbol.for', () => {
    expect(Symbol.for('@theateros/match/any')).toBe(Match.any)
  })
})
