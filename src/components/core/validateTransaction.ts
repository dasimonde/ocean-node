import { Provider, Contract } from 'ethers'
import { getEventFromTx } from '../../utils/util.js'
import { OrderStartedEvent, OrderReusedEvent } from '../../@types/contracts.js'
import IERC20Template from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IERC20Template.sol/IERC20Template.json' assert { type: 'json' }
import IERC721Template from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IERC721Template.sol/IERC721Template.json' assert { type: 'json' }
import { Interface } from '@ethersproject/abi'

interface ValidateTransactionResponse {
  isValid: boolean
  message: string
}

export async function validateOrderTransaction(
  txId: string,
  userAddress: string,
  provider: Provider,
  dataNftAddress: string,
  datatokenAddress: string
): Promise<ValidateTransactionResponse> {
  // 1. Fetch the transaction receipt and parse for OrderStarted and OrderReused events
  let txReceipt = await provider.getTransactionReceipt(txId)

  // 2. Validate user address
  if (userAddress.toLowerCase() !== txReceipt.from.toLowerCase()) {
    throw new Error('User address does not match the sender of the transaction.')
  }

  // 3. Fetch the event logs
  // Check for OrderReused events
  const orderReusedLogs = getEventFromTx(txReceipt as any, 'OrderReused')

  // If OrderReused event found, fetch the associated OrderStarted transaction
  if (orderReusedLogs.length > 0) {
    const reusedTxId = orderReusedLogs[0].orderTxId
    txReceipt = await provider.getTransactionReceipt(reusedTxId)
  }

  // Now get OrderStarted event logs
  const orderStartedLogs = getEventFromTx(txReceipt as any, 'OrderStarted')

  // Check if the datatoken is deployed using ERC721 contract
  const ERC721Contract = new Contract(dataNftAddress, IERC721Template.abi, provider)

  const isDatatokenDeployed = await ERC721Contract.isDeployed(datatokenAddress)
  if (!isDatatokenDeployed) {
    return {
      isValid: false,
      message: 'Datatoken was not deployed by this DataNFT.'
    }
  }

  // Get the ProviderFee event logs
  const providerFeeEventLogs = getEventFromTx(txReceipt as any, 'ProviderFee')

  // Check if datatoken belongs to the service
  let datatokenBelongsToService = false
  providerFeeEventLogs.forEach((log: any) => {
    const providerData = JSON.parse(log.args.providerData)
    if (
      providerData.dt.toLowerCase() === datatokenAddress.toLowerCase() &&
      providerData.id.toLowerCase() === orderStartedLogs.serviceIndex.toLowerCase()
    ) {
      datatokenBelongsToService = true
    }
  })

  if (!datatokenBelongsToService) {
    return {
      isValid: false,
      message: 'Datatoken does not belong to the service.'
    }
  }

  // TODO: Validate other conditions...

  return {
    isValid: true,
    message: 'Transaction is valid.'
  }
}
