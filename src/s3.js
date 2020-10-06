const stream = require('stream')
const crypto = require('crypto')
const aws = require('aws-sdk')
const R = require('ramda')
const { of, from, Observable, zip, throwError } = require('rxjs')
const { mergeMap, map } = require('rxjs/operators')

const { streamChecksum$ } = require('./generic')
const { fileStreamAccessors, accessKeyAccessors, s3ObjectMetadataAccessors, s3BucketObjectsAccessors } = require('./structures')

const getAccessKeyId = R.view(accessKeyAccessors.idLens)
const getAccessKeySecret = R.view(accessKeyAccessors.secretLens)

const getFilestreamPath = R.view(fileStreamAccessors.pathLens)
const getFilestreamStream = R.view(fileStreamAccessors.streamLens)
const createFileStream = R.curry((path, stream) => R.compose(
    R.set(fileStreamAccessors.pathLens, path),
    R.set(fileStreamAccessors.streamLens, stream)
  )({})
)

const getBucketObjects = R.view(s3BucketObjectsAccessors.objectsLens)
const getS3ObjectMetadataKey = R.view(s3ObjectMetadataAccessors.keyLens)

const uploadStreamToS3$ = R.curry((bucket, endpoint, credentials, sourceStream) => {
  return new Observable(function (observer) {
    const unsubscribe = () => {}
    const endpointInst = new aws.Endpoint(endpoint);
    const s3 = new aws.S3({
      endpoint: endpointInst,
      accessKeyId: getAccessKeyId(credentials),
      secretAccessKey: getAccessKeySecret(credentials),
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    })
    const writeStream = new stream.PassThrough()
    const promise = s3.upload({ 
      Bucket: bucket, 
      Key: getFilestreamPath(sourceStream), 
      Body: writeStream 
    }).promise()

    promise.then(() => {
      observer.next(sourceStream)
      observer.complete()
    }).catch((err) => {
      observer.error(`Upload failed: ${err.message}`)
    })

    getFilestreamStream(sourceStream).pipe(writeStream)
    return unsubscribe
  })
})

const listS3BucketObjects$ = R.curry((bucket, endpoint, credentials) => {
  return new Observable(function (observer) {
    const unsubscribe = () => {}
    const endpointInst = new aws.Endpoint(endpoint);
    const s3 = new aws.S3({
      endpoint: endpointInst,
      accessKeyId: getAccessKeyId(credentials),
      secretAccessKey: getAccessKeySecret(credentials),
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    })
    s3.listObjects({ Bucket: bucket }, function(err, data) {
      if (err) {
        observer.error(`Bucket ${bucket} objects listing failed: ${err.message}`)
      } else {
        observer.next(getBucketObjects(data))
        observer.complete()
      }
    });
    return unsubscribe
  })
})

const s3ObjectReadStream$ = (bucket, endpoint, credentials, sourceStream) => {
  const endpointInst = new aws.Endpoint(endpoint);
  const s3 = new aws.S3({
    endpoint: endpointInst,
    accessKeyId: getAccessKeyId(credentials),
    secretAccessKey: getAccessKeySecret(credentials),
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
  })
  const s3Stream = s3.getObject({
    Bucket: bucket, 
    Key: getFilestreamPath(sourceStream)
  }).createReadStream()
  return of(s3Stream)
}

const s3ObjectDownload$ = R.curry((bucket, endpoint, credentials, object) => {
  return s3ObjectReadStream$(bucket, endpoint, credentials, object)
    .pipe(
      map((s3Stream) => createFileStream(object, s3Stream))
    )
})

const s3BucketDownload$ = R.curry((bucket, endpoint, credentials) => {
  return listS3BucketObjects$(bucket, endpoint, credentials)
    .pipe(mergeMap(from))
    .pipe(map(getS3ObjectMetadataKey))
    .pipe(mergeMap(s3ObjectDownload$(bucket, endpoint, credentials)))
})

const isStreamHashOnS3Match$ = R.curry((bucket, endpoint, credentials, sourceStream) => {
  return zip(
    s3ObjectReadStream$(bucket, endpoint, credentials, sourceStream)
      .pipe(mergeMap(streamChecksum$)),
    streamChecksum$(getFilestreamStream(sourceStream))
  )
    .pipe(map(R.converge(R.equals, [R.prop(0), R.prop(1)])))
})

const verifyStreamHashOnS3$ = R.curry((bucket, endpoint, credentials, sourceStream) => {
  return isStreamHashOnS3Match$(bucket, endpoint, credentials, sourceStream)
    .pipe(mergeMap(
      R.ifElse(
        R.identity,
        () => of(sourceStream),
        () => throwError(`Checksum for does not match for: ${getFilestreamPath(sourceStream)} `)
      )
    ))
})

module.exports = { uploadStreamToS3$, listS3BucketObjects$, s3ObjectReadStream$, s3ObjectDownload$, s3BucketDownload$, isStreamHashOnS3Match$, verifyStreamHashOnS3$ }