import { gql, GraphQLClient } from 'graphql-request'

const targetURL = process.env.TARGET_URL ?? 'http://localhost:3000/graphql'

const isCustomerEmailAvailableQuery = gql`
  query IsCustomerEmailAvailable($email: String!) {
    isCustomerEmailAvailable(email: $email)
  }
`

describe('isCustomerEmailAvailable Query', () => {
  it('should report a known email address as unavailable', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      isCustomerEmailAvailableQuery,
      { email: 'skeleton@the-closet.net' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.isCustomerEmailAvailable).toBe(false)
  })

  it('should report an unknown email address as available', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      isCustomerEmailAvailableQuery,
      { email: 'nobody-with-this-address@example.com' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.isCustomerEmailAvailable).toBe(true)
  })

  it('should match known email addresses case-insensitively', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      isCustomerEmailAvailableQuery,
      { email: 'SKELETON@THE-CLOSET.NET' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.isCustomerEmailAvailable).toBe(false)
  })

  it('should correctly handle email addresses containing characters that are meaningful in a URL', async () => {
    const client = new GraphQLClient(targetURL)
    const response = await client.request(
      isCustomerEmailAvailableQuery,
      { email: 'nobody+with-a-plus/and-a-slash@example.com' },
      { email: 'some-email' }
    )

    expect(response).not.toHaveProperty('errors')
    expect(response.isCustomerEmailAvailable).toBe(true)
  })
})
