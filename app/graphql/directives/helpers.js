import { getDirective } from '@graphql-tools/utils'
import { isInputObjectType, isListType, isNonNullType } from 'graphql'

export function validateRecursivelyForInput(
  inputName,
  validationFunc,
  schema,
  type,
  value,
  argOrFieldDef
) {
  if (value == null) return

  if (isNonNullType(type)) {
    validateRecursivelyForInput(
      inputName,
      validationFunc,
      schema,
      type.ofType,
      value,
      argOrFieldDef
    )
  } else if (isListType(type)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        validateRecursivelyForInput(
          inputName,
          validationFunc,
          schema,
          type.ofType,
          item,
          argOrFieldDef
        )
      }
    }
  } else if (isInputObjectType(type)) {
    if (type.name === inputName) {
      if (!hasDirective(schema, argOrFieldDef, 'excludeFromValidation')) {
        validationFunc(value)
      }
    } else {
      const fields = type.getFields()
      for (const [key, fieldValue] of Object.entries(value)) {
        const inputField = fields[key]
        if (!inputField) continue
        if (hasDirective(schema, inputField, 'excludeFromValidation')) continue

        validateRecursivelyForInput(
          inputName,
          validationFunc,
          schema,
          inputField.type,
          fieldValue,
          inputField
        )
      }
    }
  }
}

export function hasDirective(schema, definition, directiveName) {
  const directives = getDirective(schema, definition, directiveName) || []
  return directives.length > 0
}
