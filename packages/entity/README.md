# Theater OS - Entity

<p align="center">
  <img src="../../.etc/assets/entities.webp" alt="Theater OS - Foundations - Entity">
</p>

The missing building block for Clean Architecture in TypeScript. Create validated, branded, type-safe domain entities from any schema library — with zero boilerplate and zero compromise.

## Why Entity?

In Clean Architecture, **entities are the heart of your domain**. They represent the most stable, most important business concepts in your system. Yet in most TypeScript codebases, "entity" is just a plain object that anyone can construct, pass around, or mutate without validation.

The problems this creates are real:

- **No validation boundary**: Raw data from HTTP requests, databases, or message queues flows unchecked into your domain logic
- **No type distinction**: A `User` object from your repository looks identical to raw untrusted input — TypeScript can't tell them apart
- **No factory contract**: Any piece of code can instantiate a "User" however it wants, skipping invariants
- **Adapter lock-in**: Switching schema libraries (Zod → Valibot → ArkType) requires rewriting all your entity code

`@theateros/entity` solves all of these by providing:

- **Validated construction**: Every entity goes through schema validation before it exists in your domain
- **Branded types**: Entities carry an invisible type-level brand that proves they came from the right factory
- **Standard Schema plug-and-play**: Works with any library implementing `@standard-schema/spec` — Zod, Valibot, ArkType, and [many more](https://standardschema.dev/)
- **Result-based safety**: No exceptions — creation either succeeds with a typed value or fails with structured, actionable errors
- **Extensible factories**: Attach custom constructors, metadata, and sub-factories directly to the entity factory

## Installation

```bash
npm install @theateros/entity
```

## Getting Started

### Your First Entity

Define an entity by giving it a unique identifier and a schema from your favourite library:

```typescript
import { Entity } from '@theateros/entity'
import * as z from 'zod'

const User = Entity.of({
  id: 'User',
  schema: z.object({
    email: z.email(),
    name: z.string().min(2),
  }),
})

// Create a user — always async, always safe
const result = await User({ name: 'Alice', email: 'alice@example.com' })

if (Result.isOk(result)) {
  console.log(result.value) // { name: 'Alice', email: 'alice@example.com', [brand]: 'User' }
}
```

### Plug Your Schema Library

`@theateros/entity` is built on the [`@standard-schema/spec`](https://standardschema.dev/). Any compatible library works out of the box — no adapters, no extra packages:

```typescript
import { Entity } from '@theateros/entity'

// With Zod
import * as z from 'zod'
const UserWithZod = Entity.of({ id: 'User', schema: z.object({ name: z.string() }) })

// With Valibot
import * as v from 'valibot'
const UserWithValibot = Entity.of({ id: 'User', schema: v.object({ name: v.string() }) })

// With ArkType
import { type } from 'arktype'
const UserWithArkType = Entity.of({ id: 'User', schema: type({ name: 'string' }) })
```

Switch schema library any time, your entity API stays identical.

### Handling Validation Failures

When input is invalid, the factory returns an `InvalidEntityFailure` that carries the full list of validation issues straight from your schema library:

```typescript
import { Entity } from '@theateros/entity'
import { Result } from '@theateros/result'
import * as z from 'zod'

const User = Entity.of({
  id: 'User',
  schema: z.object({
    email: z.email(),
    name: z.string().min(2),
  }),
})

const result = await User({ name: 'J', email: 'not-an-email' })

if (Result.isErr(result) && result.error instanceof Entity.InvalidEntityFailure) {
  // issues is typed as StandardSchemaV1.Issue[]
  for (const issue of result.error.options.issues) {
    console.log(`[${issue.path?.join('.')}] ${issue.message}`)
  }
  // [name] Too short
  // [email] Invalid email address
}
```

All three failure types are precisely typed so you can handle each case in your application layer:

```typescript
import { Entity } from '@theateros/entity'
import { Result } from '@theateros/result'

const result = await User(rawInput)

if (Result.isErr(result)) {
  switch (true) {
    case result.error instanceof Entity.InvalidEntityFailure:
      // User-facing validation errors — safe to surface
      return { status: 422, issues: result.error.options.issues }

    case result.error instanceof Entity.DataCloneFailure:
      // The data could not be safely cloned — check your schema output
      return { status: 500, message: 'Entity could not be created safely' }

    case result.error instanceof Entity.UnexpectedFailure:
      // Something blew up in the schema itself — treat as internal error
      return { status: 500, message: 'Unexpected error' }
  }
}
```

## Branded Types

The most powerful feature of `@theateros/entity` is the **branded type system**. Every entity created by a factory carries an invisible brand at the type level, proving exactly where it came from.

### Why Branding Matters

Without branding, TypeScript can't distinguish a validated `User` from raw user-shaped data:

```typescript
type User = { name: string; email: string }
type AdminPayload = { name: string; email: string }

// TypeScript accepts this — they're structurally identical
function sendWelcomeEmail(user: User) { ... }
sendWelcomeEmail({ name: 'Hacker', email: 'injection@evil.com' }) // no error!
```

With branding, only data produced by the `User` factory is accepted:

```typescript
import { Entity } from '@theateros/entity'
import { Result } from '@theateros/result'
import * as z from 'zod'

const User = Entity.of({
  id: 'User',
  schema: z.object({ name: z.string(), email: z.email() }),
})

// Infer the branded entity type from the factory
type User = Entity.Infer<typeof User>

function sendWelcomeEmail(user: User) {
  console.log(`Welcome, ${user.name}!`)
}

// Only a validated User passes — raw objects are rejected at compile time
const result = await User({ name: 'Alice', email: 'alice@example.com' })

if (Result.isOk(result)) {
  sendWelcomeEmail(result.value) // OK
}

sendWelcomeEmail({ name: 'Alice', email: 'alice@example.com' }) // TypeScript error!
```

### Brands Are Unique Per Factory

Two entities with different IDs have different brands — even if their schemas are structurally identical:

```typescript
const User    = Entity.of({ id: 'User',    schema: z.object({ name: z.string() }) })
const Contact = Entity.of({ id: 'Contact', schema: z.object({ name: z.string() }) })

type User    = Entity.Infer<typeof User>
type Contact = Entity.Infer<typeof Contact>

function greetUser(user: User) { ... }

const contactResult = await Contact({ name: 'Bob' })

if (Result.isOk(contactResult)) {
  greetUser(contactResult.value) // TypeScript error — Contact is not a User
}
```

Your domain functions become self-documenting: if it compiles, the right data came from the right factory.

### Runtime Brand Checks

For cases where you need to verify a brand at runtime (e.g., after deserialisation or crossing a boundary):

```typescript
import { Entity } from '@theateros/entity'
import { Result } from '@theateros/result'

const userResult = await User({ name: 'Alice', email: 'alice@example.com' })
const alice = Result.unwrap(userResult)

Entity.isBranded(alice, 'User')    // true
Entity.isBranded(alice, 'Contact') // false — different id
Entity.isBranded({}, 'User')       // false — never branded
```

`Entity.isBranded` is a proper TypeScript type guard, so it narrows the type correctly inside the `if` block.

### Manual Branding

You can brand any value directly, bypassing schema validation, for cases where the data is already trusted (e.g., coming from a verified data store):

```typescript
import { Entity } from '@theateros/entity'
import { Result } from '@theateros/result'

// Branding performs a deep clone via structuredClone for immutability
const result = Entity.branded({ name: 'Alice', email: 'alice@example.com' }, 'User')

if (Result.isOk(result)) {
  const alice = result.value // Branded<{ name: string, email: string }>
}
```

> Note: `Entity.branded` uses `structuredClone` under the hood. If your data contains non-cloneable values (functions, class instances, etc.), it will return a `DataCloneFailure`.

### Symbol IDs for Zero-Collision Guarantees

If string IDs feel too loose, use a `Symbol` instead — symbols are globally unique by construction:

```typescript
const UserID = Symbol('User')

const User = Entity.of({
  id: UserID,
  schema: z.object({ name: z.string() }),
})

const result = await User({ name: 'Alice' })

if (Result.isOk(result)) {
  Entity.isBranded(result.value, UserID)             // true
  Entity.isBranded(result.value, Symbol('User'))     // false — different symbol instance
}
```

## Extending Factories

`Entity.of` accepts any additional properties beyond `id` and `schema`. Those properties are attached directly to the factory function, making it the single point of truth for everything related to your entity.

### Metadata

Attach infrastructure metadata (table names, topic names, cache keys, etc.) to the factory without polluting your domain types:

```typescript
const User = Entity.of({
  id: 'User',
  schema: z.object({ name: z.string(), email: z.email() }),
  tableName: 'users',
  cacheTtl: 3600,
})

// Access metadata anywhere you have the factory
console.log(User.tableName) // 'users'
console.log(User.cacheTtl) // 3600
```

### Alternative Factories

The most powerful extension: attach specialised constructors that produce the same branded entity from different shapes of input.

```typescript
import { Entity } from '@theateros/entity'
import { Result } from '@theateros/result'
import * as z from 'zod'

type GoogleProfile = { sub: string; email: string; name: string }
type DatabaseRow   = { id: number; email: string; display_name: string }

const User = Entity.of({
  id: 'User',
  schema: z.object({
    email: z.email(),
    name: z.string(),
  }),

  // Alternative factory: build a User from a Google OAuth profile
  fromGoogleProfile: (profile: GoogleProfile) =>
    User({ email: profile.email, name: profile.name }),

  // Alternative factory: build a User from a database row
  fromDatabaseRow: (row: DatabaseRow) =>
    User({ email: row.email, name: row.display_name }),
})

// All three produce the exact same branded User type
const fromForm        = await User({ email: 'alice@example.com', name: 'Alice' })
const fromOAuth       = await User.fromGoogleProfile({ sub: '123', email: 'alice@google.com', name: 'Alice' })
const fromDb          = await User.fromDatabaseRow({ id: 1, email: 'alice@example.com', display_name: 'Alice' })
```

This pattern is a natural fit for the **Adapter layer** in Clean Architecture: each adapter knows how to translate its external format into a domain entity. The entity definition stays in the domain, the translation logic lives in the adapter.

### Full Domain Entity Example

Here is what a production-ready entity might look like:

```typescript
import { Entity } from '@theateros/entity'
import { Result } from '@theateros/result'
import * as z from 'zod'

// ─── Schema ─────────────────────────────────────────────────────────────────

const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'admin']),
  createdAt: z.date(),
})

// ─── External shapes ────────────────────────────────────────────────────────

type UserRow = {
  user_id: string
  user_email: string
  user_name: string
  user_role: string
  created_at: string
}

type CreateUserInput = {
  email: string
  name: string
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export const User = Entity.of({
  id: 'User',
  schema: UserSchema,
  tableName: 'users',

  // Called by the infrastructure layer to rehydrate from persistence
  fromRow: (row: UserRow) =>
    User({
      id: row.user_id,
      email: row.user_email,
      name: row.user_name,
      role: row.user_role as 'user' | 'admin',
      createdAt: new Date(row.created_at),
    }),

  // Called by the application layer to create a brand new user
  create: (input: CreateUserInput) =>
    User({
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      role: 'user',
      createdAt: new Date(),
    }),
})

// ─── Inferred type ──────────────────────────────────────────────────────────

export type User = Entity.Infer<typeof User>

// ─── Usage ───────────────────────────────────────────────────────────────────

// Application layer — creating a new user
const result = await User.create({ email: 'alice@example.com', name: 'Alice' })

// Infrastructure layer — rehydrating from the database
const rehydrated = await User.fromRow(rawRow)
```

## API Reference

### `Entity.of(payload)`

Creates an entity factory.

```typescript
Entity.of<I, O, R>({
  id: Entity.ID,
  schema: StandardSchemaV1<I, O>,
  ...extras: R
}): EntityFactory<I, O, R>
```

- **`id`** — Unique identifier for this entity. Can be a `string` or a `Symbol`.
- **`schema`** — Any schema implementing `@standard-schema/spec`.
- **`...extras`** — Any additional properties. They are attached to the returned factory function.

### `Entity.branded(data, id)`

Creates a branded value directly, bypassing schema validation.

```typescript
Entity.branded<T>(data: T, id: Entity.ID): Result<Entity.Branded<T>, Entity.DataCloneFailure>
```

Uses `structuredClone` for immutability. Returns `DataCloneFailure` if the data cannot be cloned.

### `Entity.isBranded(data, id)`

Type guard that checks whether `data` carries the given brand.

```typescript
Entity.isBranded<T>(data: T, id: Entity.ID): data is Entity.Branded<T>
```

### `Entity.Infer<F>`

Utility type to extract the branded entity type from a factory.

```typescript
type User = Entity.Infer<typeof User>
// equivalent to: Entity.Branded<z.infer<typeof UserSchema>>
```

### `EntityFactory<I, O, R>`

The type of a factory produced by `Entity.of`. It is a callable async function with the following shape:

```typescript
type EntityFactory<I, O, R> = {
  (data: unknown): Promise<Result<
    Entity.Branded<O>,
    Entity.UnexpectedFailure | Entity.InvalidEntityFailure | Entity.DataCloneFailure
  >>
  id: Entity.ID
  schema: StandardSchemaV1<I, O>
} & R
```

### Failure Types

| Failure | When it is returned |
|---|---|
| `Entity.InvalidEntityFailure` | Schema validation failed. `options.issues` contains the list of `StandardSchemaV1.Issue`. |
| `Entity.DataCloneFailure` | The validated data could not be deep-cloned via `structuredClone`. |
| `Entity.UnexpectedFailure` | The schema itself threw an exception during validation. |

## Best Practices

1. **One factory per domain concept** — `User`, `Order`, `Product`. Keep each in its own file inside your domain layer.

2. **Export the type alongside the factory** — use `Entity.Infer` so consumers get both the factory and the type from the same import:
   ```typescript
   export const User = Entity.of({ ... })
   export type  User = Entity.Infer<typeof User>
   ```

3. **Use `fromRow` / `create` / `fromEvent` factories** — keep your domain entity clean and let adapters do the translation. The entity factory is the contract; adapters implement it.

4. **Keep schemas inside the domain layer** — your schema is part of your domain invariants. Don't let infrastructure leak into it.

5. **Prefer `Symbol` IDs in large codebases** — string IDs are convenient for debugging; symbol IDs provide compile-time and runtime uniqueness guarantees with no risk of collision.

6. **Always handle all three failure types** — `InvalidEntityFailure` is user-facing, the other two are system errors. Treat them differently in your error handling strategy.

7. **Attach metadata to the factory, not to the type** — `tableName`, `kafkaTopic`, `cacheKey` belong on the factory, not on the entity data. Keep your domain types pure.
