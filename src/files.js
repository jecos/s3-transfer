const fs = require('fs')
const pathMod = require('path')
const { from, Observable } = require('rxjs')
const { mergeMap, map } = require('rxjs/operators')
const R = require('ramda')

const { fileStreamAccessors } = require('./structures')

const createFileStream = R.curry((path, stream) => R.compose(
    R.set(fileStreamAccessors.pathLens, path),
    R.set(fileStreamAccessors.streamLens, stream)
  )({})
)

const ensureFileExists$ = (path) => {
  return new Observable(function (observer) {
    const unsubscribe = () => {}
    fs.stat(path, (err, stats) => {
      if (err) {
        return observer.error(err)
      }
      if (!stats.isFile()) {
        return observer.error(`${path} is not a file`)
      }
      observer.next(path)
      observer.complete()
    })
    return unsubscribe
  })
}

const readFile$ = R.curry((parser, path) => {
  return new Observable(function (observer) {
    const unsubscribe = () => {}
    fs.readFile(path, 'utf8', (err, content) => {
      if (err) {
        return observer.error(err)
      }
      try {
        observer.next(parser(content))
        observer.complete()
      } catch (err) {
        observer.error(`${path} is not parsable`)
      }
    })
    return unsubscribe
  })
})

const readDirectory$ = R.curry((path) => {
  return new Observable(function (observer) {
    const unsubscribe = () => {}
    fs.readdir(path, (err, files) => {
      if (err) {
        return observer.error(err)
      }
      observer.next(R.map((file) => pathMod.join(path, file), files))
      observer.complete()
    })
    return unsubscribe
  })
})

const streamDirectory$ = R.curry((path, concurrency) => {
  return readDirectory$(path)
    .pipe(mergeMap(from, null, concurrency))
    .pipe(map((filePath) => createFileStream(filePath, fs.createReadStream(filePath))))
})

const ifPathNotExists$ = R.curry((path, runIfNotExist$, input) => {
  return new Observable(function (observer) {
    var subscription = null
    const unsubscribe = () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
    fs.access(path, fs.constants.R_OK, (err) => {
      if (err) {
        subscription = runIfNotExist$(input).subscribe(
          observer.next.bind(observer),
          observer.error.bind(observer),
          observer.complete.bind(observer)
        )
      } else {
        observer.next(input)
        observer.complete()
      }
    })
    return unsubscribe
  })
})

module.exports = { ensureFileExists$, readFile$, readDirectory$, streamDirectory$, ifPathNotExists$, fileStreamAccessors }