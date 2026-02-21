'use strict';

const M = 0x100000000; // 2^32

function createRandom(seed) {
  return { state: seed % 2 === 0 ? seed + 1 : seed };
}

function nextRaw(rng) {
  const x = rng.state;
  rng.state = (x * (x + 1)) % M;
  return rng.state / M;
}

function uniform(rng, a, b) {
  return a + nextRaw(rng) * (b - a);
}

function gaussian(rng, mean, sigma) {
  let s, u, v;
  do {
    u = 2 * nextRaw(rng) - 1;
    v = 2 * nextRaw(rng) - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt(-2 * Math.log(s) / s);
  return mean + sigma * u * mul;
}

function absGaussian(rng, mean, sigma) {
  let val;
  do { val = gaussian(rng, mean, sigma); } while (val < 0);
  return val;
}

function exponential(rng, mean) {
  let u;
  do { u = nextRaw(rng); } while (u === 0);
  return -Math.log(u) * mean;
}

function randomInt(rng, a, b) {
  return Math.floor(uniform(rng, a, b));
}

function pick(rng, array) {
  return array[randomInt(rng, 0, array.length)];
}

module.exports = {
  createRandom, nextRaw, uniform, gaussian,
  absGaussian, exponential, randomInt, pick
};
