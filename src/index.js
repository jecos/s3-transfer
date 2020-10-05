const aws = require('aws-sdk');
const R = require('ramda');
const { mergeMap, tap } = require('rxjs/operators')

const { streamDirectories$ } = require('./files')
const { uploadStreamToS3$, s3BucketDownload$ } = require('./s3')
const { chunk$ } = require('./generic')

const { getConfig$ } = require('./configs')
const { configAccessors, fileStreamAccessors } = require('./structures')

const CONCURRENCY = parseInt(process.env.CONCURRENCY)
const CONFIG_PATH = process.env.CONFIG_PATH

const streamPath = R.view(fileStreamAccessors.pathLens)

const sourceObservable = R.ifElse(
  configAccessors.sourceIsS3,
  R.converge(
    s3BucketDownload$, 
    [
      configAccessors.sourceS3Bucket,
      configAccessors.sourceS3Endpoint,
      configAccessors.sourceCredentials
    ]
  ),
  R.compose(
    streamDirectories$, 
    configAccessors.sourceDirectoryPaths
  )
)

const destinationObservable = R.curry((config, sourceStream) => {
  return uploadStreamToS3$(
    configAccessors.destinationS3Bucket(config), 
    configAccessors.destinationS3Endpoint(config), 
    configAccessors.destinationCredentials(config), 
    sourceStream
  )
})

function handleError (err) {
  console.log(err)
  process.exit(1)
}

getConfig$(CONFIG_PATH)
  .subscribe(
    (config) => {
      chunk$(
        sourceObservable(config),
        (chunked$) => chunked$.pipe(
          tap((sourceStream) => {console.log(`Transferring: ${streamPath(sourceStream)}`)}),
          mergeMap(destinationObservable(config)),
          tap((sourceStream) => {console.log(`Transferred: ${streamPath(sourceStream)}`)})
        ),
        CONCURRENCY
      ).subscribe(
        () => {},
        handleError,
        () => { console.log('Done!') }
      )
    },
    handleError,
    () => {}
  )