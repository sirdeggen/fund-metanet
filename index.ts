import { WalletInterface, WalletClient, PrivateKey, PublicKey, P2PKH } from '@bsv/sdk'
import type { InternalizeActionArgs } from '@bsv/sdk'
import crypto from 'crypto'
import chalk from 'chalk'

async function fundWallet (
  wallet: WalletInterface,
  amount: number,
  walletPrivateKey: string,
  network: 'mainnet' | 'testnet'
) {
  const localWallet = new WalletClient('auto', 'localhost')
  try {
    const { version } = await localWallet.getVersion()
    console.log(chalk.blue(`💰 Using local wallet version: ${version}`))
  } catch (err) {
    console.error(
      chalk.red('❌ MetaNet Client is not installed or not running.')
    )
    console.log(
      chalk.blue('👉 Download MetaNet Client: https://projectbabbage.com/')
    )
    process.exit(1)
  }
  const { network: localNet } = await localWallet.getNetwork()
  if (network !== localNet) {
    console.warn(
      chalk.red(
        `The currently-running MetaNet Client is on ${localNet} but LARS is configured for ${network}. Funding from local wallet is impossible.`
      )
    )
    return
  }
  const derivationPrefix = crypto.randomBytes(10).toString('base64')
  const derivationSuffix = crypto.randomBytes(10).toString('base64')
  const { publicKey: payer } = await localWallet.getPublicKey({
    identityKey: true
  })
  const payee = new PrivateKey(walletPrivateKey, 'hex').toPublicKey().toString()
  const { publicKey: derivedPublicKey } = await localWallet.getPublicKey({
    counterparty: payee,
    protocolID: [2, '3241645161d8'],
    keyID: `${derivationPrefix} ${derivationSuffix}`
  })
  const lockingScript = new P2PKH()
    .lock(PublicKey.fromString(derivedPublicKey).toAddress())
    .toHex()
  const outputs = [
    {
      lockingScript,
      customInstructions: JSON.stringify({
        derivationPrefix,
        derivationSuffix,
        payee
      }),
      satoshis: amount,
      outputDescription: 'Fund LARS for local dev'
    }
  ]
  const transaction = await localWallet.createAction({
    outputs,
    description: 'Funding LARS for development',
    options: {
      randomizeOutputs: false
    }
  })
  const directTransaction: InternalizeActionArgs = {
    tx: transaction.tx,
    outputs: [
      {
        outputIndex: 0,
        protocol: 'wallet payment',
        paymentRemittance: {
          derivationPrefix,
          derivationSuffix,
          senderIdentityKey: payer
        }
      }
    ],
    description: 'Incoming LARS funding payment from local wallet'
  }
  await wallet.internalizeAction(directTransaction)
  console.log(chalk.green('🎉 LARS Wallet funded!'))
}