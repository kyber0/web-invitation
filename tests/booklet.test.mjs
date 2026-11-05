import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampPage, swipeDirection} from '../public/booklet-state.js';

test('booklet stays on its cover and final page at navigation boundaries', () => {
  assert.equal(clampPage(-1, 6), 0);
  assert.equal(clampPage(6, 6), 5);
  assert.equal(clampPage(3, 6), 3);
});

test('page swipes do not capture vertical scrolling or accidental taps', () => {
  assert.equal(swipeDirection(12, 3), 0);
  assert.equal(swipeDirection(-60, 120), 0);
  assert.equal(swipeDirection(70, 60), 0);
  assert.equal(swipeDirection(-90, 15), 1);
  assert.equal(swipeDirection(90, -15), -1);
});
