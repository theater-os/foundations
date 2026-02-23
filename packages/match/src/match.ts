import { Failure } from '@theateros/failure'

/**
 * A namespace that contains the functions and types for matching values.
 */
export namespace Match {
  /**
   * A symbol that represents the any matcher.
   *
   * @returns The any symbol.
   */
  export const any: unique symbol = Symbol.for('@theateros/match/any')

  /**
   * A predicate function that checks if a value is of a given type.
   *
   * @typeparam T - The type to check.
   *
   * @param value - The value to check.
   *
   * @returns True if the value is of the given type, false otherwise.
   */
  export type Predicate<T> = (value: unknown) => value is T

  /**
   * A matcher function that matches a value against a predicate and returns a result.
   *
   * @typeparam T - The type to match.
   * @typeparam R - The result type.
   *
   * @param predicate - The predicate function to match against.
   * @param value - The value to match.
   *
   * @returns The result of the matcher function.
   */
  export type Matcher<T, R> = [Predicate<T>, (value: T) => R]

  /**
   * A default matcher function that matches a value against the default symbol and returns a result.
   *
   * @typeparam R - The result type.
   *
   * @param value - The value to match.
   *
   * @returns The result of the default matcher function.
   */
  export type DefaultMatcher<R> = [typeof any, (value: unknown) => R]

  /**
   * A list of matchers that can be used to match a value against.
   *
   * @typeparam T - The type to match.
   * @typeparam R - The result type.
   *
   * @param matchers - The list of matchers to match against.
   *
   * @returns The result of the matcher function.
   */
  export type MatcherList<T, R> = [...Matcher<T, R>[], DefaultMatcher<R>]

  /**
   * A failure that is thrown when a value is matched against a list of matchers and no matcher is found.
   *
   * @typeparam T - The type to match.
   * @typeparam R - The result type.
   * @param value - The value that was matched.
   *
   * @returns The failure.
   */
  export class UnhandledMatchCaseFailure extends Failure.named('UnhandledMatchCaseFailure') {}

  /**
   * Matches a value against a list of matchers and returns a result.
   *
   * @typeparam T - The type to match.
   * @typeparam R - The result type.
   *
   * @param matchers - The list of matchers to match against.
   *
   * @throws UnhandledMatchCaseFailure if there is no default matcher at theat
   * end of the matcher list.
   *
   * @returns The result of the matcher function.
   */
  export function of<R>(defaultMatcher: DefaultMatcher<R>): (value: unknown) => R
  export function of<T, R1, R2>(
    matcher: Matcher<T, R1>,
    defaultMatcher: DefaultMatcher<R2>,
  ): (value: unknown) => R1 | R2
  export function of<T1, T2, R1, R2, R3>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    defaultMatcher: DefaultMatcher<R3>,
  ): (value: unknown) => R1 | R2 | R3
  export function of<T1, T2, T3, R1, R2, R3, R4>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    matcher3: Matcher<T3, R3>,
    defaultMatcher: DefaultMatcher<R4>,
  ): (value: unknown) => R1 | R2 | R3 | R4
  export function of<T1, T2, T3, T4, R1, R2, R3, R4, R5>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    matcher3: Matcher<T3, R3>,
    matcher4: Matcher<T4, R4>,
    defaultMatcher: DefaultMatcher<R5>,
  ): (value: unknown) => R1 | R2 | R3 | R4 | R5
  export function of<T1, T2, T3, T4, T5, R1, R2, R3, R4, R5, R6>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    matcher3: Matcher<T3, R3>,
    matcher4: Matcher<T4, R4>,
    matcher5: Matcher<T5, R5>,
    defaultMatcher: DefaultMatcher<R6>,
  ): (value: unknown) => R1 | R2 | R3 | R4 | R5 | R6
  export function of<T1, T2, T3, T4, T5, T6, R1, R2, R3, R4, R5, R6, R7>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    matcher3: Matcher<T3, R3>,
    matcher4: Matcher<T4, R4>,
    matcher5: Matcher<T5, R5>,
    matcher6: Matcher<T6, R6>,
    defaultMatcher: DefaultMatcher<R7>,
  ): (value: unknown) => R1 | R2 | R3 | R4 | R5 | R6 | R7
  export function of<T1, T2, T3, T4, T5, T6, T7, R1, R2, R3, R4, R5, R6, R7, R8>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    matcher3: Matcher<T3, R3>,
    matcher4: Matcher<T4, R4>,
    matcher5: Matcher<T5, R5>,
    matcher6: Matcher<T6, R6>,
    matcher7: Matcher<T7, R7>,
    defaultMatcher: DefaultMatcher<R8>,
  ): (value: unknown) => R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8
  export function of<T1, T2, T3, T4, T5, T6, T7, T8, R1, R2, R3, R4, R5, R6, R7, R8, R9>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    matcher3: Matcher<T3, R3>,
    matcher4: Matcher<T4, R4>,
    matcher5: Matcher<T5, R5>,
    matcher6: Matcher<T6, R6>,
    matcher7: Matcher<T7, R7>,
    matcher8: Matcher<T8, R8>,
    defaultMatcher: DefaultMatcher<R9>,
  ): (value: unknown) => R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9
  export function of<T1, T2, T3, T4, T5, T6, T7, T8, T9, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10>(
    matcher: Matcher<T1, R1>,
    matcher2: Matcher<T2, R2>,
    matcher3: Matcher<T3, R3>,
    matcher4: Matcher<T4, R4>,
    matcher5: Matcher<T5, R5>,
    matcher6: Matcher<T6, R6>,
    matcher7: Matcher<T7, R7>,
    matcher8: Matcher<T8, R8>,
    matcher9: Matcher<T9, R9>,
    defaultMatcher: DefaultMatcher<R10>,
  ): (value: unknown) => R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10
  // biome-ignore lint/suspicious/noExplicitAny: type inference is done above
  export function of<const MS extends MatcherList<any, any>>(
    ...matchers: MS
  ): (value: unknown) => ReturnType<MS[number][1]>
  // biome-ignore lint/suspicious/noExplicitAny: type inference is done above
  export function of<R>(...matchers: MatcherList<any, any>) {
    return (value: unknown): R => {
      for (const [predicate, result] of matchers) {
        if (predicate === any) {
          return result(value)
        }

        if (predicate(value)) {
          return result(value)
        }
      }

      throw new UnhandledMatchCaseFailure(
        `No default matcher found for value has been provided.
      Make sure to provide a default matcher at the end of the matcher list.`,
      )
    }
  }
}
