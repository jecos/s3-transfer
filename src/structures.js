const R = require('ramda')

const s3BucketObjectsAccessors = {
  objectsLens: R.lensProp('Contents'),
  bucketNameLens: R.lensProp('Name')
}

const s3ObjectMetadataAccessors = {
  keyLens: R.lensProp('Key'),
  lastModifiedLens: R.lensProp('LastModified'),
  etagLens: R.lensProp('ETag'),
  sizeLens: R.lensProp('Size'),
  storageClassLens: R.lensProp('StorageClass'),
  ownerLens: R.lensProp('Owner')
}

const configAccessors = {
  operationIsTransfer: R.compose(R.equals('transfer'), R.defaultTo('transfer'), R.prop('operation')),
  sourceCredentialsPath: R.path(['source', 'credentials_path']),
  destinationCredentialsPath: R.path(['destination', 'credentials_path']),
  sourceCredentials: R.path(['source', 'credentials']),
  sourceCredentialsLens: R.lensPath(['source', 'credentials']),
  destinationCredentials: R.path(['destination', 'credentials']),
  destinationCredentialsLens: R.lensPath(['destination', 'credentials']),
  sourceIsS3: R.compose(R.equals('s3'), R.path(['source', 'type'])),
  sourceDirectoryPaths: R.path(['source', 'paths']),
  sourceS3Bucket: R.path(['source', 'bucket']),
  destinationS3Bucket: R.path(['destination', 'bucket']),
  sourceS3Endpoint: R.path(['source', 'endpoint']),
  destinationS3Endpoint: R.path(['destination', 'endpoint'])
}

const fileStreamAccessors = {
  pathLens: R.lensProp('path'),
  streamLens: R.lensProp('stream')
}

const accessKeyAccessors = {
  idLens: R.lensProp('accessKeyId'),
  secretLens: R.lensProp('secretAccessKey')
}

module.exports = { configAccessors, fileStreamAccessors, accessKeyAccessors, s3ObjectMetadataAccessors, s3BucketObjectsAccessors }