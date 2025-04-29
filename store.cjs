const { readFileSync } = require('fs')
const { WalletClient, StorageUploader, Utils } = require('@bsv/sdk')

const wallet = new WalletClient('auto', 'deggen.com')

async function run () {
    await wallet.isAuthenticated({})
    const uploader = new StorageUploader({
        storageURL: 'https://007a05d0f3af.ngrok.app',
        wallet
    })
    const uploadRes = await uploader.publishFile({
        file: {
            data: Utils.toArray(readFileSync('meritorious-penny.txt')),
            type: 'text/plain'
        },
        retentionPeriod: 3600
    })
    console.log({ uploadRes })
}

run()
