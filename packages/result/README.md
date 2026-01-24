# Theater OS - Result

<p align="center">
  <img src="../../.etc/assets/result-logo.webp" alt="Theater OS - Foundations - Result">
</p>

A type-safe Result type implementation for TypeScript that provides a functional approach to error handling without throwing exceptions and allows codebases to take care of their wrong path.

## Why Result?

Traditional error handling in JavaScript/TypeScript relies on exceptions, which have several limitations:

- **No type safety**: You can't know at compile time if a function might throw
- **Unpredictable control flow**: Exceptions can be thrown anywhere, making code flow hard to follow
- **No explicit error types**: You don't know what errors a function might produce
- **Hard to compose**: Chaining operations that might fail requires try-catch blocks everywhere

`Result` addresses these issues by providing:

- **Type-safe error handling**: The type system enforces handling both success and error cases
- **Explicit error types**: Errors are part of the return type, making them visible and type-checked
- **Composable operations**: Chain operations without nested try-catch blocks
- **No exceptions**: Errors are values, not thrown exceptions
- **Functional style**: Inspired by Rust's `Result<T, E>` type

## Installation

```bash
npm install @theateros/result
```

## Getting Started

### Basic Usage

```typescript
import { Result } from '@theateros/result'

// Create a successful result
const success = Result.ok('Operation completed')

// Create an error result
const failure = Result.err('Something went wrong')

// Check the result
if (Result.isOk(success)) {
  console.log('Value:', success.value)
}

if (Result.isErr(failure)) {
  console.log('Error:', failure.error)
}
```

### Creating Results

Results can represent either success (`Ok`) or failure (`Err`):

```typescript
import { Result } from '@theateros/result'

// Success case
const userResult = Result.ok({ id: 1, name: 'John' })

// Error case
const errorResult = Result.err('User not found')

// Use type guards to narrow the type
if (Result.isOk(userResult)) {
  // TypeScript knows this is Ok<{ id: number, name: string }>
  console.log(userResult.value.name)
}

if (Result.isErr(errorResult)) {
  // TypeScript knows this is Err<string>
  console.log(errorResult.error)
}
```

### Type Guards

Use type guards to safely check and narrow result types:

```typescript
import { Result } from '@theateros/result'

function processResult<T, E>(result: Result<T, E>) {
  if (Result.isOk(result)) {
    // TypeScript knows result is Ok<T>
    return result.value
  }

  if (Result.isErr(result)) {
    // TypeScript knows result is Err<E>
    return result.error
  }
}

// Check if something is a Result
const unknown: unknown = Result.ok(42)
if (Result.is(unknown)) {
  // Now we know it's a Result
  if (Result.isOk(unknown)) {
    console.log(unknown.value)
  }
}
```

### Unwrapping Results

Safely extract values from results with optional default values:

```typescript
import { Result } from '@theateros/result'

// Unwrap with default value
const result = Result.err('Failed')
const value = Result.unwrap(result, 'default value')
// value === 'default value'

// Unwrap without default (throws if Err)
const okResult = Result.ok('success')
const unwrapped = Result.unwrap(okResult)
// unwrapped === 'success'

// Throws if no default provided
// (carrefull when using this method because you
// can possibly break flows entierely).
try {
  Result.unwrap(Result.err('error'))
} catch (error) {
  // error === 'error'
}
```

### Safe Function Wrapping

Wrap functions that might throw to return Results instead:

```typescript
import { Result } from '@theateros/result'

// Wrap a function that might throw
const safeParse = Result.safe((json: string) => JSON.parse(json))

// Now it returns a Result instead of throwing
const result = safeParse('{"key": "value"}')

if (Result.isOk(result)) {
  console.log(result.value) // Parsed object
} else {
  console.log('Parse failed:', result.error)
}

// With error transformation
const safeParseWithError = Result.safe(
  (json: string) => JSON.parse(json),
  error => `Parse error: ${String(error)}`
)

const result2 = safeParseWithError('invalid')
if (Result.isErr(result2)) {
  console.log(result2.error) // "Parse error: ..."
}
```

## API Reference

### `Result` Namespace

The main namespace containing all Result utilities.

#### Types

- **`Ok<T>`**: Represents a successful result with value of type `T`
- **`Err<E>`**: Represents a failed result with error of type `E`
- **`Result<T, E>`**: Union type representing either `Ok<T>` or `Err<E>`

#### Static Methods

- **`Result.ok<T>(value: T): Ok<T>`**: Creates a new Ok result
- **`Result.err<E>(error: E): Err<E>`**: Creates a new Err result
- **`Result.is<T, E>(result: unknown): result is Result<T, E>`**: Type guard to check if a value is a Result
- **`Result.isOk<T>(result: unknown): result is Ok<T>`**: Type guard to check if a result is Ok
- **`Result.isErr<E>(result: unknown): result is Err<E>`**: Type guard to check if a result is Err
- **`Result.unwrap<T, E>(result: Result<T, E>, defaultValue?: T): T`**: Unwraps a result, returning the value or default, or throwing the error
- **`Result.safe<Fn, E>(fn: Fn, onError?: (error: unknown) => E)`**: Wraps a function to return Results instead of throwing

#### Properties

**Ok<T>**:
- **`_type: symbol`**: Brand symbol for type checking
- **`_kind: symbol`**: Brand symbol for Ok kind
- **`value: T`**: The success value
- **`error?: never`**: Always undefined for Ok results

**Err<E>**:
- **`_type: symbol`**: Brand symbol for type checking
- **`_kind: symbol`**: Brand symbol for Err kind
- **`error: E`**: The error value
- **`value?: never`**: Always undefined for Err results
