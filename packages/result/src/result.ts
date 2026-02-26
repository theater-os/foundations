import { Failure } from '@theateros/failure'

const resultSymbol: unique symbol = Symbol.for('@theateros/result')
const okSymbol: unique symbol = Symbol.for('@theateros/result/ok')
const errSymbol: unique symbol = Symbol.for('@theateros/result/err')
const unsetDefaultValueSymbol: unique symbol = Symbol.for('@theateros/result/unset-default-value')

/**
 * The Ok type represents a successful result.
 *
 * @typeparam T - The value type.
 */
export type Ok<T> = {
  /**
   * The type of the result. Allows us to brand the type of the result and ensure that
   * that is comming from the @theateros/result package.
   */
  _type: typeof resultSymbol

  /**
   * The kind of the result. Allows us to brand the kind of the result and ensure that
   * that is comming from the @theateros/result package.
   */
  _kind: typeof okSymbol

  /**
   * The value of the result.
   */
  value: T

  /**
   * The error of the result. Should be never because the result is OK.
   */
  error?: never
}

/**
 * The Err type represents a failed result.
 *
 * @typeparam E - The error type.
 */
export type Err<E> = {
  /**
   * The type of the result. Allows us to brand the type of the result and ensure that
   * that is comming from the @theateros/result package.
   */
  _type: typeof resultSymbol

  /**
   * The kind of the result. Allows us to brand the kind of the result and ensure that
   * that is comming from the @theateros/result package.
   */
  _kind: typeof errSymbol

  /**
   * The error of the result.
   */
  error: E

  /**
   * The value of the result. Should be never because the result is an error.
   */
  value?: never
}

/**
 * The Result type represents a result of a computation.
 *
 * @typeparam T - The value type.
 * @typeparam E - The error type.
 */
export type Result<T, E> = Ok<T> | Err<E>

export namespace Result {
  /**
   * Failure throwned when trying to unrap an Err type on a Success whithout
   * giving any default value.
   */
  export const UnwrapErrFailure = Failure.named('@theateros/result/unwrap-err-failure')

  /**
   * Create a new Ok result.
   *
   * @typeparam T - The value type.
   * @param value - The value of the result.
   * @returns A new Ok result.
   */
  export function ok<T>(value: T): Ok<T> {
    return { _type: resultSymbol, _kind: okSymbol, value }
  }

  /**
   * Create a new Err result.
   *
   * @typeparam E - The error type.
   * @param error - The error of the result.
   * @returns A new Err result.
   */
  export function err<E>(error: E): Err<E> {
    return { _type: resultSymbol, _kind: errSymbol, error }
  }

  /**
   * Test if the given result is a result.
   *
   * @param result - The result to check.
   *
   * @typeparam T - The value type.
   * @typeparam E - The error type.
   *
   * @returns True if the result is a result, false otherwise.
   */
  export function is<T = unknown, E = unknown>(result: unknown): result is Result<T, E> {
    return result instanceof Object && '_type' in result && '_kind' in result && result._type === resultSymbol
  }

  /**
   * Test if the given result is an Ok result.
   *
   * @param result - The result to check.
   *
   * @typeparam T - The value type.
   *
   * @returns True if the result is an Ok result, false otherwise.
   */
  export function isOk<T = unknown>(result: unknown): result is Ok<T> {
    if (is(result)) {
      return result._kind === okSymbol
    }

    return false
  }

  /**
   * Test if the given result is an Err result.
   *
   * @param result - The result to check.
   *
   * @typeparam E - The error type.
   *
   * @returns True if the result is an Err result, false otherwise.
   */
  export function isErr<E = unknown>(result: unknown): result is Err<E> {
    if (is(result)) {
      return result._kind === errSymbol
    }

    return false
  }

  /**
   * Allows to Unwrap the success type of a Result
   */
  // biome-ignore lint/suspicious/noExplicitAny: we want any Err type here
  export type Unwrap<R> = R extends Result<infer S, any> ? S : R

  /**
   * Unwrap the value of the given result.
   *
   * @param result - The result to unwrap.
   *
   * @typeparam T - The value type.
   * @typeparam E - The error type.
   *
   * @throws If the result is an Err result and the default value is the unset default value (default value
   * is not provided), the error of the result is thrown.
   *
   * @returns The value of the result.
   */
  export function unwrap<T = unknown, E = unknown>(
    result: Result<T, E>,
    defaultValue: T | typeof unsetDefaultValueSymbol = unsetDefaultValueSymbol,
  ): T {
    if (isOk(result)) {
      return result.value
    }

    if (defaultValue === unsetDefaultValueSymbol) {
      throw result.error
    }

    return defaultValue
  }

  /**
   * Unwrap an error from it's Result type
   */
  // biome-ignore lint/suspicious/noExplicitAny: we want any Success type here
  export type UnwrapErr<R> = R extends Result<any, infer E> ? E : R

  /**
   * Unwrap an Err type from a Result
   *
   * @param result the result to unwrap
   * @param defaultValue the default value returned if trying to unwrap from a Success
   *
   * @throws UnwrapErrFailure if trying to unwrap a success without any default value
   *
   * @returns the Err type or the default
   */
  export function unwrapErr<T = unknown, E = unknown>(
    result: Result<T, E>,
    defaultValue: E | typeof unsetDefaultValueSymbol = unsetDefaultValueSymbol,
  ): E {
    if (isErr(result)) {
      return result.error
    }

    if (defaultValue === unsetDefaultValueSymbol) {
      throw Failure.ofNamed(
        UnwrapErrFailure,
        'You are trying to unwrap an Err on a Success without giving any default value.',
      )
    }

    return defaultValue
  }

  /*
   * Lift a success type by unwrapping recursivly the Result
   */
  // biome-ignore lint/suspicious/noExplicitAny: we want any Err here
  export type UnwrapLift<R, D = unknown> = R extends Err<any> ? D : R extends Ok<infer S> ? UnwrapLift<S, D> : R

  /**
   * Infer the default value of a lift function
   *
   * @private
   */
  // biome-ignore lint/suspicious/noExplicitAny: we want any Err here
  type InferUnwrapLiftDefaultValue<R, D = unknown> = R extends Err<any>
    ? D
    : R extends Ok<infer T>
      ? InferUnwrapLiftDefaultValue<T, D>
      : R

  /**
   * Allows to unwrap recursivly a Result sucess value
   *
   * @param result - The result to unwrap.
   * @param [defaultValue=unsetDefaultValueSymbol] the default value returned if result is an Err
   *
   * @typeparam T - The value type.
   * @typeparam E - The error type.
   *
   * @throws If the result is an Err result and the default value is the unset default value (default value
   * is not provided), the error of the result is thrown.
   *
   * @returns The value of the result.
   */
  export function unwrapLift<T = unknown, E = unknown, D = T>(
    result: Result<T, E> | T,
    defaultValue: InferUnwrapLiftDefaultValue<T, D> | typeof unsetDefaultValueSymbol = unsetDefaultValueSymbol,
  ): UnwrapLift<T, D> {
    if (!Result.is(result)) {
      return result as UnwrapLift<T, D>
    }

    if (Result.isOk(result)) {
      return unwrapLift(result.value, defaultValue)
    }

    if (defaultValue === unsetDefaultValueSymbol) {
      throw result.error
    }

    return unwrapLift(defaultValue as T)
  }

  /**
   * Lift an Err type by unwrapping recursivly the Result
   */
  // biome-ignore lint/suspicious/noExplicitAny: we want any Success here
  export type UnwrapLiftErr<R, D = unknown> = R extends Ok<any> ? D : R extends Err<infer E> ? UnwrapLiftErr<E> : R

  // biome-ignore lint/suspicious/noExplicitAny: we want any Err here
  export type InferUnwrapLiftErrDefaultValue<R, D = unknown> = R extends Ok<any>
    ? D
    : R extends Err<infer T>
      ? InferUnwrapLiftDefaultValue<T, D>
      : R

  /**
   * Allows to unwrap recursivly a Result Err value
   *
   * @param result - The result to unwrap.
   * @param [defaultValue=unsetDefaultValueSymbol] the default value returned if result is a Success
   *
   * @typeparam T - The value type.
   * @typeparam E - The error type.
   *
   * @throws UnwrapErrFailure If the result is a Success result and the default value is the unset default value (default value
   * is not provided).
   *
   * @returns The value of the result Err.
   */
  export function unwrapLiftErr<T = unknown, E = unknown, D = T>(
    result: Result<T, E> | E,
    defaultValue: InferUnwrapLiftErrDefaultValue<E, D> | typeof unsetDefaultValueSymbol = unsetDefaultValueSymbol,
  ): UnwrapLiftErr<E, D> {
    if (!Result.is(result)) {
      return result as UnwrapLiftErr<E, D>
    }

    if (Result.isErr(result)) {
      return unwrapLiftErr(result.error) as UnwrapLiftErr<E, D>
    }

    if (defaultValue === unsetDefaultValueSymbol) {
      throw Failure.ofNamed(
        UnwrapErrFailure,
        'You are trying to unwrap an Err on a Success without giving any default value.',
      )
    }

    return defaultValue as UnwrapLiftErr<E, D>
  }

  /**
   * A simple helper that represents any function.
   *
   * @typeparam Args - The arguments type.
   * @typeparam Return - The return type.
   */
  // biome-ignore lint/suspicious/noExplicitAny: could be any function here
  type AnyFn = (...args: any[]) => any

  /**
   * Safe wrap a function in a Result.
   *
   * @param fn - The function to safe wrap.
   * @param onError - The function to handle the error.
   *
   * @typeparam T - The value type.
   * @typeparam E - The error type.
   *
   * @returns A new function that wraps the given function in a Result.
   */
  export function safe<Fn extends AnyFn, E = unknown>(fn: Fn, onError?: (error: unknown) => E) {
    return (...args: Parameters<Fn>): Result<ReturnType<Fn>, E> => {
      try {
        const value = fn(...args) as ReturnType<Fn>

        return ok(value)
      } catch (error) {
        if (onError) {
          return err(onError(error))
        }

        return err(error as E)
      }
    }
  }

  /**
   * Safe wrap an asynchronous function in a Result.
   *
   * @param fn - The async function to safe wrap.
   * @param onError - The function to handle the error.
   *
   * @typeparam Fn - The function type.
   * @typeparam E - The error type.
   *
   * @returns A new async function that wraps the given function in a Result.
   */
  export async function asyncSafe<Fn extends AnyFn, E = unknown>(fn: Fn, onError?: (error: unknown) => E) {
    return async (...args: Parameters<Fn>): Promise<Result<Awaited<ReturnType<Fn>>, E>> => {
      try {
        const value = (await Promise.resolve(fn(...args))) as Awaited<ReturnType<Fn>>

        return ok(value)
      } catch (error) {
        if (onError) {
          return err(onError(error))
        }

        return err(error as E)
      }
    }
  }

  /**
   * Infer a the lifted type of an Err insode result Ok
   *
   * @private
   */
  type InferLiftedErrInsideOk<R, D = unknown, InsideOk = false> = R extends Ok<infer S>
    ? InferLiftedErrInsideOk<S, D, InsideOk>
    : R extends Err<infer E>
      ? InferLiftedErr<E, D, false>
      : never

  /**
   * Infer the lifted type of Err
   *
   * @private
   */
  type InferLiftedErr<R, D = unknown, InsideOk = false> = InsideOk extends true
    ? InferLiftedErrInsideOk<R>
    : R extends Ok<infer S>
      ? InferLiftedErr<S, D, true>
      : R extends Err<infer E>
        ? InferLiftedErr<E, D, InsideOk>
        : R

  /**
   * Safe wrap a function in a Result but lift the return type to always
   * return a single Result level
   *
   * @param fn - The function to safe wrap.
   * @param onError - The function to handle the error.
   *
   * @typeparam T - The value type.
   * @typeparam E - The error type.
   *
   * @returns A new function that wraps the given function in a Result.
   */
  export function safeLifted<Fn extends AnyFn, E = InferLiftedErr<ReturnType<Fn>>>(
    fn: Fn,
    onError?: (error: unknown) => E,
  ) {
    return (...args: Parameters<Fn>): Result<UnwrapLift<ReturnType<Fn>>, E> => {
      try {
        const value = fn(...args) as ReturnType<Fn>

        if (Result.is(value)) {
          return ok(Result.unwrapLift(value))
        }

        return ok(value as UnwrapLift<ReturnType<Fn>>)
      } catch (error) {
        if (Result.is(error)) {
          return err(Result.unwrapLiftErr(error) as E)
        }

        if (onError) {
          return err(onError(error))
        }

        return err(error as E)
      }
    }
  }

  /**
   * Safe wrap an asynchronous function in a Result but lift the return type to always
   * return a single Result level.
   *
   * @param fn - The async function to safe wrap.
   * @param onError - The function to handle the error.
   *
   * @typeparam Fn - The function type.
   * @typeparam E - The error type.
   *
   * @returns A new async function that wraps the given function in a lifted Result.
   */
  export async function asyncSafeLifted<Fn extends AnyFn, E = InferLiftedErr<Awaited<ReturnType<Fn>>>>(
    fn: Fn,
    onError?: (error: unknown) => E,
  ) {
    return async (...args: Parameters<Fn>): Promise<Result<UnwrapLift<Awaited<ReturnType<Fn>>>, E>> => {
      try {
        const value = (await Promise.resolve(fn(...args))) as Awaited<ReturnType<Fn>>

        if (Result.is(value)) {
          return ok(Result.unwrapLift(value))
        }

        return ok(value as UnwrapLift<Awaited<ReturnType<Fn>>>)
      } catch (error) {
        if (Result.is(error)) {
          return err(Result.unwrapLiftErr(error) as E)
        }

        if (onError) {
          return err(onError(error))
        }

        return err(error as E)
      }
    }
  }
}
