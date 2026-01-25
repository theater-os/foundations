# Theater OS - Futur

<p align="center">
  <img src="../../.etc/assets/futur-logo.webp" alt="Theater OS - Foundations - Futur">
</p>

A lazy, type-safe asynchronous computation wrapper for TypeScript that combines the power of Promises with Result-based error handling, providing deferred execution and built-in cancellation support.

## Why Futur?

JavaScript Promises are eager - they start executing immediately upon creation. While this works for many use cases, it has limitations:

- **Eager execution**: Promises run immediately, making it hard to control when async operations start
- **No type-safe errors**: Rejected promises lose type information about the error
- **No built-in cancellation**: AbortController must be managed separately
- **Exception-based errors**: You need try-catch blocks to handle rejections

`Futur` addresses these issues by providing:

- **Lazy execution**: The async operation only runs when you `await` the Futur
- **Type-safe errors**: Returns `Result<T, E>` with typed success and error values
- **Built-in AbortController**: Every Futur runner receives an AbortController for cancellation
- **No exceptions**: Errors are captured as `Result.err` values, not thrown
- **Promise interoperability**: Works with `async/await`, `Promise.all`, `Promise.race`, etc.

## Installation

```bash
npm install @theateros/futur
```

## Getting Started

### Basic Usage

```typescript
import { Futur } from '@theateros/futur'
import { Result } from '@theateros/result'

// Create a Futur - it won't run until awaited
const futur = Futur.of<string, Error>(({ resolve }) => {
  resolve('Hello, World!')
})

// Run the Futur and get a Result
const result = await futur

if (Result.isOk(result)) {
  console.log(result.value) // "Hello, World!"
}
```

### Creating Futurs

Use `Futur.of` to create a Futur from a runner function:

```typescript
import { Futur } from '@theateros/futur'
import { Result } from '@theateros/result'

// Success case
const successFutur = Futur.of<number, string>(({ resolve }) => {
  resolve(42)
})

// Error case
const errorFutur = Futur.of<number, string>(({ reject }) => {
  reject('Something went wrong')
})

// Async operations
const asyncFutur = Futur.of<string, Error>(({ resolve }) => {
  setTimeout(() => resolve('Delayed result'), 1000)
})

// All results are type-safe
const result = await successFutur
if (Result.isOk(result)) {
  console.log(result.value) // 42
}

const errorResult = await errorFutur
if (Result.isErr(errorResult)) {
  console.log(errorResult.error) // "Something went wrong"
}
```

### Wrapping Existing Promises

Use `Futur.ofPromise` to wrap existing Promise-returning functions:

```typescript
import { Futur } from '@theateros/futur'
import { Result } from '@theateros/result'

// Wrap a fetch call
const fetchUser = (id: number) =>
  Futur.ofPromise(() => fetch(`/api/users/${id}`).then(res => res.json()))

const result = await fetchUser(1)

if (Result.isOk(result)) {
  console.log('User:', result.value)
} else {
  console.log('Error:', result.error)
}
```

### Error Transformation

Transform errors using the optional `catcher` parameter:

```typescript
import { Futur } from '@theateros/futur'
import { Result } from '@theateros/result'

interface ApiError {
  code: string
  message: string
}

const fetchData = Futur.ofPromise(
  () => fetch('/api/data').then(res => res.json()),
  (error) => ({
    code: 'FETCH_ERROR',
    message: String(error)
  } as ApiError)
)

const result = await fetchData

if (Result.isErr(result)) {
  // error is typed as ApiError
  console.log(`Error ${result.error.code}: ${result.error.message}`)
}
```

### Cancellation with AbortController

Every Futur has a built-in `AbortController` for cancellation. When aborted, the Futur rejects with an `AbortedFailure`.

#### Aborting from Within the Runner

The runner receives an `abortController` in its payload:

```typescript
import { Futur } from '@theateros/futur'
import { Result } from '@theateros/result'

const fetchWithAbort = Futur.of<Response, Error>(({ resolve, reject, abortController }) => {
  fetch('/api/data', { signal: abortController.signal })
    .then(resolve)
    .catch(reject)
})

const result = await fetchWithAbort
```

#### Aborting from Outside

The `abortController` is also available as a public property on the Futur instance, allowing you to cancel from outside:

```typescript
import { Futur, AbortedFailure } from '@theateros/futur'
import { Result } from '@theateros/result'
import { Failure } from '@theateros/failure'

const longRunningTask = Futur.of<string, never>(({ resolve }) => {
  setTimeout(() => resolve('completed'), 10000)
})

// Cancel after 1 second
setTimeout(() => {
  longRunningTask.abortController.abort()
}, 1000)

const result = await longRunningTask

if (Result.isErr(result)) {
  if (Failure.isNamed(result.error, 'AbortedFailure')) {
    console.log('Task was cancelled:', result.error.message)
    // "Task was cancelled: Futur has been aborted"
  }
}
```

#### Handling AbortedFailure

When a Futur is aborted, it rejects with an `AbortedFailure`:

```typescript
import { Futur, AbortedFailure } from '@theateros/futur'
import { Result } from '@theateros/result'
import { Failure } from '@theateros/failure'

const futur = Futur.of<string, Error>(({ resolve, abortController }) => {
  // Simulate cancellation
  abortController.abort()
})

const result = await futur

if (Result.isErr(result)) {
  // Check if it was aborted
  if (result.error instanceof AbortedFailure) {
    console.log('Operation was aborted')
  }

  // Or use Failure.isNamed
  if (Failure.isNamed(result.error, 'AbortedFailure')) {
    console.log('Operation was aborted')
  }
}
```

#### Re-running After Abort

A Futur creates a fresh `AbortController` on each run, so you can re-run a Futur after it was aborted:

```typescript
import { Futur, AbortedFailure } from '@theateros/futur'
import { Result } from '@theateros/result'

let attempt = 0

const retryableFutur = Futur.of<string, never>(({ resolve, abortController }) => {
  attempt++
  if (attempt === 1) {
    abortController.abort() // Abort first attempt
  } else {
    resolve(`Success on attempt ${attempt}`)
  }
})

// First run - aborted
const result1 = await retryableFutur
console.log(Result.isErr(result1)) // true

// Second run - succeeds with fresh AbortController
const result2 = await retryableFutur
if (Result.isOk(result2)) {
  console.log(result2.value) // "Success on attempt 2"
}
```

### Deferred Execution

Futurs are lazy - they only execute when awaited:

```typescript
import { Futur } from '@theateros/futur'

// This does NOT start the operation
const futur = Futur.of<string, never>(({ resolve }) => {
  console.log('Running!')
  resolve('done')
})

console.log('Futur created')

// This starts the operation
const result = await futur
// Output:
// "Futur created"
// "Running!"
```

### Promise Interoperability

Futurs work seamlessly with Promise utilities:

```typescript
import { Futur } from '@theateros/futur'
import { Result } from '@theateros/result'

const futur1 = Futur.of<number, never>(({ resolve }) => resolve(1))
const futur2 = Futur.of<number, never>(({ resolve }) => resolve(2))
const futur3 = Futur.of<number, never>(({ resolve }) => resolve(3))

// Use with Promise.all
const results = await Promise.all([futur1, futur2, futur3])
// results is Result<number, never>[]

// Use with Promise.race
const slowFutur = Futur.of<string, never>(({ resolve }) => {
  setTimeout(() => resolve('slow'), 1000)
})

const fastFutur = Futur.of<string, never>(({ resolve }) => {
  resolve('fast')
})

const winner = await Promise.race([slowFutur, fastFutur])
// winner.value === 'fast'
```

### Transforming Results

Use the `then` callback to transform results:

```typescript
import { Futur } from '@theateros/futur'
import { Result } from '@theateros/result'

const futur = Futur.of<number, string>(({ resolve }) => {
  resolve(21)
})

// Transform the result
const doubled = await futur.then(result => {
  if (Result.isOk(result)) {
    return result.value * 2
  }
  return 0
})

console.log(doubled) // 42
```

## API Reference

### `Futur` Class

The main class that implements `PromiseLike<Result<T, E | AbortedFailure>>`.

#### Type Parameters

- **`T`**: The success value type
- **`E`**: The error value type

#### Static Methods

- **`Futur.of<T, E>(runner: FuturRunner): Futur<T, E>`**

  Creates a new Futur from a runner function. The runner receives a payload with `resolve`, `reject`, and `abortController`.

  ```typescript
  const futur = Futur.of<string, Error>(({ resolve, reject, abortController }) => {
    // Your async logic here
    resolve('success')
    // or: reject(new Error('failure'))
  })
  ```

- **`Futur.ofPromise<P, E>(launcher: () => P, catcher?: (error: unknown) => E): Futur<Awaited<P>, E>`**

  Creates a new Futur from a Promise-returning function. Optionally transform errors with the `catcher` parameter.

  ```typescript
  const futur = Futur.ofPromise(
    () => fetch('/api/data'),
    (error) => ({ code: 'ERROR', message: String(error) })
  )
  ```

#### Instance Properties

- **`abortController: AbortController`**

  The AbortController for cancelling the Futur. A new controller is created on each run. Use this to abort from outside the runner.

  ```typescript
  const futur = Futur.of<string, never>(({ resolve }) => {
    setTimeout(() => resolve('done'), 5000)
  })

  // Cancel after 1 second
  setTimeout(() => futur.abortController.abort(), 1000)

  const result = await futur // Result.err(AbortedFailure)
  ```

#### Instance Methods

- **`then<TResult1>(onfulfilled?): Promise<TResult1>`**

  Runs the Futur and returns a Promise. Called automatically when using `await`.

### `AbortedFailure` Class

A named Failure class used when a Futur is aborted. Extends `Failure` from `@theateros/failure`.

```typescript
import { AbortedFailure } from '@theateros/futur'
import { Failure } from '@theateros/failure'

const failure = new AbortedFailure('Operation cancelled')

// Type checking
failure instanceof AbortedFailure // true
failure instanceof Failure        // true
Failure.isNamed(failure, 'AbortedFailure') // true
```

### Types

#### `FuturPayload`

The payload passed to the runner function:

```typescript
type FuturPayload = {
  resolve: <V>(value: V) => void
  reject: <E>(reason: E) => void
  abortController: AbortController
}
```

#### `FuturRunner`

The runner function type:

```typescript
type FuturRunner = (payload: FuturPayload) => void
```

## Best Practices

1. **Use `Futur.of` for custom async logic**: When you need full control over resolve/reject timing

2. **Use `Futur.ofPromise` for wrapping existing Promises**: Cleaner syntax for Promise-based APIs

3. **Always handle both success and error cases**: Use `Result.isOk` and `Result.isErr` for type-safe handling

4. **Leverage the AbortController**: Pass it to fetch or other cancellable operations

5. **Type your errors**: Use the error type parameter to ensure type-safe error handling

6. **Remember Futurs are lazy**: The operation won't start until you `await` the Futur

7. **Handle AbortedFailure**: When using cancellation, check for `AbortedFailure` to handle cancelled operations gracefully

8. **Pass the abort signal to cancellable APIs**: Use `abortController.signal` with fetch, streams, or other APIs that support `AbortSignal`
