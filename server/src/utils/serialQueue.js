// Runs async tasks one after another. Used per socket so that messages from
// the same sender are stored and broadcast in the order they were sent (REQ-MSG-5).
function createSerialQueue() {
  let tail = Promise.resolve();
  return function enqueue(task) {
    const run = tail.then(task, task);
    tail = run.catch(() => {});
    return run;
  };
}

module.exports = { createSerialQueue };
