import { getDirective } from '@graphql-tools/utils'
import { isInputObjectType, isNonNullType } from 'graphql'

export function validateRecursivelyForInput(
  inputName,
  validationFunc,
  schema,
  type,
  value,
  argOrFieldDef
) {
  if (isNonNullType(type)) {
    validateRecursivelyForInput(
      inputName,
      validationFunc,
      schema,
      type.ofType,
      value,
      argOrFieldDef
    )
  } else if (isInputObjectType(type)) {
    if (type.name === inputName) {
      if (!getDirective(schema, argOrFieldDef, 'excludeFromValidation')) {
        validationFunc(value)
      }
    } else {
      const fields = type.getFields()
      for (const [key, fieldValue] of Object.entries(value)) {
        const inputField = fields[key]
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
  } else {
    return
  }
}
