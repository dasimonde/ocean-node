import { P2PCommandResponse } from '../../@types/OceanNode.js'
import { Command } from '../../@types/commands.js'
import { SUPPORTED_PROTOCOL_COMMANDS } from '../../utils/constants.js'
import { isDevelopmentEnvironment } from '../../utils/logging/Logger.js'
import { CORE_LOGGER } from '../../utils/logging/common.js'

export type ValidateParams = {
  valid: boolean
  reason?: string
  status?: number
}

export function validateBroadcastParameters(requestBody: any): ValidateParams {
  // for now we can use the same validation function,
  // but later we might need to have separate validation functions
  // if we many different commands of each type
  return validateCommandParameters(requestBody, [])
}

// request level validation, just check if we have a "command" field and its a supported one
// each command handler is responsible for the reamining validatio of the command fields
export function validateCommandParameters(
  commandData: any,
  requiredFields: string[]
): ValidateParams {
  if (!commandData) {
    return buildInvalidRequestMessage('Missing request body/data')
  }

  const commandStr: string = commandData.command as string

  if (!commandStr) {
    return buildInvalidRequestMessage('Invalid Request: "command" is mandatory!')
  }
  // direct commands
  else if (!SUPPORTED_PROTOCOL_COMMANDS.includes(commandStr)) {
    return buildInvalidRequestMessage(`Invalid or unrecognized command: "${commandStr}"`)
  }

  if (isDevelopmentEnvironment()) {
    CORE_LOGGER.debug(
      `Checking received command data for Command "${commandStr}": ${commandData}`
    )
  }
  console.log('received data:', commandData)

  for (const field of requiredFields) {
    if (
      !Object.hasOwn(commandData as Command, field) ||
      commandData[field] === undefined ||
      commandData[field] === null
    ) {
      return {
        valid: false,
        status: 400,
        reason: `Missing one ( "${field}" ) or more required field(s) for command: "${commandStr}". Required fields: ${requiredFields}`
      }
    }
  }
  return {
    valid: true
  }
}

// aux function as we are repeating same block of code all the time, only thing that changes is reason msg
export function buildInvalidRequestMessage(cause: string): ValidateParams {
  return {
    valid: false,
    status: 400,
    reason: cause
  }
}
// always send same response
export function buildInvalidParametersResponse(
  validation: ValidateParams
): P2PCommandResponse {
  return {
    stream: null,
    status: { httpStatus: validation.status, error: validation.reason }
  }
}
