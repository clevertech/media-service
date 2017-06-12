const test = require('ava')
const fs = require('fs')
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

test('Upload image with image with a buffer', t => {
  return getClient()
    .then(mediaClient => {
      const imageOperations = {
        normalize: true,
        grayscale: true
      }
      const buffer = fs.readFileSync(path.join(__dirname, 'picture.jpg'))
      const destinationPath = 'picture'
      return mediaClient.upload({ buffer, destinationPath, imageOperations })
        .then(response => {
          t.deepEqual(response, {
            url: `https://${bucket}.s3.amazonaws.com/picture`
          })
        })
    })
})

test('Upload image with image with no operations', t => {
  return getClient()
    .then(mediaClient => {
      const localPath = path.join(__dirname, 'picture.jpg')
      const destinationPath = 'picture'
      return mediaClient.upload({ localPath, destinationPath })
        .then(response => {
          t.deepEqual(response, {
            url: `https://${bucket}.s3.amazonaws.com/picture`
          })
        })
    })
})

test('Upload image with image with no operations and a buffer', t => {
  return getClient()
    .then(mediaClient => {
      const buffer = fs.readFileSync(path.join(__dirname, 'picture.jpg'))
      const destinationPath = 'picture'
      return mediaClient.upload({ buffer, destinationPath })
        .then(response => {
          t.deepEqual(response, {
            url: `https://${bucket}.s3.amazonaws.com/picture`
          })
        })
    })
})

test('Fail to upload an image', t => {
  return getClient()
    .then(mediaClient => {
      const imageOperations = {
        width: 256,
        height: 256,
        autoRotate: true,
        appendExtension: true,
        format: 'foo'
      }
      const localPath = path.join(__dirname, 'picture.jpg')
      const destinationPath = 'picture'
      return mediaClient.upload({ localPath, destinationPath, imageOperations })
        .then(response => {
          t.fail('Should have failed because the output format is not valid')
        })
        .catch(err => {
          t.is(err.message, 'Unsupported output format foo')
        })
    })
})
