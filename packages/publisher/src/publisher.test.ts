import { Result } from '@theateros/result'
import { describe, expect, it, mock } from 'bun:test'
import { Publisher } from './publisher'

describe('Publisher.of', () => {
  it('should create a new publisher instance', () => {
    const publisher = Publisher.of()

    expect(publisher).toHaveProperty('_type')
    expect(publisher).toHaveProperty('_kind')
    expect(publisher).toHaveProperty('topics')
    expect(publisher.topics).toBeInstanceOf(Map)
  })

  it('should create a publisher with a default topic', () => {
    const publisher = Publisher.of()

    expect(publisher.topics.size).toBe(1)
  })

  it('should create separate publisher instances', () => {
    const publisher1 = Publisher.of()
    const publisher2 = Publisher.of()

    expect(publisher1).not.toBe(publisher2)
    expect(publisher1.topics).not.toBe(publisher2.topics)
  })
})

describe('Publisher.nothing', () => {
  it('should create a Nothing instance', () => {
    const nothing = Publisher.nothing()

    expect(nothing).toHaveProperty('_type')
    expect(nothing).toHaveProperty('_kind')
  })

  it('should be recognized by isNothing', () => {
    const nothing = Publisher.nothing()

    expect(Publisher.isNothing(nothing)).toBe(true)
  })
})

describe('Publisher.some', () => {
  it('should create a Some instance with a count', () => {
    const some = Publisher.some(5)

    expect(some).toHaveProperty('_type')
    expect(some).toHaveProperty('_kind')
    expect(some).toHaveProperty('count')
    expect(some.count).toBe(5)
  })

  it('should be recognized by isSome', () => {
    const some = Publisher.some(3)

    expect(Publisher.isSome(some)).toBe(true)
  })

  it('should store the correct count', () => {
    expect(Publisher.some(0).count).toBe(0)
    expect(Publisher.some(1).count).toBe(1)
    expect(Publisher.some(100).count).toBe(100)
  })
})

describe('Publisher.subscribe', () => {
  it('should add a subscriber to the publisher', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})

    Publisher.subscribe(publisher, subscriber)

    // Publish to verify subscriber was added
    Publisher.publish(publisher, 'test')

    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(subscriber).toHaveBeenCalledWith('test')
  })

  it('should return an unsubscribe function', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})

    const unsubscribe = Publisher.subscribe(publisher, subscriber)

    expect(typeof unsubscribe).toBe('function')
  })

  it('should allow unsubscribing', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})

    const unsubscribe = Publisher.subscribe(publisher, subscriber)
    unsubscribe()

    Publisher.publish(publisher, 'test')

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('should allow multiple subscribers', () => {
    const publisher = Publisher.of<string>()
    const subscriber1 = mock(() => {})
    const subscriber2 = mock(() => {})

    Publisher.subscribe(publisher, subscriber1)
    Publisher.subscribe(publisher, subscriber2)

    Publisher.publish(publisher, 'test')

    expect(subscriber1).toHaveBeenCalledTimes(1)
    expect(subscriber2).toHaveBeenCalledTimes(1)
  })

  it('should work with publishers without values', () => {
    const publisher = Publisher.of()
    const subscriber = mock(() => {})

    Publisher.subscribe(publisher, subscriber)
    Publisher.publish(publisher)

    expect(subscriber).toHaveBeenCalledTimes(1)
  })
})

describe('Publisher.subscribeTo', () => {
  it('should add a subscriber to a specific topic', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})
    const topic = 'my-topic'

    Publisher.subscribeTo(publisher, topic, subscriber)

    Publisher.publishTo(publisher, topic, 'test')

    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(subscriber).toHaveBeenCalledWith('test')
  })

  it('should return an unsubscribe function', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})

    const unsubscribe = Publisher.subscribeTo(publisher, 'topic', subscriber)

    expect(typeof unsubscribe).toBe('function')
  })

  it('should allow unsubscribing from a topic', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})
    const topic = 'my-topic'

    const unsubscribe = Publisher.subscribeTo(publisher, topic, subscriber)
    unsubscribe()

    Publisher.publishTo(publisher, topic, 'test')

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('should not call subscriber when publishing to a different topic', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})

    Publisher.subscribeTo(publisher, 'topic-a', subscriber)
    Publisher.publishTo(publisher, 'topic-b', 'test')

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('should support symbol topics', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})
    const topic = Symbol('my-topic')

    Publisher.subscribeTo(publisher, topic, subscriber)
    Publisher.publishTo(publisher, topic, 'test')

    expect(subscriber).toHaveBeenCalledTimes(1)
  })

  it('should add subscriber to existing topic set', () => {
    const publisher = Publisher.of<string>()
    const subscriber1 = mock(() => {})
    const subscriber2 = mock(() => {})
    const topic = 'my-topic'

    Publisher.subscribeTo(publisher, topic, subscriber1)
    Publisher.subscribeTo(publisher, topic, subscriber2)

    Publisher.publishTo(publisher, topic, 'test')

    expect(subscriber1).toHaveBeenCalledTimes(1)
    expect(subscriber2).toHaveBeenCalledTimes(1)
  })
})

describe('Publisher.publish', () => {
  it('should publish to all subscribers in all topics', () => {
    const publisher = Publisher.of<string>()
    const defaultSubscriber = mock(() => {})
    const topicSubscriber = mock(() => {})

    Publisher.subscribe(publisher, defaultSubscriber)
    Publisher.subscribeTo(publisher, 'custom-topic', topicSubscriber)

    Publisher.publish(publisher, 'test')

    expect(defaultSubscriber).toHaveBeenCalledTimes(1)
    expect(topicSubscriber).toHaveBeenCalledTimes(1)
  })

  it('should return Nothing when there are no subscribers', () => {
    const publisher = Publisher.of<string>()

    const result = Publisher.publish(publisher, 'test')

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(Publisher.isNothing(result.value)).toBe(true)
    }
  })

  it('should return Some with count when there are subscribers', () => {
    const publisher = Publisher.of<string>()
    Publisher.subscribe(publisher, () => {})
    Publisher.subscribe(publisher, () => {})

    const result = Publisher.publish(publisher, 'test')

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(Publisher.isSome(result.value)).toBe(true)

      if (Publisher.isSome(result.value)) {
        expect(result.value.count).toBe(2)
      }
    }
  })

  it('should return Err when a subscriber throws', () => {
    const publisher = Publisher.of<string>()
    Publisher.subscribe(publisher, () => {
      throw new Error('Subscriber error')
    })

    const result = Publisher.publish(publisher, 'test')

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Publisher.PublishFailure)
    }
  })

  it('should pass the value to subscribers', () => {
    const publisher = Publisher.of<{ name: string }>()
    const subscriber = mock(() => {})

    Publisher.subscribe(publisher, subscriber)
    Publisher.publish(publisher, { name: 'John' })

    expect(subscriber).toHaveBeenCalledWith({ name: 'John' })
  })

  it('should work with publishers without values', () => {
    const publisher = Publisher.of()
    const subscriber = mock(() => {})

    Publisher.subscribe(publisher, subscriber)
    const result = Publisher.publish(publisher)

    expect(Result.isOk(result)).toBe(true)
    expect(subscriber).toHaveBeenCalledTimes(1)
  })
})

describe('Publisher.publishTo', () => {
  it('should publish only to subscribers of the specified topic', () => {
    const publisher = Publisher.of<string>()
    const topicASubscriber = mock(() => {})
    const topicBSubscriber = mock(() => {})

    Publisher.subscribeTo(publisher, 'topic-a', topicASubscriber)
    Publisher.subscribeTo(publisher, 'topic-b', topicBSubscriber)

    Publisher.publishTo(publisher, 'topic-a', 'test')

    expect(topicASubscriber).toHaveBeenCalledTimes(1)
    expect(topicBSubscriber).not.toHaveBeenCalled()
  })

  it('should return Nothing when the topic does not exist', () => {
    const publisher = Publisher.of<string>()

    const result = Publisher.publishTo(publisher, 'non-existent-topic', 'test')

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(Publisher.isNothing(result.value)).toBe(true)
    }
  })

  it('should return Nothing when the topic has no subscribers', () => {
    const publisher = Publisher.of<string>()
    const subscriber = mock(() => {})

    const unsubscribe = Publisher.subscribeTo(publisher, 'my-topic', subscriber)
    unsubscribe()

    const result = Publisher.publishTo(publisher, 'my-topic', 'test')

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(Publisher.isNothing(result.value)).toBe(true)
    }
  })

  it('should return Some with count when there are subscribers', () => {
    const publisher = Publisher.of<string>()
    Publisher.subscribeTo(publisher, 'my-topic', () => {})
    Publisher.subscribeTo(publisher, 'my-topic', () => {})
    Publisher.subscribeTo(publisher, 'my-topic', () => {})

    const result = Publisher.publishTo(publisher, 'my-topic', 'test')

    expect(Result.isOk(result)).toBe(true)

    if (Result.isOk(result)) {
      expect(Publisher.isSome(result.value)).toBe(true)

      if (Publisher.isSome(result.value)) {
        expect(result.value.count).toBe(3)
      }
    }
  })

  it('should return Err when a subscriber throws', () => {
    const publisher = Publisher.of<string>()
    Publisher.subscribeTo(publisher, 'my-topic', () => {
      throw new Error('Subscriber error')
    })

    const result = Publisher.publishTo(publisher, 'my-topic', 'test')

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Publisher.PublishFailure)
    }
  })

  it('should work with symbol topics', () => {
    const publisher = Publisher.of<string>()
    const topic = Symbol('my-topic')
    const subscriber = mock(() => {})

    Publisher.subscribeTo(publisher, topic, subscriber)
    Publisher.publishTo(publisher, topic, 'test')

    expect(subscriber).toHaveBeenCalledWith('test')
  })
})

describe('Publisher.is', () => {
  it('should return true for a valid publisher', () => {
    const publisher = Publisher.of()

    expect(Publisher.is(publisher)).toBe(true)
  })

  it('should return false for null', () => {
    expect(Publisher.is(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(Publisher.is(undefined)).toBe(false)
  })

  it('should return false for non-object values', () => {
    expect(Publisher.is('string')).toBe(false)
    expect(Publisher.is(123)).toBe(false)
    expect(Publisher.is(true)).toBe(false)
    expect(Publisher.is(Symbol('test'))).toBe(false)
  })

  it('should return false for objects without the correct structure', () => {
    expect(Publisher.is({})).toBe(false)
    expect(Publisher.is({ _type: 'wrong' })).toBe(false)
    expect(Publisher.is({ _type: Symbol('wrong'), _kind: Symbol('wrong') })).toBe(false)
  })

  it('should return false for Nothing or Some types', () => {
    expect(Publisher.is(Publisher.nothing())).toBe(false)
    expect(Publisher.is(Publisher.some(5))).toBe(false)
  })
})

describe('Publisher.isNothing', () => {
  it('should return true for a Nothing instance', () => {
    const nothing = Publisher.nothing()

    expect(Publisher.isNothing(nothing)).toBe(true)
  })

  it('should return false for a Some instance', () => {
    const some = Publisher.some(1)

    expect(Publisher.isNothing(some)).toBe(false)
  })

  it('should return false for a Publisher instance', () => {
    const publisher = Publisher.of()

    expect(Publisher.isNothing(publisher)).toBe(false)
  })

  it('should return false for null', () => {
    expect(Publisher.isNothing(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(Publisher.isNothing(undefined)).toBe(false)
  })

  it('should return false for non-object values', () => {
    expect(Publisher.isNothing('string')).toBe(false)
    expect(Publisher.isNothing(123)).toBe(false)
    expect(Publisher.isNothing(true)).toBe(false)
  })
})

describe('Publisher.isSome', () => {
  it('should return true for a Some instance', () => {
    const some = Publisher.some(5)

    expect(Publisher.isSome(some)).toBe(true)
  })

  it('should return false for a Nothing instance', () => {
    const nothing = Publisher.nothing()

    expect(Publisher.isSome(nothing)).toBe(false)
  })

  it('should return false for a Publisher instance', () => {
    const publisher = Publisher.of()

    expect(Publisher.isSome(publisher)).toBe(false)
  })

  it('should return false for null', () => {
    expect(Publisher.isSome(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(Publisher.isSome(undefined)).toBe(false)
  })

  it('should return false for non-object values', () => {
    expect(Publisher.isSome('string')).toBe(false)
    expect(Publisher.isSome(123)).toBe(false)
    expect(Publisher.isSome(true)).toBe(false)
  })
})

describe('Publisher.PublishFailure', () => {
  it('should be an instance of Error', () => {
    const failure = new Publisher.PublishFailure('test error')

    expect(failure).toBeInstanceOf(Error)
  })

  it('should have a message', () => {
    const failure = new Publisher.PublishFailure('test error')

    expect(failure.message).toBe('test error')
  })
})

describe('Publisher integration scenarios', () => {
  it('should handle a typical pub/sub scenario', () => {
    const publisher = Publisher.of<{ type: string; payload: unknown }>()
    const receivedMessages: Array<{ type: string; payload: unknown }> = []

    Publisher.subscribe(publisher, message => {
      receivedMessages.push(message)
    })

    Publisher.publish(publisher, { type: 'USER_CREATED', payload: { id: 1, name: 'John' } })
    Publisher.publish(publisher, { type: 'USER_UPDATED', payload: { id: 1, name: 'Jane' } })

    expect(receivedMessages).toHaveLength(2)
    expect(receivedMessages[0].type).toBe('USER_CREATED')
    expect(receivedMessages[1].type).toBe('USER_UPDATED')
  })

  it('should handle topic-based routing', () => {
    const publisher = Publisher.of<string>()
    const userMessages: string[] = []
    const orderMessages: string[] = []

    Publisher.subscribeTo(publisher, 'users', msg => userMessages.push(msg))
    Publisher.subscribeTo(publisher, 'orders', msg => orderMessages.push(msg))

    Publisher.publishTo(publisher, 'users', 'User logged in')
    Publisher.publishTo(publisher, 'orders', 'Order placed')
    Publisher.publishTo(publisher, 'users', 'User logged out')

    expect(userMessages).toEqual(['User logged in', 'User logged out'])
    expect(orderMessages).toEqual(['Order placed'])
  })

  it('should allow dynamic subscription and unsubscription', () => {
    const publisher = Publisher.of<number>()
    const values: number[] = []

    const unsubscribe = Publisher.subscribe(publisher, value => values.push(value))

    Publisher.publish(publisher, 1)
    Publisher.publish(publisher, 2)

    unsubscribe()

    Publisher.publish(publisher, 3)

    expect(values).toEqual([1, 2])
  })

  it('should handle broadcast to all topics', () => {
    const publisher = Publisher.of<string>()
    const allMessages: string[] = []

    // Subscribe to default topic
    Publisher.subscribe(publisher, msg => allMessages.push(`default: ${msg}`))

    // Subscribe to custom topics
    Publisher.subscribeTo(publisher, 'topic-a', msg => allMessages.push(`a: ${msg}`))
    Publisher.subscribeTo(publisher, 'topic-b', msg => allMessages.push(`b: ${msg}`))

    // Broadcast to all
    Publisher.publish(publisher, 'hello')

    expect(allMessages).toContain('default: hello')
    expect(allMessages).toContain('a: hello')
    expect(allMessages).toContain('b: hello')
  })

  it('should handle error recovery', () => {
    const publisher = Publisher.of<string>()
    let shouldThrow = true

    Publisher.subscribe(publisher, () => {
      if (shouldThrow) {
        throw new Error('Temporary error')
      }
    })

    const firstResult = Publisher.publish(publisher, 'test')
    expect(Result.isErr(firstResult)).toBe(true)

    shouldThrow = false
    const secondResult = Publisher.publish(publisher, 'test')
    expect(Result.isOk(secondResult)).toBe(true)
  })
})
