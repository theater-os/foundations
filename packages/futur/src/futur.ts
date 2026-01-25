import { Result } from '@theateros/result'

/**
 * The payload of the Futur runner. It is sent through the runner function to the Futur instance.
 * Like a Promise, the Futur instance is a PromiseLike, so it can be used with the then method.
 */
export type FuturPayload = {
  /**
   * The function to resolve the Futur with a value.
   *
   * @param value - The value to resolve the Futur with.
   */
  resolve: <V>(value: V) => void

  /**
   * The function to reject the Futur with a reason.
   *
   * @param reason - The reason to reject the Futur with.
   */
  reject: <E>(reason: E) => void

  /**
   * The abort controller to abort the Futur.
   */
  abortController: AbortController
}

/**
 * The runner function of the Futur. It is the function that will be used to resolve or reject the Futur.
 * It is called by the Futur instance to resolve or reject the Futur.
 *
 * @param payload - The payload of the Futur runner.
 */
export type FuturRunner = (payload: FuturPayload) => void

/**
 * The Futur class. It is a PromiseLike that can be used to resolve or reject the Futur.
 * It is used to wrap a function that can be resolved or rejected with a value or a reason.
 *
 * @typeparam T - The value type.
 * @typeparam E - The error type.
 */
export class Futur<T, E> implements PromiseLike<Result<T, E>> {
  /**
   * Create a new Futur instance from a runner function.
   *
   * @param runner - The runner function to create a Futur instance.
   * @returns A new Futur instance.
   */
  static of<T, E>(runner: FuturRunner): Futur<T, E> {
    return new Futur<T, E>(runner)
  }

  /**
   * Create a new Futur instance from a promise launcher function.
   *
   * @param launcher - The function to launch the promise.
   * @returns A new Futur instance.
   */
  static ofPromise<P extends Promise<unknown>, E = unknown>(
    launcher: () => P,
    catcher?: (error: unknown) => E,
  ): Futur<Awaited<P>, E> {
    return new Futur<Awaited<P>, E>(({ resolve, reject }) => {
      launcher()
        .then(resolve)
        .catch(error => {
          if (catcher) {
            reject(catcher(error))

            return
          }

          reject(error)
        })
    })
  }

  constructor(private readonly runner: FuturRunner) {}

  /**
   * Run and convert the Futur to a Promise.
   *
   * @typeparam TResult1 - The result type.
   * @param onfulfilled - The function to call when the Futur is resolved.
   *
   * @returns The result of the Futur.
   */
  // biome-ignore lint/suspicious/noThenProperty: we need to return a PromiseLike
  async then<TResult1 = Result<T, E>>(
    onfulfilled?: ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
  ): Promise<TResult1> {
    try {
      const abortController = new AbortController()

      const p = new Promise((resolve, reject) => {
        this.runner({
          resolve,
          reject,
          abortController,
        })
      })

      const data = await p
      const result = Result.is(data) ? (data as Result<T, E>) : Result.ok(data as T)

      return onfulfilled ? (onfulfilled(result) as TResult1) : (result as TResult1)
    } catch (error) {
      const result = Result.err(error) as Result<T, E>

      return onfulfilled ? (onfulfilled(result) as TResult1) : (result as TResult1)
    }
  }
}
