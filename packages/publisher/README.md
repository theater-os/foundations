# Theater OS - Publisher

<p align="center">
  <img src="../../.etc/assets/publisher-logo.webp" alt="Theater OS - Foundations - Publisher">
</p>

A type-safe publish/subscribe implementation for TypeScript that provides structured event broadcasting with topic routing, async subscriber support, and Result-based error isolation.

## Why Publisher?

Traditional event emitters in JavaScript/TypeScript (`EventEmitter`, `addEventListener`, `dispatchEvent`) have several limitations:

- **No type safety**: You can't know at compile time what data an event carries
- **Silent failures**: If a subscriber throws, it can crash the whole dispatch or silently swallow errors
- **No async support**: Async subscribers are fire-and-forget with no way to await them
- **Messy cleanup**: You must keep references to listener functions to remove them later
- **No structured routing**: Multiplexing events requires naming conventions and manual filtering

`Publisher` addresses these issues by providing:

- **Type-safe data**: The generic parameter enforces the type of data published and received by subscribers
- **Result-based error handling**: Subscriber errors are captured and returned as `Result.err` — other subscribers keep running
- **First-class async**: Subscribers can return `Promise<void>`, and `publish` awaits all of them
- **Clean unsubscribe**: `subscribe()` returns an unsubscribe function — no need to hold a reference to the original listener
- **Topic routing**: Organize subscribers into named topics (`string` or `symbol`), and publish to all or just one

## Installation

```bash
npm install @theateros/publisher
```

## Getting Started

### Basic Usage

```typescript
import { Publisher } from '@theateros/publisher'

// Create a publisher that broadcasts numbers
const counter = Publisher.of<number>()

// Subscribe to it
const unsub = Publisher.subscribe(counter, (value) => {
  console.log('Received:', value)
})

// Publish a value to all subscribers
await Publisher.publish(counter, 42)
// → "Received: 42"

// Unsubscribe when done
unsub()

await Publisher.publish(counter, 99)
// → (nothing, subscriber has been removed)
```

### Publishers Without Data

When no type parameter is provided, the publisher broadcasts signals with no payload:

```typescript
import { Publisher } from '@theateros/publisher'

const onReset = Publisher.of()

Publisher.subscribe(onReset, () => {
  console.log('Reset triggered!')
})

await Publisher.publish(onReset)
// → "Reset triggered!"
```

### Async Subscribers

Subscribers can be `async` functions. `Publisher.publish` and `Publisher.publishTo` await each subscriber before moving to the next:

```typescript
import { Publisher } from '@theateros/publisher'

const onUserCreated = Publisher.of<{ id: string; email: string }>()

Publisher.subscribe(onUserCreated, async (user) => {
  await sendWelcomeEmail(user.email)
  console.log('Welcome email sent to', user.email)
})

Publisher.subscribe(onUserCreated, async (user) => {
  await createUserProfile(user.id)
  console.log('Profile created for', user.id)
})

await Publisher.publish(onUserCreated, { id: 'u1', email: 'alice@example.com' })
// Both subscribers are awaited sequentially
```

### Multiple Subscribers

Multiple subscribers on the same topic all receive the published data:

```typescript
import { Publisher } from '@theateros/publisher'

const onPriceChange = Publisher.of<number>()

Publisher.subscribe(onPriceChange, (price) => console.log('Chart updated:', price))
Publisher.subscribe(onPriceChange, (price) => console.log('Alert checked:', price))
Publisher.subscribe(onPriceChange, (price) => console.log('History recorded:', price))

await Publisher.publish(onPriceChange, 99.5)
// → "Chart updated: 99.5"
// → "Alert checked: 99.5"
// → "History recorded: 99.5"
```

### Topic Routing

Use topics to segment subscribers. A topic can be a `string` or a `symbol`:

```typescript
import { Publisher } from '@theateros/publisher'

const bus = Publisher.of<string>()

Publisher.subscribe(bus, (msg) => console.log('[default]', msg))
Publisher.subscribe(bus, (msg) => console.log('[news]', msg), 'news')
Publisher.subscribe(bus, (msg) => console.log('[alerts]', msg), 'alerts')

// Publish only to 'news' subscribers
await Publisher.publishTo(bus, 'news', 'New article published')
// → "[news] New article published"
// (default and alerts subscribers are NOT called)

// Publish to ALL topics at once
await Publisher.publish(bus, 'System update')
// → "[default] System update"
// → "[news] System update"
// → "[alerts] System update"
```

Symbol topics are useful to prevent accidental name collisions:

```typescript
const TOPIC_AUTH = Symbol('auth')
const TOPIC_CART = Symbol('cart')

const appBus = Publisher.of<{ type: string }>()

Publisher.subscribe(appBus, (event) => console.log('Auth event:', event.type), TOPIC_AUTH)
Publisher.subscribe(appBus, (event) => console.log('Cart event:', event.type), TOPIC_CART)

await Publisher.publishTo(appBus, TOPIC_AUTH, { type: 'LOGIN' })
// → "Auth event: LOGIN"
```

### Error Handling

`Publisher.publish` and `Publisher.publishTo` never throw. When a subscriber throws, the error is captured in a `Result.err`. All remaining subscribers still run:

```typescript
import { Publisher } from '@theateros/publisher'
import { Result } from '@theateros/result'

const events = Publisher.of<number>()

Publisher.subscribe(events, (_n) => { throw new Error('subscriber crashed') })
Publisher.subscribe(events, (n) => console.log('still runs:', n))

const result = await Publisher.publish(events, 1)
// → "still runs: 1"

if (Result.isErr(result)) {
  // result.error is a ResultMap: a map of topics to per-subscriber results
  console.log('Some subscribers failed:', result.error)
}

if (Result.isOk(result)) {
  // result.value is also a ResultMap with Result.ok per subscriber
  console.log('All succeeded:', result.value)
}
```

### Inspecting Per-Subscriber Results

The `ResultMap` returned by publish contains per-topic, per-subscriber results:

```typescript
import { Publisher } from '@theateros/publisher'
import { Result } from '@theateros/result'

const pub = Publisher.of<number>()

Publisher.subscribe(pub, (_n) => { throw new Error('oops') })
Publisher.subscribe(pub, (_n) => { /* success */ })

const result = await Publisher.publish(pub, 42)

if (Result.isErr(result)) {
  for (const [topic, results] of Object.entries(result.error)) {
    results?.forEach((r, i) => {
      if (Result.isErr(r)) {
        console.log(`Subscriber ${i} on topic "${String(topic)}" failed:`, r.error)
      }
    })
  }
}
```

### Type Guard

Use `Publisher.is` to check if an unknown value is a Publisher instance:

```typescript
import { Publisher } from '@theateros/publisher'

function maybePublish(value: unknown) {
  if (Publisher.is(value)) {
    // TypeScript knows value is Publisher here
    Publisher.publish(value)
  }
}
```

## API Reference

### `Publisher<T>` Type

A Publisher instance holds a map of topics to sets of subscribers. The type parameter `T` defines the shape of the data published.

```typescript
type Publisher<T = undefined> = {
  _type: symbol
  topics: Map<Publisher.Topic, Set<Publisher.Subscriber<T>>>
}
```

### `Publisher` Namespace

#### Types

- **`Publisher.Topic`**: `string | symbol` — the identifier for a topic
- **`Publisher.Subscriber<T>`**: a function `(data: T) => void | Promise<void>`. When `T` is `undefined`, the function takes no arguments
- **`Publisher.Unsubscribe`**: `() => void` — the function returned by `subscribe`
- **`Publisher.Promisable<T>`**: `T | Promise<T>` — a value or a promise of a value
- **`Publisher.ResultMap<E>`**: `{ [topic: Topic]?: Array<Result<void, E>> }` — the result map returned by publish

#### Functions

- **`Publisher.of<T = undefined>(): Publisher<T>`**

  Creates a new Publisher instance. Pass a type parameter to define the data type that subscribers will receive.

  ```typescript
  const pub = Publisher.of<string>()
  ```

- **`Publisher.subscribe<T>(publisher, subscriber, topic?): Unsubscribe`**

  Attaches a subscriber to the given publisher. Optionally scoped to a topic (defaults to the internal default topic). Returns an `Unsubscribe` function.

  ```typescript
  const unsub = Publisher.subscribe(pub, (data) => console.log(data))
  const unsubTopic = Publisher.subscribe(pub, (data) => console.log(data), 'my-topic')

  // Later:
  unsub()
  unsubTopic()
  ```

- **`Publisher.publish(publisher, data?): Promise<Result<ResultMap<never>, ResultMap<unknown>>>`**

  Publishes data to **all topics** of the given publisher. Awaits each subscriber. Returns `Result.ok` if all subscribers succeed, `Result.err` if any throw — but all subscribers are always called.

  ```typescript
  const result = await Publisher.publish(pub, 'hello')

  if (Result.isOk(result)) { /* all good */ }
  if (Result.isErr(result)) { /* some subscribers failed */ }
  ```

- **`Publisher.publishTo(publisher, topic, data?): Promise<Result<ResultMap<never>, ResultMap<unknown>>>`**

  Publishes data to the subscribers of a **specific topic** only. Same error semantics as `publish`.

  ```typescript
  const result = await Publisher.publishTo(pub, 'my-topic', 'hello')
  ```

- **`Publisher.is(value): value is Publisher`**

  Type guard. Returns `true` if `value` is a Publisher instance.

  ```typescript
  Publisher.is(Publisher.of()) // true
  Publisher.is({})             // false
  Publisher.is(null)           // false
  ```

## Best Practices

1. **Type your publishers**: Always use the generic parameter (`Publisher.of<MyType>()`) to get full type safety on subscribers and published data.

2. **Use symbols for internal topics**: Prefer `Symbol('topic-name')` over string topics for internal pub/sub to avoid accidental name collisions with third-party code.

3. **Always handle both Result cases**: Use `Result.isOk` and `Result.isErr` after `publish` to detect and surface subscriber failures.

4. **Call the unsubscribe function**: Store the return value of `subscribe` and call it during cleanup (e.g., in component unmount, service teardown) to prevent memory leaks.

5. **Use `publishTo` for targeted routing**: When you don't want to notify all topics, use `publishTo` instead of `publish` to keep dispatch semantics explicit and efficient.

6. **Prefer `Publisher.of()` without a type for signals**: When the event itself carries no data (e.g., "reset triggered", "session expired"), use `Publisher.of()` — subscribers will receive no argument, making the intent clear.
