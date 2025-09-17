import { MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'
import { hasDirective, validateRecursivelyForInput } from './helpers.js'

export function validateAddressDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const { resolve = defaultFieldResolver } = fieldConfig
      fieldConfig.resolve = async (source, args, context, info) => {
        const argDefs = fieldConfig.args || {}
        for (const [argName, argDef] of Object.entries(argDefs)) {
          if (hasDirective(schema, argDef, 'excludeFromValidation')) continue
          const value = args[argName]
          if (value == null) continue
          validateRecursivelyForInput(
            'AddressInput',
            validateAddressInput,
            schema,
            argDef.type,
            value,
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
  if (!input) return

  const { uprn, line1, city, postalCode, country } = input
  const hasFullAddress = line1 && city && postalCode && country

  if (!uprn && !hasFullAddress) {
    throw new Error(
      "Either 'uprn' must be provided, or all of 'line1', 'city', 'postalCode', and 'country' must be provided."
    )
  }
}
