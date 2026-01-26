import { Failure } from '@theateros/failure'
import { Result } from '@theateros/result'

/**
 * The abortion API of the Futur. It is used to abort the Futur operation.
 */
export type FuturAbortion = Readonly<{
  /**
   * Abort the Futur operation.
   */
  abort: () => void

  /**
   * Check if the Futur operation has been aborted.
   */
  isAborted: () => boolean

  /**
   * Add a callback to the abort controllers of a futur operation.
   */
  onAbort: (callback: () => void) => () => void

  /**
   * The abort controller to pass down to the Futur runner. Or other
   * promises that need to be aborted.
   */
  controller: AbortController
}>

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
   * The abort API of the Futur. It is used to abort the Futur operation.
   */
  abortion: FuturAbortion
}

/**
 * The runner function of the Futur. It is the function that will be used to resolve or reject the Futur.
 * It is called by the Futur instance to resolve or reject the Futur.
 *
 * @param payload - The payload of the Futur runner.
 */
export type FuturRunner = (payload: FuturPayload) => void

/**
 * The failure class for aborted futures.
 */
export class AbortedFailure extends Failure.named('AbortedFailure') {}

/**
 * The Futur class. It is a PromiseLike that can be used to resolve or reject the Futur.
 * It is used to wrap a function that can be resolved or rejected with a value or a reason.
 *
 * @typeparam T - The value type.
 * @typeparam E - The error type.
 */
export class Futur<T, E> implements PromiseLike<Result<T, E | AbortedFailure>> {
  private readonly abortControllers: Set<AbortController>

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

  constructor(private readonly runner: FuturRunner) {
    this.abortControllers = new Set()
  }

  /**
   * Run and convert the Futur to a Promise.
   *
   * @typeparam TResult1 - The result type.
   * @param onfulfilled - The function to call when the Futur is resolved.
   *
   * @returns The result of the Futur.
   */
  // biome-ignore lint/suspicious/noThenProperty: we need to return a PromiseLike
  async then<TResult1 = Result<T, E | AbortedFailure>>(
    onfulfilled?: ((value: Result<T, E | AbortedFailure>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
  ): Promise<TResult1> {
    const abortController = new AbortController()

    this.abortControllers.add(abortController)

    const abortion: FuturAbortion = {
      abort: () => this.abort(),
      isAborted: () => this.aborted,
      onAbort: (callback: () => void) => this.onAbort(callback),
      controller: abortController,
    }

    try {
      const p = new Promise((resolve, reject) => {
        abortController.signal.addEventListener('abort', () => {
          try {
            reject(Failure.ofNamed(AbortedFailure, 'Futur has been aborted'))
          } catch {}
        })

        this.runner({
          resolve,
          reject,
          abortion,
        })
      })

      const data = await p
      const result = Result.is(data) ? (data as Result<T, E>) : Result.ok(data as T)

      return onfulfilled ? (onfulfilled(result) as TResult1) : (result as TResult1)
    } catch (error) {
      const result = Result.err(error) as Result<T, E>

      return onfulfilled ? (onfulfilled(result) as TResult1) : (result as TResult1)
    } finally {
      this.abortControllers.delete(abortController)
    }
  }

  /**
   * Abort all the abort controllers of a futur operation.
   */
  abort(): void {
    for (const abortController of this.abortControllers) {
      abortController.abort()
    }
  }

  /**
   * Check if the futur operation has been aborted.
   */
  get aborted(): boolean {
    if (this.abortControllers.size === 0) {
      return false
    }

    return Array.from(this.abortControllers).some(abortController => abortController.signal.aborted)
  }

  /**
   * Add a callback to the abort controllers of a futur operation.
   *
   * @param callback - The callback to add to the abort controllers.
   *
   * @returns A function to remove the callback from the abort controllers.
   */
  onAbort(callback: () => void): () => void {
    for (const abortController of this.abortControllers) {
      abortController.signal.addEventListener('abort', callback)
    }

    return () => {
      for (const abortController of this.abortControllers) {
        abortController.signal.removeEventListener('abort', callback)
      }
    }
  }
}
