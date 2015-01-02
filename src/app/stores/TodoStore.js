var Rx = require('rx'),
    LocalStorage      = require('../utils/LocalStorage'),
    di              = require('di');

class TodoStore { 
  constructor(LocalStorage) {
    var key = 'todomvc-0.0.5';
    // a BehaviorSubject has an initial value and monitors for updates
    // in this case it is an array (empty or from local storage)
    // this Observable operates as the "onNext" handler for corresponding
    // actions
    this.updates = new Rx.BehaviorSubject(LocalStorage.save(key))

    // the "notes" parameter is the current array of notes and
    // the return value is the updated array of notes to be stored
    // the operation is an ACTION that returns a modified array
    // of notes. 
    this.todoList = this.updates.scan((todoList, operation) => {
      console.log("OPERATION")
      return operation(todoList);
    })
    .flatMapLatest((todoList) => {
      console.log('SAVE', todoList);
      
      // "wrap" the local storage call in an Observable. this Observable
      // will be subscribed to, synchronously execute the save, and
      // synchronously complete.
      // 
      // Run this in parallel with the Observable that does the async
      // network request. ForkJoin waits for them both to complete,
      // then onNext's an Array of each of their final values, then
      // completes.
      // 
      // Map the result back into the original todoList value for future
      // subscribers.
      return Rx.Observable.forkJoin([
          Rx.Observable.defer(() => {
            // each updated note array is stored in local storage
            LocalStorage.save(key, todoList);
            return Rx.Observable.return(todoList);
          }),
          // replace this with your preferred async service call.
          Rx.Observable.timer(500)
        ])
        .map(() => todoList);
    })
    // publish here so that multiple people can subscribe to the
    // `todoList` Observable, but only one async network request
    // will be go out. Replay the most recent event to future
    // subscribers so they don't miss out on 
    .replay(null, 1);
    
    // Connect publish's subject to the replay'd flatMapLatest.
    this.todoList.connect();
  }
}

di.annotate(TodoStore, new di.Inject(LocalStorage));

module.exports = TodoStore