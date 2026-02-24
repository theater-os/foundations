import { describe, it, expect } from 'bun:test'
import { Result } from '@theateros/result'
import * as z from 'zod'
import { Entity } from './entity'

describe('Entity', () => {
  it('creates a brand new entity using zod', async () => {
    const User = Entity.of({
      id: 'User',
      schema: z.object({
        email: z.email(),
        name: z.string(),
      }),
    })

    const johnResult = await User({
      name: 'John Doe',
      email: 'john.doe@mail.com',
    })

    expect(Result.isOk(johnResult)).toBe(true)
    expect(Result.unwrap(johnResult)).toMatchInlineSnapshot(`
      {
        [Symbol(@theateros/entity/brand)]: "User",
        "email": "john.doe@mail.com",
        "name": "John Doe",
      }
    `)
  })

  it('handles any validation failures and issues in failure', async () => {
    const User = Entity.of({
      id: 'User',
      schema: z.object({
        email: z.email(),
        name: z.string(),
      }),
    })

    const johnResult = await User({
      name: 'John Doe',
      email: 'invalid email',
    })

    expect(Result.isOk(johnResult)).toBe(false)

    if (Result.isErr(johnResult) && johnResult.error instanceof Entity.InvalidEntityFailure) {
      expect(johnResult.error.options?.issues).not.toBeEmpty()
      expect(johnResult.error.options?.issues).toMatchInlineSnapshot(`
        [
          {
            "code": "invalid_format",
            "format": "email",
            "message": "Invalid email address",
            "origin": "string",
            "path": [
              "email",
            ],
            "pattern": "/^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$/",
          },
        ]
      `)
    }
  })

  describe('Entity.branded', () => {
    it('attaches a brand to the object', () => {
      const data = { name: 'John' }
      const brandedResult = Entity.branded(data, 'User')

      expect(Result.isOk(brandedResult)).toBe(true)
      expect(Entity.isBranded(Result.unwrap(brandedResult), 'User')).toBe(true)
    })

    it('preserves the original data properties', () => {
      const data = { name: 'John', age: 30 }
      const branded = Result.unwrap(Entity.branded(data, 'User'))

      expect(branded.name).toBe('John')
      expect(branded.age).toBe(30)
    })

    it('creates a deep clone with the brand attached', () => {
      const data = { name: 'John' }
      const branded = Result.unwrap(Entity.branded(data, 'User'))

      expect(branded).toMatchObject(data)
      expect(branded).not.toBe(data)
    })
  })

  describe('Entity.isBranded', () => {
    it('returns true when data is branded with the correct string id', () => {
      const branded = Result.unwrap(Entity.branded({ name: 'John' }, 'User'))

      expect(Entity.isBranded(branded, 'User')).toBe(true)
    })

    it('returns false when data is branded with a different id', () => {
      const branded = Result.unwrap(Entity.branded({ name: 'John' }, 'User'))

      expect(Entity.isBranded(branded, 'Product')).toBe(false)
    })

    it('returns falsy when data has no brand', () => {
      const plain = { name: 'John' }

      expect(Entity.isBranded(plain, 'User')).toBeFalsy()
    })

    it('works with symbol ids', () => {
      const UserID = Symbol('User')
      const branded = Result.unwrap(Entity.branded({ name: 'John' }, UserID))

      expect(Entity.isBranded(branded, UserID)).toBe(true)
    })

    it('returns false when comparing two distinct symbol ids', () => {
      const UserID = Symbol('User')
      const OtherID = Symbol('User')
      const branded = Result.unwrap(Entity.branded({ name: 'John' }, UserID))

      expect(Entity.isBranded(branded, OtherID)).toBe(false)
    })

    it('allows functions to receive the exact branded type', () => {
      type User = Entity.Branded<{ name: string }>

      const john = Result.unwrap(Entity.branded({ name: 'john' }, 'User'))
      const rose = { name: 'rose' }

      function getName(user: User) {
        return user.name
      }

      expect(getName(john)).toBe('john')

      // @ts-expect-error - branded type prevent this usage
      expect(getName(rose)).toBe('rose')
    })
  })

  describe('Entity.of - factory properties', () => {
    it('exposes the id on the factory', () => {
      const schema = z.object({ name: z.string() })
      const User = Entity.of({ id: 'User', schema })

      expect(User.id).toBe('User')
    })

    it('exposes the schema on the factory', () => {
      const schema = z.object({ name: z.string() })
      const User = Entity.of({ id: 'User', schema })

      expect(User.schema).toBe(schema)
    })

    it('exposes extra properties passed in the creation payload', () => {
      const schema = z.object({ name: z.string() })
      const User = Entity.of({ id: 'User', schema, tableName: 'users' })

      expect(User.tableName).toBe('users')
    })

    it('allows extra factories using the extra properties', async () => {
      type Contact = {
        username: string
      }

      const schema = z.object({ name: z.string() })
      const User = Entity.of({
        id: 'User',
        schema,
        fromContact: (contact: Contact) => User({ name: contact.username }),
      })

      const john = await User.fromContact({
        username: 'John Doe',
      })

      expect(Result.unwrap(john)).toMatchObject({ name: 'John Doe' })
    })
  })

  it('accepts a symbol as the entity id', async () => {
    const UserID = Symbol('User')
    const User = Entity.of({
      id: UserID,
      schema: z.object({ name: z.string() }),
    })

    const result = await User({ name: 'Alice' })

    expect(Result.isOk(result)).toBe(true)
    expect(Entity.isBranded(Result.unwrap(result), UserID)).toBe(true)
  })

  it('collects all issues when multiple fields are invalid', async () => {
    const User = Entity.of({
      id: 'User',
      schema: z.object({
        email: z.email(),
        name: z.string().min(3),
      }),
    })

    const result = await User({ name: 'Jo', email: 'not-an-email' })

    expect(Result.isOk(result)).toBe(false)

    if (Result.isErr(result) && result.error instanceof Entity.InvalidEntityFailure) {
      expect(result.error.options?.issues).toHaveLength(2)
    }
  })

  it('brands the entity with its own factory id and not another', async () => {
    const User = Entity.of({ id: 'User', schema: z.object({ name: z.string() }) })
    const Product = Entity.of({ id: 'Product', schema: z.object({ title: z.string() }) })

    const userResult = await User({ name: 'Alice' })

    expect(Result.isOk(userResult)).toBe(true)

    const user = Result.unwrap(userResult)

    expect(Entity.isBranded(user, 'User')).toBe(true)
    expect(Entity.isBranded(user, 'Product')).toBe(false)
    expect(User.id).not.toBe(Product.id)
  })

  it('returns UnexpectedFailure when the schema throws', async () => {
    const throwingSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'test',
        validate: (): never => {
          throw new Error('Schema exploded')
        },
      },
    }

    // biome-ignore lint/suspicious: intentional any for test purposes
    const Broken = Entity.of({ id: 'Broken', schema: throwingSchema as any })
    const result = await Broken({ name: 'test' })

    expect(Result.isOk(result)).toBe(false)

    if (Result.isErr(result)) {
      expect(result.error).toBeInstanceOf(Entity.UnexpectedFailure)
    }
  })
})
