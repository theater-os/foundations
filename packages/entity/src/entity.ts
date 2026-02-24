import type { StandardSchemaV1 } from '@standard-schema/spec'
import { Failure } from '@theateros/failure'
import { Result } from '@theateros/result'

/**
 * Symbol used to identify a branded type
 *
 * @private
 */
const BRANDED_SYMBOL = Symbol.for('@theateros/entity/brand')

/**
 * The entity namespace contains every types and functions used to manipulate
 * your core entities.
 */
export namespace Entity {
  /**
   * Shape of an entity identifier. Since every entity must be a unique data
   * that your domain manipulate, we need to attach them an identifier.
   */
  export type ID = string | symbol

  /**
   * Failure returned when a branded data can not be cloned
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types
   */
  export class DataCloneFailure extends Failure.named('@theateros/entity/data-clone-failure') {}

  /**
   * Shape of a branded type, this is usefull to ensure that functions or any
   * part of your code is receiving the right data, built with the right
   * factory.
   */
  export type Branded<T> = T & { [BRANDED_SYMBOL]: ID }

  /**
   * Creates a branded data
   */
  export function branded<T>(data: T, id: ID): Result<Branded<T>, DataCloneFailure> {
    // first we try the immutable way
    try {
      const newData = structuredClone(data)

      // biome-ignore lint/suspicious: any is fine here
      ;(newData as any)[BRANDED_SYMBOL] = id

      return Result.ok(newData as unknown as Branded<T>)
    } catch (err) {
      return Result.err(
        Failure.ofNamed(DataCloneFailure, 'unable to clone the given branded data', {
          cause: err,
        }),
      )
    }
  }

  /**
   * Test if a given data is a branded type
   */
  export function isBranded<T>(data: T, id: ID): data is Branded<T> {
    // biome-ignore lint/suspicious: any is ok here
    const brand = (data as any)[BRANDED_SYMBOL]

    return brand && brand === id
  }

  /**
   * Infer your entity type
   */
  // biome-ignore lint/suspicious: any is mandatory here
  export type Infer<F extends EntityFactory<any, any, Record<string, any>>> = Branded<
    StandardSchemaV1.InferOutput<F['schema']>
  >

  /**
   * This failure is returned when something unexcpected happens during an
   * entity creation. Not a validation failure but something else that prevents
   * the entity and there issues to be returned
   */
  export class UnexpectedFailure extends Failure.named('@theateros/entity/unexpected-failure') {}

  /**
   * This failure happens when an entity has some validation failures. You
   * can retrieve the issues by checking the failure options.
   */
  export class InvalidEntityFailure extends Failure.named<
    '@theateros/entity/invalid-entity-failure',
    ErrorOptions & { issues: StandardSchemaV1.Issue[] }
  >('@theateros/entity/invalid-entity-failure') {}

  /**
   * Payload sent to the entity factory maker in order to creates an entity.
   *
   * @typeparam I - The schema input
   * @typeparam O - The schema output
   * @typeparam R - Additional data (mostly constructor) that your factory will
   *                contains
   */
  export type EntityCreationPayload<I, O, R extends Record<string, unknown> = Record<never, never>> = {
    /**
     * The unique identifier used to identified an entity in your
     * core domain.
     */
    id: ID

    /**
     * A schema used to validate your domain entity. It is based on the
     * @standard-shema/spec that is used by most of the schema library
     * released today. Feel free to plug your favourite schema library.
     */
    schema: StandardSchemaV1<I, O>
  } & R

  /**
   * This is your factory function that will allows you create safely your
   * domain entity.
   *
   * @typeparam I - The schema input
   * @typeparam O - The schema output
   * @typeparam R - Additional data (mostly constructor) that your factory will
   *                contains
   */
  export type EntityFactory<I, O, R extends Record<string, unknown> = Record<string, never>> = {
    (data: unknown): Promise<Result<Branded<O>, UnexpectedFailure | InvalidEntityFailure | DataCloneFailure>>

    /**
     * Your entity identifier
     */
    id: ID

    /**
     * The schema used to validate your entity
     */
    schema: StandardSchemaV1<I, O>
  } & R

  /**
   * Creates an entity factory that you can use in your domain without any
   * headache.
   *
   * @example
   *
   *
   * @typeparam I - The schema input
   * @typeparam O - The schema output
   * @typeparam R - Additional data (mostly constructor) that your factory will
   *                contains
   */
  export function of<I, O, R extends Record<string, unknown> = Record<string, never>>({
    id,
    schema,
    ...rests
  }: EntityCreationPayload<I, O, R>): EntityFactory<I, O, R> {
    const factory = async (value: unknown, options?: StandardSchemaV1.Options) => {
      try {
        const result = await Promise.resolve(schema['~standard'].validate(value, options))

        if (result.issues === undefined) {
          return branded(result.value, id)
        }

        return Result.err(
          Failure.ofNamed(InvalidEntityFailure, `Invalid entity: ${String(id)}`, {
            issues: [...result.issues],
          }),
        )
      } catch (error) {
        return Result.err(
          Failure.ofNamed(UnexpectedFailure, 'Unexpected failure during entity creation', {
            cause: error,
          }),
        )
      }
    }

    factory.id = id
    factory.schema = schema

    for (const [key, value] of Object.entries(rests as unknown as R)) {
      // biome-ignore lint/suspicious: any is ok here
      ;(factory as any)[key] = value
    }

    return factory as EntityFactory<I, O, R>
  }
}
