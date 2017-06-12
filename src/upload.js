const fs = require('fs')
const AWS = require('aws-sdk')
const sharp = require('sharp')

module.exports = env => {
  AWS.config.update({
    accessKeyId: env('AWS_KEY'),
    secretAccessKey: env('AWS_SECRET')
  })

  const s3 = new AWS.S3()
  const bucket = env('AWS_S3_BUCKET')

  const formats = {
    png: {
      contentType: 'image/png',
      extension: '.png'
    },
    jpeg: {
      contentType: 'image/jpeg',
      extension: '.jpg'
    },
    webp: {
      contentType: 'image/webp',
      extension: '.webp'
    }
  }

  const transform = (options) => {
    const { buffer, localPath, destinationPath, imageOperations } = options
    if (!imageOperations) {
      return Promise.resolve(
        localPath ? fs.createReadStream(localPath) : Buffer.from(buffer, 'base64')
      )
    }
    const {
      width,
      height,
      resize,
      ignoreAspectRatio,
      autoRotate,
      normalize,
      grayscale,
      appendExtension,
      format,
      jpegOptions,
      pngOptions,
      webpOptions,
      tiffOptions
    } = imageOperations
    const image = sharp(localPath || Buffer.from(buffer, 'base64'))

    if (width || height) {
      image.resize(width, height)
      if (resize === 'max') {
        image.max()
      } else if (resize === 'min') {
        image.min()
      }
      if (ignoreAspectRatio) image.ignoreAspectRatio()
    }

    const setContentType = format => {
      if (!options.contentType) {
        options.contentType = formats[format].contentType
      }
    }

    if (autoRotate) image.rotate()
    if (normalize) image.normalize()
    if (grayscale) image.grayscale()
    if (format) {
      image.toFormat(format)
      setContentType(format)
    }

    image.jpeg(Object.assign({}, jpegOptions, { force: false }))
    image.png(Object.assign({}, pngOptions, { force: false }))
    image.webp(Object.assign({}, webpOptions, { force: false }))
    image.tiff(Object.assign({}, tiffOptions, { force: false }))

    if (!appendExtension) return Promise.resolve(image)
    return Promise.resolve()
      .then(() => {
        if (format) return formats[format]
        return image.metadata()
          .then(metadata => {
            setContentType(metadata.format)
            return formats[metadata.format]
          })
      })
      .then(formatObj => {
        if (formatObj && !destinationPath.endsWith(formatObj.extension)) {
          options.destinationPath = options.destinationPath + formatObj.extension
        }
      })
      .then(() => image)
  }

  return {
    upload (options) {
      return Promise.resolve()
        .then(() => transform(options))
        .then(stream => {
          const { contentType, destinationPath, expires } = options
          const params = {
            Bucket: bucket,
            Body: stream,
            Key: destinationPath,
            Expires: expires,
            ContentType: contentType,
            ACL: 'public-read'
          }
          return new Promise((resolve, reject) => {
            s3.upload(params, {}, (err, data) => {
              err ? reject(err) : resolve({
                url: `https://${bucket}.s3.amazonaws.com/${destinationPath}`
              })
            })
          })
        })
    }
  }
}
