import { describe, expect, it } from 'bun:test'
import { Operation } from './operation'
import { Result } from '@theateros/result'

describe('Operation', () => {
  describe('Operation.of', () => {
    it('returns an object with the operation symbol', () => {
      const op = Operation.of(async (name: string) => name)

      // @ts-expect-error
      expect(op._type).toEqual(Symbol.for('@theateros/flow/operation'))
    })

    it('returns an object with an executor function', () => {
      const op = Operation.of(async (name: string) => name)

      expect(typeof op.executor).toBe('function')
    })
  })

  describe('Operation executor', () => {
    it('returns a context with an Ok result wrapping the value on success with a plain value', async () => {
      const op = Operation.of(async (name: string) => name.toUpperCase())

      const ctx = await op.executor({ data: 'john', services: {} })

      expect(Result.isOk(ctx.data)).toBe(true)
      expect(Result.unwrap(ctx.data)).toBe('JOHN')
      expect(ctx.services).toEqual({})
    })

    it('lifts a Result.ok returned by the function', async () => {
      const op = Operation.of(async (n: number) => Result.ok(n * 2))

      const ctx = await op.executor({ data: 5, services: {} })

      expect(Result.isOk(ctx.data)).toBe(true)
      expect(Result.unwrap(ctx.data)).toBe(10)
    })

    it('lifts nested Result.ok returned by the function', async () => {
      const op = Operation.of(async (n: number) => Result.ok(Result.ok(n * 2)))

      const ctx = await op.executor({ data: 5, services: {} })

      expect(Result.isOk(ctx.data)).toBe(true)
      expect(Result.unwrap(ctx.data)).toBe(10)
    })

    it('handles async functions that return a promise', async () => {
      const op = Operation.of(async (ms: number) => {
        await new Promise(resolve => setTimeout(resolve, ms))
        return 'done'
      })

      const ctx = await op.executor({ data: 1, services: {} })

      expect(Result.isOk(ctx.data)).toBe(true)
      expect(Result.unwrap(ctx.data)).toBe('done')
    })

    it('returns a context with an Err result when the function throws a plain error', async () => {
      const error = new Error('something went wrong')
      const op = Operation.of(async (_: string) => {
        throw error
      })

      const ctx = await op.executor({ data: 'input', services: {} })

      expect(Result.isErr(ctx.data)).toBe(true)
      expect(Result.unwrapErr(ctx.data)).toBe(error)
    })

    it('lifts a thrown Result.err into the error context', async () => {
      const op = Operation.of(async (_: string) => {
        throw Result.err('validation failed')
      })

      const ctx = await op.executor({ data: 'input', services: {} })

      expect(Result.isErr(ctx.data)).toBe(true)
      expect(Result.unwrapErr(ctx.data)).toBe('validation failed')
    })

    it('passes the context data to the underlying function', async () => {
      let received: unknown

      const op = Operation.of(async (x: number) => {
        received = x
        return x
      })

      await op.executor({ data: 42, services: {} })

      expect(received).toBe(42)
    })
  })
})
