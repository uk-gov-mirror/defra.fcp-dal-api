import { graphql } from 'graphql'
import { authEntities, authEntityServiceName } from '../../app/config.js'
import { context } from '../../app/graphql/context.js'
import { createSchema } from '../../app/graphql/schema.js'

const defaultHeaders = { email: 'test@defra.gov.uk' }
export const makeTestQuery = async (
  source,
  headers,
  isAuthenticated = true,
  variableValues = {},
  authorizedEntityIds = [],
  dropDbOnCompletion = true
) => {
  const ctx = await context({ request: { headers: headers ?? defaultHeaders } })
  const entityId = isAuthenticated
    ? authEntities.ADMIN
    : Object.values(authEntities).find((allowedId) => authorizedEntityIds.includes(allowedId))
  try {
    return await graphql({
      source,
      schema: await createSchema(),
      contextValue: {
        ...ctx,
        auth: {
          entityId,
          serviceName: authEntityServiceName[entityId] ?? 'unknown-unauthorised-service'
        }
      },
      variableValues
    })
  } finally {
    if (dropDbOnCompletion) {
      await ctx.db.dropDatabase()
    }
  }
}
