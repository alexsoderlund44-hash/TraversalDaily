/* Works out each archive day's difficulty and decisions off the main thread (a mission search takes a moment per day). */
self.window = self;
importScripts('../data/cities.js', '../data/schedule.js', 'traverse.js');
self.onmessage = e => {
  const T = self.Traverse;
  e.data.forEach(n => {
    let out = null;
    try { const M = T.mission(T.challenge(n)); out = { d: M.difficulty, k: T.decisionsFor(M), w: M.ways.length }; } catch (err) {}
    self.postMessage({ n, m: out });
  });
};
