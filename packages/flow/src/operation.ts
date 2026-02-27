// biome-ignore-all lint/suspicious/noExplicitAny: we have to use any

import { Result } from '@theateros/result'

const OPERATION_SYMBOL: unique symbol = Symbol.for('@theateros/flow/operation')

/**
 * Namespace containing everything related to flow operations.
 *
 * An **operation** is the fundamental building block of a flow. It wraps a
 * plain function and lifts it into a safe, composable unit that:
 * - Catches synchronous and asynchronous errors automatically
 * - Carries its result inside a {@link Result} so errors are explicit
 * - Propagates a services bag (dependency injection) through the pipeline
 *
 * @example
 * ```ts
 * const parseJson = Operation.of((raw: string) => JSON.parse(raw))
 * // parseJson: Operation<string, unknown, unknown>
 * ```
 */
export namespace Operation {
  /**
   * The minimal shape required for a function to be wrapped by an operation.
   *
   * Any single-argument function returning any value (including `Promise`)
   * satisfies this constraint.
   */
  export type Fn = (input: any) => any

  /**
   * Infers the input type of a function type `F`.
   *
   * @typeParam F - A function type extending {@link Fn}
   *
   * @private
   */
  type InferFnInput<F extends Fn> = F extends (arg: infer I) => any ? I : never

  /**
   * Infers the return type of a function type `F`.
   *
   * @typeParam F - A function type extending {@link Fn}
   *
   * @private
   */
  type InferFnOutput<F extends Fn> = F extends (arg: any) => infer R ? R : never

  /**
   * A valid key for a service contract entry.
   *
   * Using a `symbol` is recommended to avoid name collisions between
   * independently developed packages.
   */
  export type ContractId = string | symbol

  /**
   * Maps a set of contract keys `K` to values of type `V`.
   *
   * @typeParam K - The contract identifier(s) — a `string` or `symbol`
   * @typeParam V - The value type stored under each key
   */
  export type ContractRecord<K extends ContractId, V> = Record<K, V>

  /**
   * A {@link ContractRecord} whose values are typed as `unknown`.
   *
   * Used as the upper bound for the `D` type parameter throughout the
   * namespace so that any concrete record is accepted.
   */
  export type UnknownContractRecord = ContractRecord<ContractId, unknown>

  /**
   * A {@link ContractRecord} whose values are typed as `never`.
   *
   * Used as the default for the `D` type parameter, meaning "no services
   * are required" when an operation does not declare dependencies.
   */
  export type NeverContractRecord = ContractRecord<ContractId, never>

  /**
   * The single argument passed to every operation executor.
   *
   * It bundles two concerns together so that an operation can read its input
   * **and** access injected services without relying on closures or globals.
   *
   * @typeParam T - The type of the data payload for this step
   * @typeParam D - The services record made available to the operation;
   *                defaults to {@link NeverContractRecord} (no services)
   *
   * @example
   * ```ts
   * type MyCtx = Operation.Context<string, { db: Database }>
   * // { data: string; services: { db: Database } }
   * ```
   */
  export type Context<T, D extends UnknownContractRecord = NeverContractRecord> = {
    /**
     * The data transmitted to the operation for this pipeline step.
     */
    data: T

    /**
     * Injected services available inside the operation.
     *
     * The shape is defined by the `D` type parameter and is passed through
     * unchanged so downstream operations can access the same services.
     */
    services: D
  }

  /**
   * The internal async function that powers an {@link Operation}.
   *
   * An executor receives a {@link Context} whose `data` is the unwrapped,
   * awaited input, runs the user-supplied logic, and returns a new
   * {@link Context} whose `data` is a {@link Result} wrapping either the
   * successful output or the caught error.
   *
   * @typeParam I - Raw input type (may be a `Promise` or a lifted `Result`)
   * @typeParam O - Raw output type (may be a `Promise` or a lifted `Result`)
   * @typeParam E - Expected error type; defaults to `unknown`
   * @typeParam D - Services record; defaults to {@link NeverContractRecord}
   */
  export type Executor<I, O, E = unknown, D extends UnknownContractRecord = NeverContractRecord> = (
    context: Context<Result.UnwrapLift<Awaited<I>>, D>,
  ) => Promise<Context<Result<Result.UnwrapLift<Awaited<O>>, Result.UnwrapLiftErr<Awaited<E>>>, D>>

  /**
   * An opaque object that represents a single, composable pipeline step.
   *
   * Operations are created with {@link of} and are meant to be chained
   * together into larger flows. The `_type` brand ensures structural
   * type-checking cannot accidentally treat a plain object as an operation.
   *
   * @typeParam I - The input type expected by this operation
   * @typeParam O - The successful output type produced by this operation
   * @typeParam E - The error type this operation may produce; defaults to `unknown`
   * @typeParam D - The services record required by this operation;
   *                defaults to {@link NeverContractRecord}
   */
  export type Operation<I, O, E = unknown, D extends UnknownContractRecord = NeverContractRecord> = {
    /**
     * Brand symbol that uniquely identifies this object as an `Operation`.
     *
     * @internal
     */
    _type: typeof OPERATION_SYMBOL

    /**
     * The underlying async function that executes this operation's logic.
     */
    executor: Executor<I, O, E, D>
  }

  /**
   * Wraps a plain function into an {@link Operation}.
   *
   * The resulting operation:
   * - Automatically awaits `Promise`-returning functions
   * - Unwraps `Result`-returning functions via `Result.unwrapLift`
   * - Catches any thrown error and stores it as `Result.err`
   *
   * @typeParam F  - The function type to wrap; must satisfy {@link Fn}
   * @typeParam E  - Override for the error type when the default `unknown` is
   *                 too broad; defaults to `unknown`
   * @typeParam D  - Services record consumed by the executor context;
   *                 defaults to {@link NeverContractRecord}
   * @typeParam D2 - Services record exposed on the returned `Operation` type;
   *                 defaults to `D` so both sides align by default
   *
   * @param fn - The function to lift into an operation
   * @returns  An {@link Operation} typed with the inferred input/output of `fn`
   *
   * @example
   * ```ts
   * const double = Operation.of((n: number) => n * 2)
   * // double: Operation<number, number>
   *
   * const fetchUser = Operation.of(async (id: string) => {
   *   const res = await fetch(`/users/${id}`)
   *   return res.json() as User
   * })
   * // fetchUser: Operation<string, User>
   * ```
   */
  export function of<
    F extends Fn,
    E = unknown,
    D extends UnknownContractRecord = NeverContractRecord,
    D2 extends UnknownContractRecord = D,
  >(fn: F): Operation<InferFnInput<F>, InferFnOutput<F>, E, D2> {
    const executor = async (context: Context<InferFnInput<F>, D>) => {
      try {
        return {
          data: Result.ok(Result.unwrapLift(await Promise.resolve(fn(context.data)))),
          services: context.services,
        }
      } catch (e) {
        return {
          data: Result.err(Result.unwrapLiftErr(await Promise.resolve(e))),
          services: context.services,
        }
      }
    }

    return {
      _type: OPERATION_SYMBOL,
      executor: executor as unknown as Executor<InferFnInput<F>, InferFnOutput<F>, E, D2>,
    }
  }
}
