import { describe, it } from 'bun:test'
import { Result } from '@theateros/result'
import { Operation } from './operation'

describe('Operation', () => {
  it('wrap any function into a safe one', async () => {
    const johnPayload = {
      data: Result.ok('john'),
      services: {},
    }

    const test = Operation.of((payload: typeof johnPayload) => {
      if (!Result.isOk(payload.data)) {
        return payload
      }

      return payload.data.value.toUpperCase()
    })

    const result = await test(johnPayload)

    console.warn(result)
  })
})
