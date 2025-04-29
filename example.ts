import { Setup } from '@bsv/wallet-toolbox'
import { PrivateKey } from '@bsv/sdk'

const run = async () => {
    const wallet = await Setup.createWalletClientNoEnv({
        chain: 'main', 
        rootKeyHex: 'a9e0391121fbe020817845b51b96cf0a682828b03197b9e2c3c7f8bd9fe1e9a8',
        storageUrl: 'https://store.bsvb.tech',
        privilegedKeyGetter: async () => {
            return PrivateKey.fromHex('a9e0391121fbe020817845b51b96cf0a682828b03197b9e2c3c7f8bd9fe1e9a8')
        }
    })

    await wallet.isAuthenticated({})
    const outputs = await wallet.listOutputs({
        basket: 'default', 
        limit: 10000
    }, 'admin.com')
    console.log(outputs)
}

run()