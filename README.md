# Media service

This microservice exposes a minimal REST interface to manipulate and store media content. At this moment it allows you to upload any file to Amazon S3 and allows you to manipulate images.

## Running as a command line application

The npm package configures an `pnp-media-service` executable. You will pass configuration options
through ENV variables. Check the configuration options below.

## Running as a standalone HTTP server via API

This is the recommended method for running the microservice via API. You can ignore the `MICROSERVICE_PORT` configuration and this will spin up a server at a random port. Then you can obtain the port the server is running by calling `server.address().port`. This way the microservice is not exposed in the same port than your main application and you are sure it will run in an available port.

```javascript
const mediaService = require('pnp-media-service')
const config = {
  /* Check the configuration options below */
}
const server = mediaService.startServer(config, () => {
  const port = server.address().port
  console.log(`Listening on port ${port}! Send an HTTP POST to http://127.0.0.1:${port}/media/upload for uploading files`)
})
```

## Running as an express router

```javascript
const mediaService = require('pnp-media-service')
const config = {
  /* Check the configuration options below */
}
const router = mediaService.createRouter(config)
app.use('/media', router)
```

## Invoking

Invoking the service is as simple as doing an HTTP POST request to `{baseURL}/upload`. The `baseURL` depends on how you are deploying the service. For example if you are running it as an express router mounted in `/media` in a server running at `127.0.0.1:3000` the URL will be: `http(s)://127.0.0.1:3000/media/upload`.

You need to send a JSON body with the following structure:

```javascript
{
  "localPath": "", // Required. Path to the file in the local system
  "destinationPath": "", // Required. Path where the file will be uploaded
  "contentType": "", // Optiona. MIME type of the uploaded file. If not specified the service will try to calculate a proper one
  "expires": 60, // Optional. Number of seconds the file can be cached by an HTTP client
  "imageOperations": { // Optional. Use only when you want to manipulate images
    "width": 100,
    "height": 200,
    "resize": "min",
    "autoRotate": true,
    "normalize": false,
    "appendExtension": true,
    "grayscale": false
  }
}
```

It will return a JSON object with the following structure:

```javascript
{
  "url": "https://{bucket}.s3.amazonaws.com/{finalPath}"
}
```

The `finalPath` might be different to the `destinationPath` if you use `appendExtension=true`.

### Image operations

| Variable | Description |
| --- | --- |
| `width` | Optional. Width of the image |
| `height` | Optional. Height of the image |
| `resize` | Optional. Used only when specifying a `width` or `height`. If not used the resized image is center cropped to the exact size specified. If "min" is used the resized image is as small as possible while ensuring its dimensions are greater than or equal to the `width` and `height` specified. If "max" is used the resized image is as large as possible while ensuring its dimensions are less than or equal to the `width` and `height` specified |
| `ignoreAspectRatio` | Optional. By default when specifying a `width` or `height` the aspect ratio is preserved. If you set `ignoreAspectRatio` to `true` the image will be resized ignoring it |
| `autoRotate` | Optional. Performs an auto-orient based on the EXIF `Orientation` tag |
| `normalize` | Optional. Enhance output image contrast by stretching its luminance to cover the full dynamic range |
| `grayscale` | Optional. Convert to 8-bit greyscale; 256 shades of grey |
| `format` | Optional. Format of the output image. Can be `jpeg`, `png`, `webp` or `tiff`. If not specified the format of the original image will be used if supported |
| `appendExtension` | Optional. If `true` the `destinationPath` will be modified to append an extension to the uploaded file. If you don't specify a `format` and the input image is not `jpeg`, `png`, `webp` or `tiff` the extension might not be calculated and the `destinationPath` will keep untouch. |
| `jpegOptions` | Optional. JPEG codec options. You can use any of the available [sharp jpeg options](http://sharp.dimens.io/en/stable/api-output/#jpeg) except for `force` |
| `pngOptions` | Optional. PNG codec options. You can use any of the available [sharp png options](http://sharp.dimens.io/en/stable/api-output/#png) except for `force` |
| `webpOptions` | Optional. JPEG codec options. You can use any of the available [sharp webp options](http://sharp.dimens.io/en/stable/api-output/#webp) except for `force` |
| `tiffOptions` | Optional. JPEG codec options. You can use any of the available [sharp tiff options](http://sharp.dimens.io/en/stable/api-output/#tiff) except for `force` |

The `contentType` might be calculated if not specified but you specify an image `format` or `appendExtension` is set to `true`.

### Full example

The following code uses `createClient()` to invoke the service. It first spins an HTTP server and finally provides a simple `upload()` function:

```javascript
const mediaService = require('pnp-media-service')

let mediaClient = null
const mediaServer = mediaService.startServer(config, () => {
  const port = mediaServer.address().port
  const url = `http://127.0.0.1:${port}/media/upload`
  mediaClient = mediaService.createClient(url)
})

const upload = (localPath, destinationPath) => {
  const imageOperations = {
    width: 256,
    height: 256,
    autoRotate: true,
    appendExtension: true
  }
  return mediaClient.upload({ localPath, destinationPath, imageOperations })
}
```

## Configuration options

All configuration options can be configured using ENV variables. If using it as an express router, then configuration variables can also be passed as an argument to this method. All ENV variables can be prefixed with `MEDIA_`. Since one value can be configured in many ways some take precedence over others. For example for the `AWS_KEY` variable the value used will be the first found following this list:

- `MEDIA_AWS_KEY` parameter passed to `createRouter()` or `startServer()`
- `AWS_KEY` parameter passed to `createRouter()` or `startServer()`
- `MEDIA_AWS_KEY` ENV variable
- `AWS_KEY` ENV variable

This is the list of available configuration options:

| Variable | Description |
| --- | --- |
| `AWS_KEY` | AWS Key for uploading files using Amazon S3 |
| `AWS_SECRET` | AWS Secret for uploading files using Amazon S3 |
| `AWS_S3_BUCKET` | AWS S3 bucket where files will be stored |

