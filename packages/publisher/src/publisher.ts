import { Result } from '@theateros/result'

/**
 * Symbol used to identify a Publisher instance.
 */
const PUBLISHER_ID: unique symbol = Symbol.for('@theateros/publisher')

/**
 * Symbol used to identify the default topic for a Publisher instance.
 */
const DEFAULT_TOPIC_ID: unique symbol = Symbol.for('@theateros/publisher/default-topic')

/**
 * Shape of a Publisher instance
 */
export type Publisher<T = undefined> = {
  /**
   * A unique type identifier for Publisher instances,
   * used for type checking and validation.
   */
  _type: typeof PUBLISHER_ID

  /**
   * A map of topics to their respective sets of subscribers.
   */
  topics: Map<Publisher.Topic, Set<Publisher.Subscriber<T>>>
}

/**
 * Namespace containing all types and functions related to the Publisher pattern.
 */
export namespace Publisher {
  /**
   * Shape of a topic used to classify subscribers. Can be a string or a symbol.
   */
  export type Topic = string | symbol

  /**
   * A util type that represent both T and Promise of T
   */
  export type Promisable<T> = T | Promise<T>

  /**
   * Shape of a subscriber function.
   * If T is undefined, the subscriber is a function that takes no arguments.
   */
  export type Subscriber<T> = [undefined] extends [T] ? () => Promisable<void> : (data: T) => Promisable<void>

  /**
   * Shape of an unsubscribe function, returned by the subscribe method,
   * used to remove a subscriber from a topic.
   */
  export type Unsubscribe = () => void

  /**
   * A map of topics and array of their subscriber results,
   * used as the return type for publish methods.
   */
  export type ResultMap<E> = {
    [key in Topic]?: Array<Result<void, E>>
  }

  /**
   * @private
   */
  type Publish = {
    (publisher: Publisher<undefined> | Publisher<void>): Promise<Result<ResultMap<never>, ResultMap<unknown>>>
    <T>(publisher: Publisher<T>, data: T): Promise<Result<ResultMap<never>, ResultMap<unknown>>>
  }

  /**
   * @private
   */
  type PublishTo = {
    (publisher: Publisher<undefined>, topic: Topic): Promise<Result<ResultMap<never>, ResultMap<unknown>>>
    <T>(publisher: Publisher<T>, topic: Topic, data: T): Promise<Result<ResultMap<never>, ResultMap<unknown>>>
  }

  /**
   * Allows to create a new publisher instance
   */
  export function of<T = undefined>(): Publisher<T> {
    const topics = new Map()

    topics.set(DEFAULT_TOPIC_ID, new Set())

    return {
      _type: PUBLISHER_ID,
      topics,
    }
  }

  /**
   * @private
   * @see publishTo
   */
  async function _publishTo<T>(
    publisher: Publisher<T>,
    topic: Topic,
    data?: T,
  ): Promise<Result<ResultMap<never>, ResultMap<unknown>>> {
    let hasError = false
    const resultMap: ResultMap<unknown> = { [topic]: [] }

    const subscribers = publisher.topics.get(topic)

    if (!subscribers || subscribers.size === 0) {
      return Result.ok(resultMap as ResultMap<never>)
    }

    for (const subscriber of subscribers) {
      try {
        // biome-ignore lint/style: we known that data is defined
        await Promise.resolve(subscriber(data!))

        // biome-ignore lint/style: we known that resultMap exists
        resultMap[topic]!.push(Result.ok(undefined))
      } catch (error) {
        // biome-ignore lint/style: we known that resultMap exists
        resultMap[topic]!.push(Result.err(error as unknown))
        hasError = true
      }
    }

    if (hasError) {
      return Result.err(resultMap)
    }

    return Result.ok(resultMap as ResultMap<never>)
  }

  /**
   * @private
   * @see publish
   */
  async function _publish<T>(publisher: Publisher<T>, data?: T): Promise<Result<ResultMap<never>, ResultMap<unknown>>> {
    let hasError = false
    let resultMap = {}

    for (const topic of publisher.topics.keys()) {
      const result = await _publishTo(publisher, topic, data)

      if (Result.isErr(result)) {
        hasError = true
        resultMap = { ...resultMap, ...result.error }
      }

      if (Result.isOk(result)) {
        resultMap = { ...resultMap, ...result.value }
      }
    }

    if (hasError) {
      return Result.err(resultMap)
    }

    return Result.ok(resultMap as ResultMap<never>)
  }

  /**
   * Publishes data to all subscribers and topics of the given Publisher
   * instance. It returns a Result of a map of topics and
   * their respective arrays of subscriber results.
   *
   * Note that if any subscriber throws durring the publish process,
   * the publish will not fail, but the result will be a Result.err containing
   * the map of topics and their respective arrays of subscriber results.
   */
  // biome-ignore lint/suspicious: any is fine here inference is done in the type
  export const publish: Publish = _publish as any

  /**
   * Publishes data to all subscribers of a specific topic of the given Publisher
   * instance. It returns a Result of an array of subscriber results for the
   * given topic.
   *
   * Note that if any subscriber throws durring the publish process,
   * the publish will not fail, but the result will be a Result.err containing
   * the array of subscriber results for the given topic.
   */
  // biome-ignore lint/suspicious: any is fine here inference is done in the type
  export const publishTo: PublishTo = _publishTo as any

  /**
   * Attach a subscriber to a specificic topic of a Publisher instance. It
   * returns an unsubscribe function that can be called to
   * remove the subscriber from the topic.
   */
  export function subscribe<T>(
    publisher: Publisher<T>,
    subscriber: Subscriber<T>,
    topic: Topic = DEFAULT_TOPIC_ID,
  ): Unsubscribe {
    let subscribers = publisher.topics.get(topic)

    if (!subscribers) {
      subscribers = new Set()

      publisher.topics.set(topic, subscribers)
    }

    subscribers.add(subscriber)

    return () => {
      // biome-ignore lint/style: we know that subscribers exists
      subscribers!.delete(subscriber)

      // biome-ignore lint/style: we know that subscribers exists
      if (subscribers!.size === 0) {
        publisher.topics.delete(topic)
      }
    }
  }

  /**
   * Type guard to check if a value is a Publisher instance.
   */
  export function is(value: unknown): value is Publisher {
    return typeof value === 'object' && value !== null && '_type' in value && value._type === PUBLISHER_ID
  }
}
