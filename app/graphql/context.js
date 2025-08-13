import { getAuth } from '../auth/authenticate.js'
import { config } from '../config.js'
import { RuralPaymentsBusiness } from '../data-sources/rural-payments/RuralPaymentsBusiness.js'
import { RuralPaymentsCustomer } from '../data-sources/rural-payments/RuralPaymentsCustomer.js'
import { Permissions } from '../data-sources/static/permissions.js'
import { logger } from '../logger/logger.js'

export async function context({ request }) {
  const auth = await getAuth(request)

  const requestLogger = logger.child({
    transactionId: request.transactionId,
    traceId: request.traceId
  })

  const datasourceOptions = [
    { logger: requestLogger },
    {
      request,
      gatewayUrl: request.headers['external-crn']
        ? config.get('kits.gatewayUrl')
        : config.get('kits.gatewayUrl') // same url in this example, but would be different based on token
    }
  ]

  return {
    auth,
    requestLogger,
    dataSources: {
      permissions: new Permissions(...datasourceOptions),
      ruralPaymentsBusiness: new RuralPaymentsBusiness(...datasourceOptions),
      ruralPaymentsCustomer: new RuralPaymentsCustomer(...datasourceOptions)
    },
    external: {
      customer: {
        crn: request.headers['external-crn'] // value from header as example, but would come from token
      }
    }
  }
}
