import { describe, expect, it } from 'bun:test'
import { Operation } from './operation'
import { Result } from '@theateros/result'

describe('Operation', () => {
  it('can create and execute any function', async () => {
    const someFn = (name: string) => name.toUpperCase()

    const someOp = Operation.of(someFn)

    console.warn(someOp)

    const result = await someOp.executor({
      data: 'John Doe',
      services: {},
    })

    const nameContext = Result.unwrap(result)

    expect(nameContext.data).toEqual('JOHN DOE')
    expect(nameContext.services).toEqual({})
  })
})
