/**
 * Represent a domain specific error. It extends the native Error class and add
 * a few properties to help with error handling.
 */
export class Failure<O extends ErrorOptions = ErrorOptions> extends Error {
  /**
   * Create a named failure class. This is useful to create a new failure class
   * without having to extend the Failure class.
   *
   * @param name - The name of the failure.
   * @returns A new failure class.
   */
  static named<N extends string, O2 extends ErrorOptions = ErrorOptions>(
    name: N,
  ): new (
    message: string,
    options?: O2,
  ) => Failure<O2> {
    return class NamedFailure extends Failure<O2> {
      constructor(message: string, options?: O2) {
        super(message, options)
        this.name = name
      }
    }
  }

  /**
   * Create a new failure instance. This is a simple shortcut to create a new failure instance.
   *
   * @param message - The message of the failure.
   * @param options - The options of the failure.
   *
   * @returns A new failure instance.
   */
  static of<O2 extends ErrorOptions = ErrorOptions>(message: string, options?: O2): Failure<O2> {
    return new Failure(message, options)
  }

  /**
   * Create a new failure instance from a named failure class. This is a simple shortcut to create
   * a new failure instance without having to instantiate a new class.
   *
   * @param failure - The failure class to create an instance of.
   * @param message - The message of the failure.
   * @param options - The options of the failure.
   *
   * @returns A new failure instance.
   */
  static ofNamed<N extends string, O2 extends ErrorOptions = ErrorOptions>(
    failure: ReturnType<typeof Failure.named<N, O2>>,
    message: string,
    options?: O2,
  ): InstanceType<ReturnType<typeof Failure.named<N, O2>>> {
    return new failure(message, options)
  }

  /**
   * Test if the given error is a failure.
   *
   * @param error - The error to check.
   *
   * @returns True if the error is a failure, false otherwise.
   */
  static is<O extends ErrorOptions = ErrorOptions>(error: unknown): error is Failure<O> {
    return error instanceof Failure
  }

  /**
   * Test if the given error is a named failure.
   *
   * @param error - The error to check.
   * @param name - The name of the failure.
   *
   * @returns True if the error is a named failure, false otherwise.
   */
  static isNamed<N extends string, O extends ErrorOptions = ErrorOptions>(
    error: unknown,
    name: N,
  ): error is InstanceType<ReturnType<typeof Failure.named<N, O>>> {
    return error instanceof Failure && error.name === name
  }

  /**
   * Panic with the given error. This is a simple shortcut to throw the error but in a
   * more functional way.
   *
   * @param error - The error to panic with.
   *
   * @throws The given error.
   */
  static panic<E extends Error>(error: E): never {
    throw error
  }

  constructor(
    message: string,
    public readonly options?: O,
  ) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    this.name = 'Failure'
    this.cause = options?.cause
  }
}
