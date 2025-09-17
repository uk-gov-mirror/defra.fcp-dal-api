import { MapperKind, getDirective, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, isInputObjectType, isListType, isNonNullType } from 'graphql'

export function validateAddressDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const { resolve = defaultFieldResolver } = fieldConfig

      fieldConfig.resolve = async (source, args, context, info) => {
        const argDefs = fieldConfig.args || {}

        for (const [argName, argDef] of Object.entries(argDefs)) {
          // Skip entire arg if @excludeFromValidation is on the argument
          const argDirectives = getDirective(schema, argDef, 'excludeFromValidation') || []
          if (argDirectives.length > 0) continue

          const value = args[argName]
          if (value == null) continue

          validateUntilAddress(argDef.type, value, argDef)
        }

        return resolve(source, args, context, info)
      }

      return fieldConfig
    }
  })

  function validateUntilAddress(type, value, argOrFieldDef) {
    if (value == null) return

    if (isNonNullType(type)) {
      return validateUntilAddress(type.ofType, value, argOrFieldDef)
    }

    if (isListType(type)) {
      if (!Array.isArray(value)) return
      for (const item of value) {
        validateUntilAddress(type.ofType, item, argOrFieldDef)
      }
      return
    }

    if (isInputObjectType(type)) {
      if (type.name === 'AddressInput') {
        // Check if THIS input field is marked with @excludeFromValidation
        const directives = getDirective(schema, argOrFieldDef, 'excludeFromValidation') || []

        if (directives.length === 0) {
          validateAddressInput(value)
        }
        return
      }

      const fields = type.getFields()
      for (const [key, fieldValue] of Object.entries(value)) {
        const inputField = fields[key]
        if (!inputField) continue

        // Skip if @excludeFromValidation is present on this field
        const fieldDirectives = getDirective(schema, inputField, 'excludeFromValidation') || []
        if (fieldDirectives.length > 0) continue

        validateUntilAddress(inputField.type, fieldValue, inputField)
      }
    }
  }
}

export function validateAddressInput(input) {
  if (!input) return

  const { uprn, address1, city, postalCode, country } = input
  const hasFullAddress = address1 && city && postalCode && country

  if (!uprn && !hasFullAddress) {
    throw new Error(
      "Either 'uprn' must be provided, or all of 'address1', 'city', 'postalCode', and 'country' must be provided."
    )
  }
}
