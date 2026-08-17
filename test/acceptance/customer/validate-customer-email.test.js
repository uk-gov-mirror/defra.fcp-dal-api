import { gql, GraphQLClient } from 'graphql-request'

const targetURL = process.env.TARGET_URL ?? 'http://localhost:3000/graphql'

const validateCustomerEmailQuery = gql`
  query ValidateCustomerEmail($email: String!) {
    validateCustomerEmail(email: $email) {
      emailDuplicated
    }
  }
`

describe('validateCustomerEmail Query', () => {
  it('should report a known email address as duplicated', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      validateCustomerEmailQuery,
      { email: 'skeleton@the-closet.net' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.validateCustomerEmail).toEqual({ emailDuplicated: true })
  })

  it('should report an unknown email address as not duplicated', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      validateCustomerEmailQuery,
      { email: 'nobody-with-this-address@example.com' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.validateCustomerEmail).toEqual({ emailDuplicated: false })
  })

  it('should match known email addresses case-insensitively', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      validateCustomerEmailQuery,
      { email: 'SKELETON@THE-CLOSET.NET' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.validateCustomerEmail).toEqual({ emailDuplicated: true })
  })

  it('should correctly handle email addresses containing characters that are meaningful in a URL', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      validateCustomerEmailQuery,
      { email: 'nobody+with-a-plus/and-a-slash@example.com' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.validateCustomerEmail).toEqual({ emailDuplicated: false })
  })
})
