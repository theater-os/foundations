// biome-ignore-all lint/suspicious/noExplicitAny: we want to use any
import type { Result } from '@theateros/result'

export type UnwrapSuccess<R> = R extends Result<infer S, any> ? UnwrapSuccess<S> : R

export type UnwrapErr<R> = R extends Result<any, infer E> ? UnwrapErr<E> : R

export type InferSuccess<R> = UnwrapSuccess<Awaited<R>>

export type InferErr<R> = UnwrapErr<Awaited<R>>

export type SafeWrap<R, E = unknown> = Awaited<R> extends Result<any, any> ? Awaited<R> : Result<Awaited<R>, Awaited<E>>

export namespace Flow {
  export type DependencyId = string | symbol

  export type UnknownDependencyRecord = Record<DependencyId, unknown>

  export type NeverDependencyRecord = Record<DependencyId, never>

  export type AnyDependencyRecord = Record<DependencyId, any>

  export type IsEmptyDependencyRecord<D extends AnyDependencyRecord> =
    D extends Record<any, infer E>
      ? unknown extends E
        ? true
        : undefined extends E
          ? true
          : never extends E
            ? true
            : false
      : never

  export type Payload<T, E, D extends UnknownDependencyRecord = NeverDependencyRecord> = {
    data: Result<InferSuccess<T>, InferErr<E>>
    deps: D
  }

  export type UnknownPayload = Payload<unknown, unknown, AnyDependencyRecord>

  export type AnyPayload = Payload<any, any, AnyDependencyRecord>

  export type InferPayloadFromResult<
    R extends Result<any, any>,
    D extends UnknownDependencyRecord = NeverDependencyRecord,
  > = R extends Result<infer S, infer E> ? Payload<S, E, D> : never

  export type Operation<S, E, O, D extends UnknownDependencyRecord = NeverDependencyRecord> = (
    payload: Payload<S, E, D>,
  ) => O

  export type UnknownOperation = Operation<unknown, unknown, unknown, UnknownDependencyRecord>

  export type AnyOperation = Operation<any, any, any, AnyDependencyRecord>

  export type InferDependencyRecordFromOperation<O extends AnyOperation> =
    O extends Operation<any, any, any, infer D> ? D : never

  export type SafeOperation<S, E, O, D extends UnknownDependencyRecord = NeverDependencyRecord> = (
    payload: Payload<S, E, D>,
  ) => Promise<Payload<O, E, D>>

  export type WrapSafeOperation<O extends AnyOperation> =
    O extends Operation<infer S, infer E, infer O, infer D> ? SafeOperation<S, E, O, D> : never

  export type AnyOperationSuit = AnyOperation[]

  export type BuildSafeOperationSuit<Ops extends AnyOperationSuit> = Ops extends [infer Op, ...infer RestOps]
    ? Op extends AnyOperation
      ? RestOps extends AnyOperationSuit
        ? [WrapSafeOperation<Op>, ...BuildSafeOperationSuit<RestOps>]
        : never
      : never
    : Ops extends [infer Op]
      ? Op extends AnyOperation
        ? [WrapSafeOperation<Op>]
        : never
      : never

  export type Execute<
    O,
    D extends UnknownDependencyRecord = NeverDependencyRecord,
  > = true extends IsEmptyDependencyRecord<D> ? () => Promise<O> : (deps: D) => Promise<O>

  export type Process<O, D extends UnknownDependencyRecord = NeverDependencyRecord> = {
    execute: Execute<O, D>
  }
}
