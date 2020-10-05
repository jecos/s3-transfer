const { from, of, Observable, concat } = require('rxjs')
const R = require('ramda')

//This function will exhaust the input$ observable into an array.
//From there, it will cut the array into "chunkSize" arrays
//Each resulting array will be processed as a separate observable, emitting one at a time
//processingFn should be some extra (presumably expensive) processing that you want to apply on each
//chunked observable array
//This function should be used in the case where the number of emittions from input$ is constrained
//but emits all at once and where the extra processing in processingFn is expansive so you want to
//run it in batches.
const chunk$ = (input$, processingFn, chunkSize) => {
  return new Observable(function (observer) {
    var results = []

    input$.subscribe(
      (result) => { results = R.append(result, results) },
      observer.error.bind(observer),
      () => {
        const resultBatches = R.splitEvery(chunkSize, results)
        concat.apply(
          null, 
          R.map(
            R.compose(processingFn, from), 
            resultBatches
          )
        ).subscribe(
          observer.next.bind(observer),
          observer.error.bind(observer),
          observer.complete.bind(observer)
        )
      }
    )
  })
}

module.exports = { chunk$ }