import { MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'
import { validateRecursivelyForInput } from './helpers.js'

export function validateAddressDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const { resolve = defaultFieldResolver } = fieldConfig
      fieldConfig.resolve = async (source, args, context, info) => {
        const argDefs = fieldConfig.args || {}
        for (const [argName, argDef] of Object.entries(argDefs)) {
          validateRecursivelyForInput(
            'AddressInput',
            validateAddressInput,
            schema,
            argDef.type,
            args[argName],
            argDef
          )
        }
        return resolve(source, args, context, info)
      }
      return fieldConfig
    }
  })
}

export function validateAddressInput(input) {
  const { uprn, line1, city, postalCode, country } = input
  const hasFullAddress = line1 && city && postalCode && country

  if (!uprn && !hasFullAddress) {
    throw new Error(
      "Either 'uprn' must be provided, or all of 'line1', 'city', 'postalCode', and 'country' must be provided."
    )
  }
}
