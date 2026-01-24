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
}
