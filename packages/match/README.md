# Theater OS - Match

<p align="center">
  <img src="../../.etc/assets/match-logo.webp" alt="Theater OS - Foundations - Match">
</p>

A type-safe pattern matching library for TypeScript that provides a functional approach to handling multiple value types with exhaustive checking and type narrowing.

## Why Match?

Pattern matching is a powerful programming concept that allows you to check a value against a series of patterns and execute code based on which pattern matches. While JavaScript has `switch` statements and `if-else` chains, they have limitations:

- **No type narrowing**: `switch` doesn't narrow types based on the matched case
- **No exhaustiveness checking**: It's easy to forget to handle all cases
- **Verbose syntax**: Multiple conditions require repetitive `if-else` blocks
- **No functional composition**: Hard to use in functional pipelines

`Match` addresses these issues by providing:

- **Type-safe pattern matching**: TypeScript narrows types based on matched predicates
- **Exhaustive matching**: The `Match.any` catch-all ensures all cases are handled
- **Functional style**: Returns a reusable matcher function for use in pipelines
- **Custom predicates**: Define your own type guards for complex matching logic
- **Composable**: Works well with other functional programming patterns

## Installation

```bash
npm install @theateros/match
```

## Getting Started

### Basic Usage

```typescript
import { Match } from "@theateros/match";

// Define type predicates
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";

// Create a matcher
const describe = Match.of(
  [isString, (value) => `String: ${value}`],
  [isNumber, (value) => `Number: ${value}`],
  [Match.any, () => "Unknown type"],
);

// Use the matcher
console.log(describe("hello")); // "String: hello"
console.log(describe(42)); // "Number: 42"
console.log(describe(null)); // "Unknown type"
```

### Creating Predicates

Predicates are type guard functions that check if a value matches a specific type:

```typescript
import { Match } from "@theateros/match";

// Simple type predicates
const isString: Match.Predicate<string> = (value) => typeof value === "string";

const isNumber: Match.Predicate<number> = (value) => typeof value === "number";

const isBoolean: Match.Predicate<boolean> = (value) => typeof value === "boolean";

const isNull: Match.Predicate<null> = (value) => value === null;

const isArray: Match.Predicate<unknown[]> = (value) => Array.isArray(value);
```

### Matching with Multiple Patterns

Chain multiple matchers to handle different types:

```typescript
import { Match } from "@theateros/match";

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const toDisplayValue = Match.of(
  [isString, (value) => value.toUpperCase()],
  [isNumber, (value) => value.toFixed(2)],
  [isBoolean, (value) => (value ? "Yes" : "No")],
  [Match.any, () => "N/A"],
);

console.log(toDisplayValue("hello")); // "HELLO"
console.log(toDisplayValue(3.14159)); // "3.14"
console.log(toDisplayValue(true)); // "Yes"
console.log(toDisplayValue(null)); // "N/A"
```

### Working with Custom Types

Match complex object types using custom predicates:

```typescript
import { Match } from "@theateros/match";

interface User {
  type: "user";
  name: string;
}

interface Admin {
  type: "admin";
  name: string;
  permissions: string[];
}

const isUser: Match.Predicate<User> = (value): value is User =>
  typeof value === "object" && value !== null && (value as User).type === "user";

const isAdmin: Match.Predicate<Admin> = (value): value is Admin =>
  typeof value === "object" && value !== null && (value as Admin).type === "admin";

const getWelcomeMessage = Match.of(
  [isAdmin, (admin) => `Welcome Admin ${admin.name}! You have ${admin.permissions.length} permissions.`],
  [isUser, (user) => `Welcome ${user.name}!`],
  [Match.any, () => "Welcome Guest!"],
);

const user: User = { type: "user", name: "John" };
const admin: Admin = { type: "admin", name: "Jane", permissions: ["read", "write"] };

console.log(getWelcomeMessage(user)); // "Welcome John!"
console.log(getWelcomeMessage(admin)); // "Welcome Admin Jane! You have 2 permissions."
console.log(getWelcomeMessage(null)); // "Welcome Guest!"
```

### Discriminated Unions

Match works great with discriminated unions:

```typescript
import { Match } from "@theateros/match";

type Success = { status: "success"; data: string };
type Error = { status: "error"; message: string };
type Loading = { status: "loading" };
type State = Success | Error | Loading;

const isSuccess: Match.Predicate<Success> = (value): value is Success =>
  typeof value === "object" && value !== null && (value as Success).status === "success";

const isError: Match.Predicate<Error> = (value): value is Error =>
  typeof value === "object" && value !== null && (value as Error).status === "error";

const isLoading: Match.Predicate<Loading> = (value): value is Loading =>
  typeof value === "object" && value !== null && (value as Loading).status === "loading";

const renderState = Match.of(
  [isSuccess, (state) => `Data: ${state.data}`],
  [isError, (state) => `Error: ${state.message}`],
  [isLoading, () => "Loading..."],
  [Match.any, () => "Unknown state"],
);

console.log(renderState({ status: "success", data: "Hello" })); // "Data: Hello"
console.log(renderState({ status: "error", message: "Oops" })); // "Error: Oops"
console.log(renderState({ status: "loading" })); // "Loading..."
```

### Using in Functional Pipelines

The matcher returns a function, making it perfect for functional composition:

```typescript
import { Match } from "@theateros/match";

const isNumber = (value: unknown): value is number => typeof value === "number";

const normalizeValue = Match.of([isNumber, (value) => value], [Match.any, () => 0]);

// Use in array operations
const values = ["hello", 42, null, 3.14, "world", 100];
const normalized = values.map(normalizeValue);
// [0, 42, 0, 3.14, 0, 100]

const sum = normalized.reduce((a, b) => a + b, 0);
// 145.14
```

### Different Return Types

Each matcher can return a different type:

```typescript
import { Match } from "@theateros/match";

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";

const transform = Match.of(
  [isString, (value) => ({ type: "text", content: value })],
  [isNumber, (value) => ({ type: "numeric", value: value })],
  [Match.any, () => null],
);

// TypeScript infers the return type as:
// { type: 'text', content: string } | { type: 'numeric', value: number } | null
```

## API Reference

### `Match` Namespace

The main namespace containing all Match utilities.

#### Constants

- **`Match.any`**: A unique symbol used as a catch-all matcher that matches any value

#### Types

- **`Match.Predicate<T>`**: A type guard function `(value: unknown) => value is T`
- **`Match.Matcher<T, R>`**: A tuple of `[Predicate<T>, (value: T) => R]`
- **`Match.DefaultMatcher<R>`**: A tuple of `[typeof Match.any, (value: unknown) => R]`
- **`Match.MatcherList<T, R>`**: A list of matchers ending with a default matcher

#### Static Methods

- **`Match.of(...matchers)`**: Creates a matcher function from a list of matchers

  ```typescript
  Match.of<R>(defaultMatcher: DefaultMatcher<R>): (value: unknown) => R
  Match.of<T, R1, R2>(
    matcher: Matcher<T, R1>,
    defaultMatcher: DefaultMatcher<R2>
  ): (value: unknown) => R1 | R2
  // ... supports up to 10 matchers
  ```

#### Classes

- **`Match.UnhandledMatchCaseFailure`**: A failure thrown when no matcher is found (should not happen when using `Match.any`)

## Best Practices

1. **Always end with `Match.any`**: This ensures exhaustive matching and prevents runtime errors

2. **Order matters**: Matchers are evaluated in order; put more specific predicates first

3. **Keep predicates pure**: Predicates should only check types without side effects

4. **Reuse predicates**: Define predicates once and reuse them across matchers

5. **Use descriptive names**: Name predicates clearly (e.g., `isValidEmail`, `isAdminUser`)
