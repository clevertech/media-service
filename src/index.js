#!/usr/bin/env node

const express = require('express')
const bodyParser = require('body-parser')
const winston = require('winston')
const fetch = require('node-fetch')

exports.createRouter = (config = {}) => {
  const env = require('./utils/env')(config)
  const service = require('./upload')(env)

  const router = express.Router()
  router.use(bodyParser.json({}))
  router.post('/upload', (req, res, next) => {
    const { body } = req
    service.upload(body)
      .then(response => res.json(response))
      .catch(err => res.status(500).json({ error: err.message || String(err) }))
  })
  return router
}

exports.createClient = baseUrl => {
  return {
    upload (options) {
      return fetch(baseUrl + '/upload', {
        method: 'POST',
        body: JSON.stringify(options),
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => {
        return res.json()
          .then(json => {
            if (res.status < 400) return json
            return Promise.reject(new Error(json.error))
          })
      })
    }
  }
}

exports.startServer = (config, callback) => {
  const env = require('./utils/env')(config)
  const app = express()
  const router = exports.createRouter(config)
  const port = +env('MICROSERVICE_PORT') || 0

  app.use('/media', router)

  app.get('/healthz', (req, res) => {
    res.status(200).send({ status: 'OK' })
  })

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain')
    const pattern = process.env.ROBOTS_INDEX === 'true' ? '' : ' /'
    res.send(`User-agent: *\nDisallow:${pattern}\n`)
  })

  return app.listen(port, callback)
}

if (require.main === module) {
  const server = exports.startServer({}, () => {
    const port = server.address().port
    winston.info('NODE_ENV: ' + process.env.NODE_ENV)
    winston.info(`Listening on port ${port}! Send an HTTP POST to http://127.0.0.1:${port}/media/upload for uploading a file`)
  })
}
