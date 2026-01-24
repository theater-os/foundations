# Theater OS - Failure

<p align="center">
  <img src="../../.etc/assets/failure-logo.webp" alt="Theater OS - Foundations - Failure">
</p>

A domain-specific error class that extends the native `Error` class with additional properties and utilities to help with error handling in TypeScript applications.

## Why Failure?

Error handling is a critical aspect of building robust applications, but JavaScript's native `Error` class has limitations:

- **No type safety**: It's hard to distinguish between different types of errors at compile time
- **No structured error data**: Errors often need additional context beyond just a message
- **Inconsistent error handling**: Different parts of your codebase may handle errors differently
- **No easy way to create domain-specific errors**: You have to manually extend `Error` for each error type

`Failure` addresses these issues by providing:

- **Type-safe error handling**: Use TypeScript's type system to ensure you're handling the right errors
- **Structured error data**: Attach additional context through the `options` parameter
- **Named failures**: Create domain-specific error types without boilerplate
- **Consistent API**: All error operations use a unified, static method API
- **Better stack traces**: Automatic stack trace capture for better debugging

## Installation

```bash
npm install @theateros/failure
```

## Getting Started

### Basic Usage

```typescript
import { Failure } from '@theateros/failure'

// Create a simple failure
const error = Failure.of('Something went wrong')

// Create a failure with additional context
const errorWithCause = Failure.of('Operation failed', {
  cause: new Error('Network timeout')
})

// Throw the failure
throw error
```

### Creating Named Failures

Named failures allow you to create domain-specific error types:

```typescript
import { Failure } from '@theateros/failure'

// Create a named failure class
const NotFoundFailure = Failure.named('NotFoundFailure')
const ValidationFailure = Failure.named('ValidationFailure')

// Use them
throw new NotFoundFailure('User not found')
throw new ValidationFailure('Invalid email format')
```

### Passing Options and Cause

You can pass additional options and a cause to failures for better error context:

```typescript
import { Failure } from '@theateros/failure'

// Create a failure with a cause
const error = Failure.of('Operation failed', {
  cause: new Error('Network timeout')
})

// Create a named failure with options
const NotFoundError = Failure.named('NotFoundError')
throw new NotFoundError('User not found', {
  cause: new Error('Database query returned no results')
})

// Access the cause later
try {
  // some operation
} catch (error) {
  if (Failure.is(error) && error.cause) {
    console.log('Original error:', error.cause)
    console.log('Failure message:', error.message)
  }
}
```

### Type Guards

Use type guards to safely check error types:

```typescript
import { Failure } from '@theateros/failure'

try {
  // some operation
} catch (error) {
  if (Failure.is(error)) {
    console.log('Caught a failure:', error.message)
  }

  if (Failure.isNamed(error, 'NotFoundFailure')) {
    // TypeScript knows this is a NotFoundFailure
    console.log('Resource not found')
  }
}
```

## API Reference

### `Failure` Class

The main error class that extends `Error`.

#### Constructor

```typescript
new Failure(message: string, options?: ErrorOptions)
```

#### Static Methods

- **`Failure.named<N>(name: N)`**: Creates a named failure class
- **`Failure.of(message, options?)`**: Creates a new failure instance
- **`Failure.ofNamed(failure, message, options?)`**: Creates a failure from a named failure class
- **`Failure.is(error)`**: Type guard to check if an error is a Failure
- **`Failure.isNamed(error, name)`**: Type guard to check if an error is a named failure
- **`Failure.panic(error)`**: Throws an error (functional style)

#### Properties

- **`message: string`**: The error message
- **`name: string`**: The error name (default: `'Failure'`)
- **`options?: ErrorOptions`**: Additional error options
- **`cause?: unknown`**: The cause of the error (from options)
- **`stack?: string`**: The stack trace
