// biome-ignore-all lint/suspicious/noExplicitAny: we have to use any

import { Result } from '@theateros/result'

const OPERATION_SYMBOL: unique symbol = Symbol.for('@theateros/flow/operation')

/**
 * namespace containing everything about flow's operations
 */
export namespace Operation {
  /**
   * This is the shape of an operation function
   */
  export type Fn = (input: any) => any

  /**
   * Infer a function input
   *
   * @private
   */
  type InferFnInput<F extends Fn> = F extends (arg: infer I) => any ? I : never

  /**
   * Infer a function output
   *
   * @private
   */
  type InferFnOutput<F extends Fn> = F extends (arg: any) => infer R ? R : never

  /**
   * This represent an identifier used to identify a given
   * contract
   */
  export type ContractId = string | symbol

  /**
   * Shape of a contract record
   */
  export type ContractRecord<K extends ContractId, V> = Record<K, V>

  /**
   * Represent an unknown contract record
   */
  export type UnknownContractRecord = ContractRecord<ContractId, unknown>

  /**
   * Represent a never contract record
   */
  export type NeverContractRecord = ContractRecord<ContractId, never>

  /**
   * The context is the only argument sent to an operation. It allows operations
   * to used a given inputs and provided services
   */
  export type Context<T, D extends UnknownContractRecord = NeverContractRecord> = {
    /**
     * The data transmit to the operation
     */
    data: T

    /**
     * The services provided in the operations
     */
    services: D
  }

  export type Executor<I, O, E = unknown, D extends UnknownContractRecord = NeverContractRecord> = (
    context: Context<Result.UnwrapLift<Awaited<I>>, D>,
  ) => Promise<Context<Result<Result.UnwrapLift<Awaited<O>>, Result.UnwrapLiftErr<Awaited<E>>>, D>>

  /**
   * This is the shape of an operation object used to represent anything
   * safely in an code base.
   */
  export type Operation<I, O, E = unknown, D extends UnknownContractRecord = NeverContractRecord> = {
    /**
     * A unique identifier used to identify an operation
     */
    _type: typeof OPERATION_SYMBOL

    /**
     * The executor of the operation
     */
    executor: Executor<I, O, E, D>
  }

  /**
   * Creates a new operation
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
