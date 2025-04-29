import { WalletClient, PrivateKey, PublicKey, P2PKH, KeyDeriver, WalletInterface, Utils } from '@bsv/sdk'
import type { InternalizeActionArgs } from '@bsv/sdk'
import { randomBytes } from 'crypto'
import chalk from 'chalk'
import { createInterface } from 'readline';
import { Wallet, WalletStorageManager, WalletSigner, Services, StorageClient } from '@bsv/wallet-toolbox'

async function makeWallet (
  chain: 'test' | 'main',
  privateKey: string
): Promise<WalletInterface> {
  const keyDeriver = new KeyDeriver(new PrivateKey(privateKey, 'hex'))
  const storageManager = new WalletStorageManager(keyDeriver.identityKey)
  const signer = new WalletSigner(chain, keyDeriver, storageManager)
  const services = new Services(chain)
  const wallet = new Wallet(signer, services)
  const client = new StorageClient(
    wallet,
    // Hard-code storage URLs for now, but this should be configurable in the future along with the private key.
    'https://storage.babbage.systems'
  )
  await client.makeAvailable()
  await wallet.storage.addWalletStorageProvider(client)

  return wallet
}

async function fundWallet (
  amount: number,
  walletPrivateKey: string,
): Promise<void> {

  const wallet = await makeWallet('main', walletPrivateKey)
  const remote = await wallet.isAuthenticated({})
  console.log({ remote })

  const localWallet = new WalletClient('json-api', 'deggen.com')
  const local = await localWallet.isAuthenticated({})
  console.log({ local })
  try {
    const { version } = await localWallet.getVersion()
    console.log(chalk.blue(`💰 Using local wallet version: ${version}`))
  } catch (err) {
    console.error(
      chalk.red('❌ Metanet Desktop is not installed or not running.')
    )
    console.log(
      chalk.blue('👉 Download Metanet Desktop: https://metanet.bsvb.tech')
    )
    process.exit(1)
  }
  const derivationPrefix = randomBytes(10).toString('base64')
  const derivationSuffix = randomBytes(10).toString('base64')
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
      outputDescription: 'Fund wallet for remote use'
    }
  ]
  const transaction = await localWallet.createAction({
    outputs,
    description: 'Funding wallet for remote use',
    options: {
      randomizeOutputs: false
    }
  })
  const directTransaction: InternalizeActionArgs = {
    tx: transaction.tx as number[],
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
    description: 'Incoming wallet funding payment from local wallet'
  }
  await wallet.internalizeAction(directTransaction)
  console.log(chalk.green('🎉 Wallet funded!'))
  console.log(chalk.blue(`🔗 View on WhatsOnChain: https://whatsonchain.com/tx/${transaction.txid}`))
}

// Create a readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt the user for input
rl.question('Enter wallet private key: ', (walletPrivateKey) => {
  rl.question('Enter amount in satoshis: ', (amount) => {
    if (!walletPrivateKey || !amount) {
      console.error('❌ Missing required input.');
      process.exit(1);
    }

    fundWallet(Number(amount), walletPrivateKey)
      .catch((err) => {
        console.error('❌', err);
        process.exit(1);
      })
      .finally(() => {
        rl.close();
      });
  });
});