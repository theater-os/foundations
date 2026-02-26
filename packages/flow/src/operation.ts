// biome-ignore-all lint/suspicious/noExplicitAny: we want to use any
import { Result } from '@theateros/result'
import { Contract } from './contract'
import { AwaitedResult } from './types'
import { Failure } from '@theateros/failure'

/**
 * Contains everything concerning a flow "operation". Operation are functions
 * that are always safe, no matter promise or result return. They also accept
 * special contract.
 */
export namespace Operation {
  /**
   * A payload if the first and only argument sent to an opeation
   * function
   */
  export type Payload<Success, Err, Contracts extends Contract.UnknownCollection = Contract.NeverCollection> = {
    /**
     * That data that an operation will treat
     */
    data: Result<Success, Err>

    /**
     * The available services for this operation
     */
    services: Contracts
  }

  /**
   * This represent any possible payload
   */
  export type AnyPayload = Payload<any, any, any>

  /**
   * This failure is rised when a runtime error happens during an operation
   */
  export const RuntimeFailure = Failure.named('@theateros/flow/operation-failure')

  /**
   * Represent an operation function
   */
  export type Fn<Success, Err, Output, Contracts extends Contract.UnknownCollection = Contract.NeverCollection> = (
    args: Payload<Success, Err, Contracts>,
  ) => Output

  /**
   * Represent any fn that can pass to an operation
   */
  export type AnyFn = Fn<any, any, any, any>

  /**
   * Represent a safe operation
   */
  export type Operation<
    Success,
    Err,
    Output,
    Contracts extends Contract.UnknownCollection = Contract.NeverCollection,
  > = (args: Payload<Success, Err, Contracts>) => Promise<Payload<Output, Err, Contracts>>

  /**
   * Creates an operation, safe from any error and supporting promises and result
   */
  export function of<Success, Err, Output, Contracts extends Contract.UnknownCollection = Contract.NeverCollection>(
    fn: Fn<Success, Err, Output, Contracts>,
  ): Operation<Success, Err, Output, Contracts> {
    return (async (payload: Payload<Success, Err, Contracts>) => {
      try {
        const result = await Promise.resolve(fn(payload))

        if (Result.is(result)) {
          return {
            ...payload,
            data: result,
          }
        }

        return {
          ...payload,
          data: Result.ok(result),
        }
      } catch (err) {
        return {
          ...payload,
          data: Result.err(
            Failure.ofNamed(RuntimeFailure, 'An error happens during an operation', {
              cause: err,
            }),
          ),
        }
      }
    }) as Operation<Success, Err, Output, Contracts>
  }
}

const johnPayload = {
  data: Result.ok('john'),
  services: {},
}

const test = Operation.of((payload: typeof johnPayload) => {
  if (!Result.isOk(payload.data)) {
    return payload
  }

  return Result.ok(payload.data.value.toUpperCase())
})

test(johnPayload)
