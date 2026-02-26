# Theater OS - Result

<p align="center">
  <img src="../../.etc/assets/result-logo.webp" alt="Theater OS - Foundations - Result">
</p>

A type-safe `Result` type for TypeScript — stop throwing exceptions, start returning errors as values. Inspired by Rust's `Result<T, E>`, built for the real world.

## Why Result?

Traditional JavaScript error handling breaks down at scale:

```typescript
// ❌ What types can this throw? Who knows.
// ❌ Will the caller remember to catch it? Maybe.
// ❌ Can you compose this safely? Not easily.
async function getUser(id: string) {
  const user = await db.findUser(id) // might throw
  return user
}
```

With `Result`, errors become **first-class citizens** of your type system:

```typescript
// ✅ The return type tells the whole story.
// ✅ TypeScript forces you to handle the error case.
// ✅ Composes beautifully with other Results.
async function getUser(id: string): Promise<Result<User, 'NOT_FOUND' | 'DB_ERROR'>> {
  // ...
}
```

**The benefits:**

- **Type-safe errors** — the compiler knows what can go wrong, and enforces that you handle it
- **Explicit error types** — no more hunting through docs to find what a function throws
- **Predictable control flow** — no surprise exceptions bubbling through five layers of your app
- **Composable by design** — chain operations, flatten nested results, wrap async code — all without try/catch noise
- **Inspired by Rust** — battle-tested mental model, adapted for TypeScript idioms

## Installation

```bash
npm install @theateros/result
# or
bun add @theateros/result
```

## Getting Started

### The Two Building Blocks

Everything starts with `ok` and `err`:

```typescript
import { Result } from '@theateros/result'

// A successful result wrapping a value
const success: Result<number, never> = Result.ok(42)

// A failed result wrapping an error
const failure: Result<never, string> = Result.err('Something went wrong')
```

### Real-World Example: Parsing & Validation

```typescript
import { Result } from '@theateros/result'

type ParseError = { code: 'INVALID_JSON' | 'MISSING_FIELD'; message: string }

function parseUserPayload(raw: string): Result<User, ParseError> {
  let data: unknown

  try {
    data = JSON.parse(raw)
  } catch {
    return Result.err({ code: 'INVALID_JSON', message: 'Payload is not valid JSON' })
  }

  if (typeof (data as any).name !== 'string') {
    return Result.err({ code: 'MISSING_FIELD', message: '"name" field is required' })
  }

  return Result.ok({ name: (data as any).name })
}

const result = parseUserPayload('{"name": "Alice"}')

if (Result.isOk(result)) {
  console.log('Welcome,', result.value.name) // TypeScript knows this is User
}

if (Result.isErr(result)) {
  console.error(`[${result.error.code}]`, result.error.message) // TypeScript knows this is ParseError
}
```

### Type Guards

Three guards for three questions:

```typescript
const value: unknown = Result.ok(42)

Result.is(value)    // Is this a Result at all?
Result.isOk(value)  // Is this a successful Result?
Result.isErr(value) // Is this a failed Result?
```

Each guard narrows the TypeScript type, so after the check you get full autocomplete on `.value` or `.error`.

---

## Unwrapping

### `unwrap` — Extract the value (or provide a fallback)

```typescript
const result: Result<string, Error> = Result.ok('hello')

// Safe: returns value directly
const value = Result.unwrap(result) // "hello"

// Safe: returns fallback if Err
const safe = Result.unwrap(Result.err(new Error()), 'fallback') // "fallback"

// Dangerous: throws the error if no fallback given
const risky = Result.unwrap(Result.err(new Error('oops'))) // throws Error("oops")
```

### `unwrapErr` — Extract the error (the mirror of `unwrap`)

Sometimes you're interested in the error path — testing error cases, building error reporting pipelines, or logging failures. `unwrapErr` is `unwrap` flipped:

```typescript
const result: Result<User, 'NOT_FOUND'> = Result.err('NOT_FOUND')

// Extract the error
const error = Result.unwrapErr(result) // 'NOT_FOUND'

// Provide a fallback when the result is actually Ok
const fallback = Result.unwrapErr(Result.ok(user), 'DEFAULT_ERROR') // 'DEFAULT_ERROR'

// Throws Result.UnwrapErrFailure if called on Ok with no fallback
Result.unwrapErr(Result.ok(user)) // throws!
```

**Practical use: cleaner test assertions**

```typescript
it('should return NOT_FOUND for unknown users', () => {
  const result = getUser('unknown-id')

  // Instead of if/else boilerplate:
  expect(Result.unwrapErr(result)).toBe('NOT_FOUND')
})
```

### `unwrapLift` — Flatten deeply nested Results

When composing multiple operations that return Results, you can end up with `Result<Result<Result<T, E>, E>, E>`. `unwrapLift` recursively unwraps to give you a clean `T`:

```typescript
// Deeply nested — happens naturally when composing Result-returning functions
const nested = Result.ok(Result.ok(Result.ok('deep value')))
// Type: Ok<Ok<Ok<string>>>

const flat = Result.unwrapLift(nested) // "deep value"
// Type: string ✨
```

With a fallback for when any layer is an `Err`:

```typescript
const broken = Result.ok(Result.err('inner failure'))

const value = Result.unwrapLift(broken, 'recovered') // "recovered"
```

### `unwrapLiftErr` — Flatten deeply nested Errors

The counterpart to `unwrapLift` for the error path:

```typescript
const nested = Result.err(Result.err(Result.err('root cause')))

const error = Result.unwrapLiftErr(nested) // "root cause"
```

---

## Safe Function Wrapping

Wrapping third-party functions or legacy code that throws? These helpers convert exceptions into `Result` values — no try/catch required at the call site.

### `safe` — Wrap a synchronous function

```typescript
import { Result } from '@theateros/result'

// JSON.parse throws on invalid input — let's make it safe
const safeParseJSON = Result.safe(JSON.parse)

const ok = safeParseJSON('{"name": "Alice"}')
// Result.Ok<any>

const err = safeParseJSON('not valid json')
// Result.Err<unknown>
```

**With custom error transformation:**

```typescript
type AppError = { code: string; message: string }

const safeParse = Result.safe(
  (json: string) => JSON.parse(json) as User,
  (thrown) => ({
    code: 'PARSE_ERROR',
    message: thrown instanceof Error ? thrown.message : String(thrown),
  }) satisfies AppError
)

const result = safeParse('{"name": "Bob"}')
// Result<User, AppError>
```

**Works with any function signature:**

```typescript
const safeReadFile = Result.safe((path: string, encoding: string) =>
  fs.readFileSync(path, encoding as BufferEncoding)
)

const content = safeReadFile('./config.json', 'utf-8')
// Result<string, unknown>
```

### `asyncSafe` — Wrap an asynchronous function

Same idea, but for `async` functions and Promises:

```typescript
const safeFetch = await Result.asyncSafe(
  async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<ApiResponse>
  },
  (error) => ({ code: 'FETCH_ERROR', message: String(error) })
)

const result = await safeFetch('https://api.example.com/users')
// Promise<Result<ApiResponse, { code: string; message: string }>>

if (Result.isOk(result)) {
  console.log(result.value.users)
}
```

### `safeLifted` — Wrap + flatten in one step

The most powerful wrapper. When your function already returns a `Result` (or might), `safeLifted` catches exceptions **and** flattens nested Results — so you always get a single clean `Result<T, E>`:

```typescript
// A function that returns Result internally
function findUser(id: string): Result<User, 'NOT_FOUND'> {
  if (!userStore.has(id)) return Result.err('NOT_FOUND')
  return Result.ok(userStore.get(id)!)
}

// Without safeLifted: you get Result<Result<User, 'NOT_FOUND'>, unknown> — messy
const naive = Result.safe(findUser)('123')
// Result<Result<User, 'NOT_FOUND'>, unknown> 😕

// With safeLifted: flat, clean, typed
const safeFind = Result.safeLifted(findUser)
const result = safeFind('123')
// Result<User, 'NOT_FOUND'> ✨
```

**The real power — composing multiple Result-returning layers:**

```typescript
const safeGetProfile = Result.safeLifted(
  (userId: string): Result<Profile, ApiError> => {
    const user = Result.unwrap(findUser(userId)) // might throw if Err
    const profile = Result.unwrap(fetchProfile(user)) // might throw if Err
    return Result.ok(profile)
  },
  (error): ApiError => ({
    code: 'PROFILE_ERROR',
    message: String(error),
  })
)

const result = safeGetProfile('user-123')
// Always: Result<Profile, ApiError> — no matter what happened inside
```

### `asyncSafeLifted` — Async wrap + flatten

The async version of `safeLifted`. Perfect for wrapping entire service methods:

```typescript
type DbError = 'CONNECTION_FAILED' | 'QUERY_FAILED' | 'NOT_FOUND'

const safeGetUser = await Result.asyncSafeLifted(
  async (id: string): Promise<Result<User, DbError>> => {
    const row = await db.query('SELECT * FROM users WHERE id = ?', [id])
    if (!row) return Result.err('NOT_FOUND')
    return Result.ok(mapRowToUser(row))
  },
  (): DbError => 'CONNECTION_FAILED'
)

// Use it anywhere — exceptions and nested Results are both handled
const result = await safeGetUser('user-abc')
// Result<User, DbError>

if (Result.isOk(result)) {
  renderUserProfile(result.value)
} else {
  showErrorPage(result.error) // 'NOT_FOUND' | 'CONNECTION_FAILED' | 'QUERY_FAILED'
}
```

---

## Type Utilities

`Result` ships with a set of type-level helpers for working with Result types in generics, mapped types, and conditional types.

### `Result.Unwrap<R>` — Extract the success type

```typescript
type MyResult = Result<User, ApiError>

type SuccessType = Result.Unwrap<MyResult>
// User
```

### `Result.UnwrapErr<R>` — Extract the error type

```typescript
type MyResult = Result<User, ApiError>

type ErrorType = Result.UnwrapErr<MyResult>
// ApiError
```

### `Result.UnwrapLift<R>` — Extract the deeply nested success type

```typescript
type Nested = Ok<Ok<Ok<string>>>

type FlatType = Result.UnwrapLift<Nested>
// string
```

### `Result.UnwrapLiftErr<R>` — Extract the deeply nested error type

```typescript
type Nested = Err<Err<Err<NetworkError>>>

type FlatError = Result.UnwrapLiftErr<Nested>
// NetworkError
```

**Practical usage — building generic utilities:**

```typescript
// A function that works with any Result-returning function
function withLogging<Fn extends (...args: any[]) => Result<any, any>>(fn: Fn) {
  return (...args: Parameters<Fn>): ReturnType<Fn> => {
    const result = fn(...args) as ReturnType<Fn>
    if (Result.isErr(result)) {
      console.error('[Error]', result.error)
    }
    return result
  }
}
```

---

## Putting It All Together

A realistic end-to-end example: a user registration flow with layered error handling.

```typescript
import { Result } from '@theateros/result'

// --- Domain types ---
type User = { id: string; email: string; name: string }
type ValidationError = { field: string; message: string }
type DbError = 'EMAIL_TAKEN' | 'DB_UNAVAILABLE'
type RegistrationError = ValidationError | DbError

// --- Validators (return Results) ---
function validateEmail(email: string): Result<string, ValidationError> {
  if (!email.includes('@')) {
    return Result.err({ field: 'email', message: 'Invalid email address' })
  }
  return Result.ok(email)
}

function validateName(name: string): Result<string, ValidationError> {
  if (name.trim().length < 2) {
    return Result.err({ field: 'name', message: 'Name must be at least 2 characters' })
  }
  return Result.ok(name.trim())
}

// --- Service (wraps DB access) ---
const safeCreateUser = await Result.asyncSafeLifted(
  async (email: string, name: string): Promise<Result<User, DbError>> => {
    // Validate inputs — throw on error to propagate up
    const validEmail = Result.unwrap(validateEmail(email))
    const validName = Result.unwrap(validateName(name))

    const existing = await db.findByEmail(validEmail)
    if (existing) return Result.err('EMAIL_TAKEN')

    const user = await db.create({ email: validEmail, name: validName })
    return Result.ok(user)
  },
  (): DbError => 'DB_UNAVAILABLE'
)

// --- Usage ---
const result = await safeCreateUser('alice@example.com', 'Alice')

if (Result.isOk(result)) {
  console.log('User created:', result.value.id)
} else {
  console.error('Registration failed:', result.error)
}
```

No try/catch. No surprise exceptions. The entire error surface is visible in the types.

---

## API Reference

### Constructors

| Function | Signature | Description |
|---|---|---|
| `Result.ok` | `<T>(value: T) => Ok<T>` | Creates a successful result |
| `Result.err` | `<E>(error: E) => Err<E>` | Creates a failed result |

### Type Guards

| Function | Signature | Description |
|---|---|---|
| `Result.is` | `(value: unknown) => value is Result<T, E>` | Checks if a value is any Result |
| `Result.isOk` | `(value: unknown) => value is Ok<T>` | Checks if a value is an Ok result |
| `Result.isErr` | `(value: unknown) => value is Err<E>` | Checks if a value is an Err result |

### Unwrapping

| Function | Signature | Description |
|---|---|---|
| `Result.unwrap` | `(result, defaultValue?) => T` | Extracts value; uses default or throws on Err |
| `Result.unwrapErr` | `(result, defaultValue?) => E` | Extracts error; uses default or throws on Ok |
| `Result.unwrapLift` | `(result, defaultValue?) => T` | Recursively unwraps nested Ok results |
| `Result.unwrapLiftErr` | `(result, defaultValue?) => E` | Recursively unwraps nested Err results |

### Safe Wrappers

| Function | Description |
|---|---|
| `Result.safe(fn, onError?)` | Wraps a sync function — catches throws, returns `Result` |
| `Result.asyncSafe(fn, onError?)` | Wraps an async function — catches rejections, returns `Promise<Result>` |
| `Result.safeLifted(fn, onError?)` | Like `safe` but also flattens nested `Result` return values |
| `Result.asyncSafeLifted(fn, onError?)` | Like `asyncSafe` but also flattens nested `Result` return values |

### Type Utilities

| Type | Description |
|---|---|
| `Result.Unwrap<R>` | Extracts the success type `T` from `Result<T, E>` |
| `Result.UnwrapErr<R>` | Extracts the error type `E` from `Result<T, E>` |
| `Result.UnwrapLift<R>` | Recursively extracts the success type from nested Results |
| `Result.UnwrapLiftErr<R>` | Recursively extracts the error type from nested Results |

### Errors

| Value | Description |
|---|---|
| `Result.UnwrapErrFailure` | Thrown by `unwrapErr` / `unwrapLiftErr` when called on `Ok` with no fallback |
