// biome-ignore-all lint/suspicious/noExplicitAny: we want to use any
import type { Result } from '@theateros/result'

/**
 * Inwrap the type of a succes result recursivly
 */
export type UnwrapSuccess<R> = R extends Result<infer S, any> ? UnwrapSuccess<S> : R

/**
 * Unwrap the type of an Err result recursivly
 */
export type UnwrapErr<R> = R extends Result<any, infer E> ? UnwrapErr<E> : R

/**
 * Infer the success type no matter if it's a Result or not or a Promise
 * or not
 */
export type UnwrapAwaitedSuccess<R> = UnwrapSuccess<Awaited<R>>

/**
 * Infer the err type no matter if it's a Result or a Promise
 */
export type UnwrapAwaitedErr<R> = UnwrapErr<Awaited<R>>

/**
 * Safely Wrap a type T and an error E into a Result no matter
 * if T or E is a promise
 */
export type AwaitedResult<R, E = unknown> = Awaited<R> extends Result<any, any>
  ? Awaited<R>
  : Result<Awaited<R>, Awaited<E>>
