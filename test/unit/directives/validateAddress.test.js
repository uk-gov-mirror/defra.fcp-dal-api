import { validateAddressInput } from '../../../app/graphql/directives/validateAddress'

describe('validateAddressInput', () => {
  it('does nothing if uprn is provided', () => {
    expect(() => validateAddressInput({ uprn: '123456789' })).not.toThrow()
  })

  it('does nothing if all address fields are provided', () => {
    expect(() =>
      validateAddressInput({
        line1: '123 Main St',
        city: 'London',
        postalCode: 'SW1A 1AA',
        country: 'UK'
      })
    ).not.toThrow()
  })

  it('throws if neither uprn nor full address is provided', () => {
    expect(() => validateAddressInput({})).toThrow(
      "Either 'uprn' must be provided, or all of 'line1', 'city', 'postalCode', and 'country' must be provided."
    )
  })

  it('throws if uprn is missing and line1 is missing', () => {
    expect(() =>
      validateAddressInput({
        city: 'London',
        postalCode: 'SW1A 1AA',
        country: 'UK'
      })
    ).toThrow()
  })

  it('throws if uprn is missing and city is missing', () => {
    expect(() =>
      validateAddressInput({
        line1: '123 Main St',
        postalCode: 'SW1A 1AA',
        country: 'UK'
      })
    ).toThrow()
  })

  it('throws if uprn is missing and postalCode is missing', () => {
    expect(() =>
      validateAddressInput({
        line1: '123 Main St',
        city: 'London',
        country: 'UK'
      })
    ).toThrow()
  })

  it('throws if uprn is missing and country is missing', () => {
    expect(() =>
      validateAddressInput({
        line1: '123 Main St',
        city: 'London',
        postalCode: 'SW1A 1AA'
      })
    ).toThrow()
  })
})
