const aws = require('aws-sdk');
const R = require('ramda');
const { mergeMap, tap } = require('rxjs/operators')

const { fileStreamAccessors, streamDirectory$ } = require('./files')
const { uploadStreamToS3$, s3BucketDownload$ } = require('./s3')

const { getConfig$ } = require('./configs')
const { configAccessors } = require('./structures')

const CONCURRENCY = parseInt(process.env.CONCURRENCY)
const CONFIG_PATH = process.env.CONFIG_PATH

const streamPath = R.view(fileStreamAccessors.pathLens)

const sourceObservable = R.ifElse(
  configAccessors.sourceIsS3,
  R.converge(
    s3BucketDownload$(R.__, R.__, R.__, CONCURRENCY), 
    [
      configAccessors.sourceS3Bucket,
      configAccessors.sourceS3Endpoint,
      configAccessors.sourceCredentials
    ]
  ),
  R.compose(
    streamDirectory$(R.__, CONCURRENCY), 
    configAccessors.sourceDirectoryPath
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
      sourceObservable(config)
        .pipe(mergeMap(
          destinationObservable(config)
        ))
        .pipe(tap((sourceStream) => {console.log(`Transfered: ${streamPath(sourceStream)}`)}))
        .subscribe(
          () => {},
          handleError,
          () => { console.log('Done!') }
        )
    },
    handleError,
    () => {}
  )