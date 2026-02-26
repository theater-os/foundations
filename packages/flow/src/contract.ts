/**
 * A contract is a special feature of flow that allows a given process to rely
 * on external tools. Think of them as services or dependencies.
 */
export namespace Contract {
  /**
   * This is the shape of a Contract Key used in a contract
   * record
   */
  export type Key = string | symbol

  /**
   * Represent a collection of contract
   */
  export type Collection<K extends Key, V> = Record<K, V>

  /**
   * Represent a collection of unkown contracts
   */
  export type UnknownCollection = Collection<Key, unknown>

  /**
   * Represent a collection of never contracts
   */
  export type NeverCollection = Collection<Key, never>
}
