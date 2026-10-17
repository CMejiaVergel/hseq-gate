import { describe, it, expect } from 'vitest'

describe('entorno de pruebas', () => {
  it('vitest corre en Node', () => {
    expect(1 + 1).toBe(2)
  })
})
