const fs = require('fs')
const pathMod = require('path')
const { from, of, Observable, bindNodeCallback, throwError, zip, merge } = require('rxjs')
const { mergeMap, map } = require('rxjs/operators')
const R = require('ramda')

const { fileStreamAccessors } = require('./structures')

const createFileStream = R.curry((path, stream) => R.compose(
    R.set(fileStreamAccessors.pathLens, path),
    R.set(fileStreamAccessors.streamLens, stream)
  )({})
)

const fsStat$ = bindNodeCallback(fs.stat)
const ensureFileExists$ = (path) => {
  return fsStat$(path)
    .pipe(mergeMap(
      R.ifElse(
        (stats) => stats.isFile(),
        () => of(path),
        () => throwError(`${path} is not a file`)
      )
    ))
}

const fsReadFile$ = bindNodeCallback(fs.readFile)
const readFile$ = R.curry((parser, path) => {
  return fsReadFile$(path, 'utf8')
    .pipe(map(parser))
})

const fsreaddir$ = bindNodeCallback(fs.readdir)
const readDirectory$ = (path) => {
  return fsreaddir$(path)
    .pipe(map(
      R.map((file) => pathMod.join(path, file))
    ))
}

const isDir$ = (path) => {
  return fsStat$(path)
    .pipe(map(stats => stats.isDirectory()))
}

//Given that Node no longer supports TCO, the recursion here might theoretically blow up the stack in a
//extremely nested directory structure (nested well beyond what is manageable for a human). In practice,
//I don't believe we'll ever encounter a directory structure so deeply nested that it will be a problem.
const readDirectoryRecursive$ = (path) => {
  return readDirectory$(path)
    .pipe(
      mergeMap(from),
      mergeMap((filePath) => zip(isDir$(filePath), of(filePath))),
      mergeMap(([isDir, filePath]) => {
        if(isDir) {
          return readDirectoryRecursive$(filePath)
        } else {
          return of(filePath)
        }
      })
    )
}

const streamDirectory$ = R.curry((path, concurrency) => {
  return of(path)
    .pipe(
      mergeMap(readDirectoryRecursive$, null, concurrency),
      map((filePath) => createFileStream(filePath, fs.createReadStream(filePath)))
    )
})

const streamDirectories$ = R.curry((paths, concurrency) => {
  const getStreams$ = () => merge.apply(
    null, R.map(streamDirectory$(R.__, Number.POSITIVE_INFINITY), paths)
  )
  return of(0)
    .pipe(
      mergeMap(getStreams$, null, concurrency)
    )
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

module.exports = { ensureFileExists$, readFile$, readDirectory$, streamDirectory$, streamDirectories$, ifPathNotExists$ }