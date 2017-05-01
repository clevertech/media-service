const test = require('ava')
const path = require('path')
const env = require('../src/utils/env')()
const config = {}

const bucket = env('AWS_S3_BUCKET')
const mediaService = require('../src')

let mediaClient = null

const getClient = () => {
  if (mediaClient) return Promise.resolve(mediaClient)
  return new Promise((resolve, reject) => {
    const mediaServer = mediaService.startServer(config, () => {
      const port = mediaServer.address().port
      const url = `http://127.0.0.1:${port}/media`
      mediaClient = mediaService.createClient(url)
      resolve(mediaClient)
    })
  })
}

test('Upload image with image operations', t => {
  return getClient()
    .then(mediaClient => {
      const imageOperations = {
        width: 256,
        height: 256,
        autoRotate: true,
        appendExtension: true
      }
      const localPath = path.join(__dirname, 'picture.jpg')
      const destinationPath = 'picture'
      return mediaClient.upload({ localPath, destinationPath, imageOperations })
        .then(response => {
          t.deepEqual(response, {
            url: `https://${bucket}.s3.amazonaws.com/picture.jpg`
          })
        })
    })
})
