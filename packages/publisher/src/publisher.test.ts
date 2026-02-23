import { describe, expect, it, mock } from 'bun:test'
import { Result } from '@theateros/result'
import { Publisher } from './publisher'

const DEFAULT_TOPIC = Symbol.for('@theateros/publisher/default-topic')

describe('Publisher.of()', () => {
  it('creates a new Publisher instance', () => {
    const publisher = Publisher.of<number>()

    expect(publisher).toBeDefined()
  })

  it('creates independent instances', () => {
    const pub1 = Publisher.of<number>()
    const pub2 = Publisher.of<number>()

    expect(pub1).not.toBe(pub2)
  })
})

describe('Publisher.is()', () => {
  it('returns true for a Publisher instance', () => {
    const pub = Publisher.of()

    expect(Publisher.is(pub)).toBe(true)
  })

  it('returns false for null', () => {
    expect(Publisher.is(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(Publisher.is(undefined)).toBe(false)
  })

  it('returns false for plain objects', () => {
    expect(Publisher.is({ _type: 'fake' })).toBe(false)
  })

  it('returns false for primitives', () => {
    expect(Publisher.is(42)).toBe(false)
    expect(Publisher.is('string')).toBe(false)
    expect(Publisher.is(true)).toBe(false)
  })
})

describe('Publisher.subscribe()', () => {
  it('supports publisher without any arguments', async () => {
    const pub = Publisher.of()
    const subscriber = mock(() => {})

    const unsub = Publisher.subscribe(pub, subscriber)

    await Publisher.publish(pub)

    expect(subscriber).toHaveBeenNthCalledWith(1, undefined)

    unsub()

    await Publisher.publish(pub)

    expect(subscriber).toHaveBeenNthCalledWith(1, undefined) // no change
  })

  it('supports publisher with defined argument', async () => {
    const pub = Publisher.of<number>()
    const subscriber = mock(() => {})

    const unsub = Publisher.subscribe(pub, subscriber)

    await Publisher.publish(pub, 42)

    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(subscriber).toHaveBeenCalledWith(42)

    unsub()

    await Publisher.publish(pub, 43)

    expect(subscriber).toHaveBeenCalledTimes(1) // no change
    expect(subscriber).toHaveBeenCalledWith(42) // no change
  })

  it('supports subscribing to a custom string topic', async () => {
    const pub = Publisher.of<string>()
    const defaultSubscriber = mock(() => {})
    const topicSubscriber = mock(() => {})

    Publisher.subscribe(pub, defaultSubscriber)
    Publisher.subscribe(pub, topicSubscriber, 'my-topic')

    await Publisher.publishTo(pub, 'my-topic', 'hello')

    expect(topicSubscriber).toHaveBeenCalledTimes(1)
    expect(topicSubscriber).toHaveBeenCalledWith('hello')
    expect(defaultSubscriber).not.toHaveBeenCalled()
  })

  it('supports subscribing to a custom symbol topic', async () => {
    const TOPIC = Symbol('my-symbol-topic')
    const pub = Publisher.of<number>()
    const subscriber = mock(() => {})

    Publisher.subscribe(pub, subscriber, TOPIC)

    await Publisher.publishTo(pub, TOPIC, 99)

    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(subscriber).toHaveBeenCalledWith(99)
  })

  it('supports multiple subscribers on the same topic', async () => {
    const pub = Publisher.of<number>()
    const sub1 = mock(() => {})
    const sub2 = mock(() => {})
    const sub3 = mock(() => {})

    Publisher.subscribe(pub, sub1)
    Publisher.subscribe(pub, sub2)
    Publisher.subscribe(pub, sub3)

    await Publisher.publish(pub, 7)

    expect(sub1).toHaveBeenCalledTimes(1)
    expect(sub2).toHaveBeenCalledTimes(1)
    expect(sub3).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe removes the subscriber from its topic', async () => {
    const pub = Publisher.of<number>()
    const sub1 = mock(() => {})
    const sub2 = mock(() => {})

    const unsub1 = Publisher.subscribe(pub, sub1)
    Publisher.subscribe(pub, sub2)

    unsub1()

    await Publisher.publish(pub, 1)

    expect(sub1).not.toHaveBeenCalled()
    expect(sub2).toHaveBeenCalledTimes(1)
  })

  it('supports async subscribers', async () => {
    const pub = Publisher.of<number>()
    const calls: number[] = []
    const asyncSub = mock(async (n: number) => {
      await new Promise(resolve => setTimeout(resolve, 0))
      calls.push(n)
    })

    Publisher.subscribe(pub, asyncSub)

    await Publisher.publish(pub, 5)

    expect(calls).toEqual([5])
  })
})

describe('Publisher.publish()', () => {
  it('returns Result.ok when all subscribers succeed', async () => {
    const pub = Publisher.of<number>()
    Publisher.subscribe(
      pub,
      mock(() => {}),
    )

    const result = await Publisher.publish(pub, 1)

    expect(Result.isOk(result)).toBe(true)
  })

  it('returns Result.err when a subscriber throws', async () => {
    const pub = Publisher.of<number>()
    Publisher.subscribe(
      pub,
      mock(() => {
        throw new Error('boom')
      }),
    )

    const result = await Publisher.publish(pub, 1)

    expect(Result.isErr(result)).toBe(true)
  })

  it('continues calling remaining subscribers after one throws', async () => {
    const pub = Publisher.of<number>()
    const sub1 = mock(() => {
      throw new Error('fail')
    })
    const sub2 = mock(() => {})

    Publisher.subscribe(pub, sub1)
    Publisher.subscribe(pub, sub2)

    await Publisher.publish(pub, 1)

    expect(sub1).toHaveBeenCalledTimes(1)
    expect(sub2).toHaveBeenCalledTimes(1)
  })

  it('the Result.err contains per-subscriber results with the thrown error', async () => {
    const pub = Publisher.of<number>()
    const error = new Error('subscriber-error')
    Publisher.subscribe(
      pub,
      mock(() => {
        throw error
      }),
    )

    const result = await Publisher.publish(pub, 1)

    expect(Result.isErr(result)).toBe(true)

    if (Result.isErr(result)) {
      const topicResults = result.error[DEFAULT_TOPIC]
      expect(topicResults).toBeDefined()
      expect(topicResults).toHaveLength(1)

      // biome-ignore lint/style: we know that topicResults[0] is a Result.err
      expect(Result.isErr(topicResults![0])).toBe(true)
      // biome-ignore lint/style: we know that topicResults[0] is a Result.err
      if (Result.isErr(topicResults![0])) {
        // biome-ignore lint/style: we know that topicResults[0] is a Result.err
        expect(topicResults![0].error).toBe(error)
      }
    }
  })

  it('the Result.ok value contains per-subscriber results', async () => {
    const pub = Publisher.of<number>()
    Publisher.subscribe(
      pub,
      mock(() => {}),
    )

    const result = await Publisher.publish(pub, 1)

    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      const topicResults = result.value[DEFAULT_TOPIC]
      expect(topicResults).toBeDefined()
      expect(topicResults).toHaveLength(1)

      // biome-ignore lint/style: we know that topicResults[0] is a Result.err
      expect(Result.isOk(topicResults![0])).toBe(true)
    }
  })

  it('publishes to all topics at once', async () => {
    const pub = Publisher.of<number>()
    const defaultSub = mock(() => {})
    const topicSub = mock(() => {})

    Publisher.subscribe(pub, defaultSub)
    Publisher.subscribe(pub, topicSub, 'other-topic')

    await Publisher.publish(pub, 10)

    expect(defaultSub).toHaveBeenCalledWith(10)
    expect(topicSub).toHaveBeenCalledWith(10)
  })

  it('returns Result.ok with empty map when there are no subscribers', async () => {
    const pub = Publisher.of<number>()

    const result = await Publisher.publish(pub, 1)

    expect(Result.isOk(result)).toBe(true)
  })
})

describe('Publisher.publishTo()', () => {
  it('publishes only to the specified topic', async () => {
    const pub = Publisher.of<string>()
    const defaultSub = mock(() => {})
    const topicSub = mock(() => {})

    Publisher.subscribe(pub, defaultSub)
    Publisher.subscribe(pub, topicSub, 'news')

    await Publisher.publishTo(pub, 'news', 'breaking')

    expect(topicSub).toHaveBeenCalledTimes(1)
    expect(topicSub).toHaveBeenCalledWith('breaking')
    expect(defaultSub).not.toHaveBeenCalled()
  })

  it('does not notify subscribers of other topics', async () => {
    const pub = Publisher.of<number>()
    const subA = mock(() => {})
    const subB = mock(() => {})

    Publisher.subscribe(pub, subA, 'topic-a')
    Publisher.subscribe(pub, subB, 'topic-b')

    await Publisher.publishTo(pub, 'topic-a', 1)

    expect(subA).toHaveBeenCalledTimes(1)
    expect(subB).not.toHaveBeenCalled()
  })

  it('returns Result.ok when all subscribers succeed', async () => {
    const pub = Publisher.of<number>()
    Publisher.subscribe(
      pub,
      mock(() => {}),
      'my-topic',
    )

    const result = await Publisher.publishTo(pub, 'my-topic', 42)

    expect(Result.isOk(result)).toBe(true)
  })

  it('returns Result.err when a subscriber throws', async () => {
    const pub = Publisher.of<number>()
    Publisher.subscribe(
      pub,
      mock(() => {
        throw new Error('oops')
      }),
      'my-topic',
    )

    const result = await Publisher.publishTo(pub, 'my-topic', 42)

    expect(Result.isErr(result)).toBe(true)
  })

  it('the Result.err contains the thrown error in the topic result', async () => {
    const pub = Publisher.of<number>()
    const error = new Error('topic-error')
    Publisher.subscribe(
      pub,
      mock(() => {
        throw error
      }),
      'my-topic',
    )

    const result = await Publisher.publishTo(pub, 'my-topic', 1)

    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      const topicResults = result.error['my-topic']
      expect(topicResults).toBeDefined()
      expect(topicResults).toHaveLength(1)
      // biome-ignore lint/style: we know that topicResults[0] is a Result.err
      expect(Result.isErr(topicResults![0])).toBe(true)
    }
  })

  it('returns Result.ok when topic has no subscribers', async () => {
    const pub = Publisher.of<number>()

    const result = await Publisher.publishTo(pub, 'empty-topic', 1)

    expect(Result.isOk(result)).toBe(true)
  })

  it('supports async subscribers', async () => {
    const pub = Publisher.of<number>()
    const calls: number[] = []
    Publisher.subscribe(
      pub,
      mock(async (n: number) => {
        await new Promise(resolve => setTimeout(resolve, 0))
        calls.push(n)
      }),
      'async-topic',
    )

    await Publisher.publishTo(pub, 'async-topic', 99)

    expect(calls).toEqual([99])
  })

  it('supports publishing without data to undefined publisher', async () => {
    const pub = Publisher.of()
    const subscriber = mock(() => {})

    Publisher.subscribe(pub, subscriber)

    const result = await Publisher.publishTo(pub, DEFAULT_TOPIC)

    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(Result.isOk(result)).toBe(true)
  })
})
