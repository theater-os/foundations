import { Failure } from '@theateros/failure'
import { Result } from '@theateros/result'

const publisherSymbol: unique symbol = Symbol.for('@theateros/publisher/publisher')
const syncPublisherSymbol: unique symbol = Symbol.for('@theateros/publisher/sync')
const publishNothingSymbol: unique symbol = Symbol.for('@theateros/publisher/publish-nothing')
const publishSomeSymbol: unique symbol = Symbol.for('@theateros/publisher/publish-some')
const defaultTopic: Publisher.Topic = Symbol.for('@theateros/publisher/default-topic')

/**
 * The Publisher type is used to create a publisher that allows us to subscribe
 * to a topic and publish values to it.
 *
 * @typeparam T - The type of the value to publish. If `undefined`, the publisher
 *                will not transport any value.
 */
export type Publisher<T = undefined> = {
  /**
   * The type of the publisher. Allows us to brand the type of the publisher and ensure that
   * that is comming from the @theateros/publisher package.
   */
  _type: typeof publisherSymbol

  /**
   * The kind of the publisher. Allows us to brand the kind of the publisher and ensure that
   * that is comming from the @theateros/publisher package.
   */
  _kind: typeof syncPublisherSymbol

  /**
   * The topics is used to store the subscriber functions for each topic of a
   * publisher.
   */
  topics: Map<Publisher.Topic, Set<Publisher.Subscriber<T>>>
}

export namespace Publisher {
  /**
   * The error type is used to represent an error that occurs when publishing a value to a subscriber.
   */
  export class PublishFailure extends Failure {}

  /**
   * This type is used to represent a publish result when there is no subscriber
   * that has been called during the publishing process.
   */
  export type Nothing = {
    /**
     * The type of the publisher. Allows us to brand the type of the publisher and ensure that
     * that is comming from the @theateros/publisher package.
     */
    _type: typeof publisherSymbol

    /**
     * The kind of the publisher. Allows us to brand the kind of the publisher and ensure that
     * that is comming from the @theateros/publisher package.
     */
    _kind: typeof publishNothingSymbol
  }

  /**
   * This type is used to represent a publish result when at least one subscriber
   * has been called during the publishing process.
   */
  export type Some = {
    /**
     * The type of the publisher. Allows us to brand the type of the publisher and ensure that
     * that is comming from the @theateros/publisher package.
     */
    _type: typeof publisherSymbol

    /**
     * The kind of the publisher. Allows us to brand the kind of the publisher and ensure that
     * that is comming from the @theateros/publisher package.
     */
    _kind: typeof publishSomeSymbol

    /**
     * The number of subscribers that have been called during the publishing process.
     */
    count: number
  }

  /**
   * A topic is a string or symbol that identifies a topic.
   */
  export type Topic = string | symbol

  /**
   * The Subscriber type is used to subscribe to a publisher.
   *
   * @typeparam T - The type of the value to subscribe to. If `undefined`, the subscriber
   *                will not receive any value.
   */
  export type Subscriber<T = undefined> = [undefined] extends [T] ? () => void : (value: T) => void

  export type GuessValueParameter<T = undefined> = [undefined] extends [T] ? [] : [T]

  /**
   * Creates a new synchronous publisher instance.
   *
   * @typeparam T - The type of the value to publish. If `undefined`, the publisher
   *                will not transport any value.
   *
   * @returns A new sync publisher instance.
   */
  export function of<T = undefined>(): Publisher<T> {
    const subscribers = new Map<Publisher.Topic, Set<Publisher.Subscriber<T>>>()
    subscribers.set(defaultTopic, new Set())

    return {
      _type: publisherSymbol,
      _kind: syncPublisherSymbol,
      topics: subscribers,
    }
  }

  /**
   * Creates a new publish nothing instance.
   *
   * @returns A new publish nothing instance.
   */
  export function nothing(): Nothing {
    return {
      _type: publisherSymbol,
      _kind: publishNothingSymbol,
    }
  }

  /**
   * Creates a new publish some instance.
   *
   * @param count - The number of subscribers that have been called during the publishing process.
   *
   * @returns A new publish some instance.
   */
  export function some(count: number): Some {
    return {
      _type: publisherSymbol,
      _kind: publishSomeSymbol,
      count,
    }
  }

  /**
   * Publishes a value to all subscribers of the publisher in all topics.
   *
   * @typeparam T - The type of the value to publish. If `undefined`, the publisher
   *                will not transport any value.
   *
   * @param publisher - The publisher to publish the value to.
   * @param value - The value to publish.
   *
   * @returns A result that is either a `PublishNothing` or a `PublishSome` depending on
   *          whether at least one subscriber has been called during the publishing process.
   */
  export function publish<T = undefined>(
    publisher: Publisher<T>,
    ...values: Publisher.GuessValueParameter<T>
  ): Result<Nothing | Some, PublishFailure> {
    let count = 0

    for (const [topic, subscribers] of publisher.topics.entries()) {
      for (const subscriber of subscribers) {
        try {
          subscriber(...(values as [T]))
          count++
        } catch (error) {
          return Result.err(
            Failure.ofNamed(PublishFailure, `Failed to publish value to subscriber of topic ${String(topic)}`, {
              cause: error,
            }),
          )
        }
      }
    }

    return Result.ok(count > 0 ? some(count) : nothing())
  }

  /**
   * Publishes a value to all subscribers of the publisher in the given topic.
   *
   * @param publisher - The publisher to publish the value to.
   * @param topic - The topic to publish the value to.
   * @param value - The value to publish.
   *
   * @typeparam T - The type of the value to publish. If `undefined`, the publisher
   *                will not transport any value.
   *
   * @returns A result that is either a `PublishNothing` or a `PublishSome` depending on
   *          whether at least one subscriber has been called during the publishing process.
   */
  export function publishTo<T = undefined>(
    publisher: Publisher<T>,
    topic: Publisher.Topic,
    ...values: Publisher.GuessValueParameter<T>
  ): Result<Nothing | Some, PublishFailure> {
    const subscribers = publisher.topics.get(topic)

    if (!subscribers) {
      return Result.ok(nothing())
    }

    let count = 0

    for (const subscriber of subscribers) {
      try {
        subscriber(...(values as [T]))
        count++
      } catch (error) {
        return Result.err(
          Failure.ofNamed(PublishFailure, `Failed to publish value to subscriber of topic ${String(topic)}`, {
            cause: error,
          }),
        )
      }
    }

    return Result.ok(count > 0 ? some(count) : nothing())
  }

  /**
   * Subscribes a subscriber to all topics of a publisher.
   *
   * @param publisher - The publisher to subscribe to.
   * @param subscriber - The subscriber to add.
   *
   * @typeparam T - The type of the value to subscribe to. If `undefined`, the subscriber
   *                will not receive any value.
   *
   * @returns A function to unsubscribe the subscriber from all topics.
   */
  export function subscribe<T = undefined>(publisher: Publisher<T>, subscriber: Publisher.Subscriber<T>): () => void {
    for (const [_, subscribers] of publisher.topics.entries()) {
      subscribers.add(subscriber)
    }

    return () => {
      for (const [_, subscribers] of publisher.topics.entries()) {
        subscribers.delete(subscriber)
      }
    }
  }

  /**
   * Subscribes a subscriber to a specific topic of a publisher.
   *
   * @param publisher - The publisher to subscribe to.
   * @param topic - The topic to subscribe to.
   * @param subscriber - The subscriber to add.
   *
   * @typeparam T - The type of the value to subscribe to. If `undefined`, the subscriber
   *                will not receive any value.
   *
   * @returns A function to unsubscribe the subscriber from the topic.
   */
  export function subscribeTo<T = undefined>(
    publisher: Publisher<T>,
    topic: Publisher.Topic,
    subscriber: Publisher.Subscriber<T>,
  ): () => void {
    const subscribers = publisher.topics.get(topic)

    if (!subscribers) {
      publisher.topics.set(topic, new Set([subscriber]))

      return () => {
        const subscribers = publisher.topics.get(topic)

        if (subscribers) {
          subscribers.delete(subscriber)
        }
      }
    }

    subscribers.add(subscriber)

    return () => {
      subscribers.delete(subscriber)
    }
  }

  /**
   * Test if the given subject is a publisher.
   *
   * @param subject - The subject to check.
   *
   * @typeparam T - The type of the value to publish. If `undefined`, the publisher
   *                will not transport any value.
   *
   * @returns True if the subject is a publisher, false otherwise.
   */
  export function is<T = undefined>(subject: unknown): subject is Publisher<T> {
    return (
      typeof subject === 'object' &&
      subject !== null &&
      '_type' in subject &&
      '_kind' in subject &&
      subject._type === publisherSymbol &&
      subject._kind === syncPublisherSymbol
    )
  }

  /**
   * Test if the given subject is a publish nothing.
   *
   * @param subject - The subject to check.
   *
   * @returns True if the subject is a publish nothing, false otherwise.
   */
  export function isNothing(subject: unknown): subject is Nothing {
    return (
      typeof subject === 'object' &&
      subject !== null &&
      '_type' in subject &&
      '_kind' in subject &&
      subject._type === publisherSymbol &&
      subject._kind === publishNothingSymbol
    )
  }

  /**
   * Test if the given subject is a publish some.
   *
   * @param subject - The subject to check.
   *
   * @returns True if the subject is a publish some, false otherwise.
   */
  export function isSome(subject: unknown): subject is Some {
    return (
      typeof subject === 'object' &&
      subject !== null &&
      '_type' in subject &&
      '_kind' in subject &&
      subject._type === publisherSymbol &&
      subject._kind === publishSomeSymbol
    )
  }
}
