# Theater OS - Foundations

<p align="center">
  <img src="./.etc/assets/foundation-logo.webp" alt="Theater OS - foundations - logo">
</p>

## 🥸 Presentation

Theater OS - Foundations is a bun monorepo centralizing all open source tools for the Theater OS company. These packages provide type-safe, functional programming utilities for building robust TypeScript applications.

## 📦 Packages

### [@theateros/failure](./packages/failure/README.md)

A domain-specific error class that extends the native `Error` class with additional properties and utilities for type-safe error handling in TypeScript applications.

**Key Features:**

- Type-safe error handling with TypeScript's type system
- Structured error data through options parameter
- Named failures for domain-specific error types
- Consistent static method API

[📖 Read the documentation →](./packages/failure/README.md)

### [@theateros/result](./packages/result/README.md)

A type-safe Result type implementation for TypeScript that provides a functional approach to error handling without throwing exceptions.

**Key Features:**

- Type-safe error handling with explicit error types
- Composable operations without nested try-catch blocks
- No exceptions - errors are values
- Functional style inspired by Rust's `Result<T, E>`

[📖 Read the documentation →](./packages/result/README.md)

### [@theateros/match](./packages/match/README.md)

A type-safe pattern matching library for TypeScript that provides exhaustive checking and type narrowing for handling multiple value types.

**Key Features:**

- Type-safe pattern matching with automatic type narrowing
- Exhaustive matching with `Match.any` catch-all
- Custom predicates for complex matching logic
- Functional and composable design

[📖 Read the documentation →](./packages/match/README.md)

### [@theateros/futur](./packages/futur/README.md)

A lazy, type-safe asynchronous computation wrapper that combines Promises with Result-based error handling, providing deferred execution and built-in cancellation support.

**Key Features:**

- Lazy execution - operations only run when awaited
- Type-safe errors with `Result<T, E>` return types
- Built-in cancellation with `FuturAbortion` API
- Promise interoperability with `async/await`, `Promise.all`, etc.

[📖 Read the documentation →](./packages/futur/README.md)

### [@theateros/entity](./packages/entity/README.md)

The missing building block for Clean Architecture in TypeScript. Create validated, branded, type-safe domain entities from any schema library — with zero boilerplate and zero compromise.

**Key Features:**

- Validated construction — every entity goes through schema validation before it exists in your domain
- Branded types — entities carry an invisible type-level brand that proves they came from the right factory
- Standard Schema plug-and-play — works with Zod, Valibot, ArkType, and any `@standard-schema/spec` compatible library
- Result-based safety — no exceptions, creation either succeeds with a typed value or fails with structured errors
- Extensible factories — attach custom constructors, metadata, and sub-factories directly to the entity factory

[📖 Read the documentation →](./packages/entity/README.md)

### [@theateros/publisher](./packages/publisher/README.md)

A type-safe publish/subscribe implementation for TypeScript that provides structured event broadcasting with topic routing, async subscriber support, and Result-based error isolation.

**Key Features:**

- Type-safe data with generic publisher instances
- Result-based error handling — subscriber errors are isolated, others keep running
- First-class async with sequential awaiting of subscribers
- Topic routing to target specific subscriber groups
- Clean unsubscribe via returned function — no listener reference needed

[📖 Read the documentation →](./packages/publisher/README.md)

## 🚀 Quick Start

Install any package individually:

```bash
npm install @theateros/failure
npm install @theateros/result
npm install @theateros/match
npm install @theateros/futur
npm install @theateros/publisher
npm install @theateros/entity
```

Or install multiple packages:

```bash
npm install @theateros/failure @theateros/result @theateros/match @theateros/futur @theateros/publisher @theateros/entity
```

## 🤝 Contributing

This is a monorepo managed with Bun. Each package is independently versioned and can be used standalone or together.
