import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clampPage, swipeDirection, visibleChapters, pageHint, pageRotation, dragProgress} from '../public/booklet-state.js';

test('booklet stays on its cover and final page at navigation boundaries', () => {
  assert.equal(clampPage(-1, 6), 0);
  assert.equal(clampPage(6, 6), 5);
  assert.equal(clampPage(3, 6), 3);
});

test('mobile chapter shortcuts remain within bounds across nine chapters', () => {
  assert.deepEqual(visibleChapters(0,9), [0,1,2,3,4]);
  assert.deepEqual(visibleChapters(4,9), [2,3,4,5,6]);
  assert.deepEqual(visibleChapters(8,9), [4,5,6,7,8]);
  assert.deepEqual(visibleChapters(1,3), [0,1,2]);
});

test('reading cues distinguish scroll, swipe, desktop navigation and final chapter', () => {
  assert.match(pageHint({scrollable:true,atEnd:false,hasNext:true,nextLabel:'Roses',touch:true}), /Scroll down/);
  assert.match(pageHint({scrollable:true,atEnd:true,hasNext:true,nextLabel:'Roses',touch:true}), /Swipe left for Roses/);
  assert.match(pageHint({scrollable:false,atEnd:true,hasNext:true,nextLabel:'Candles',touch:false}), /Next: Candles/);
  assert.match(pageHint({scrollable:false,atEnd:true,hasNext:false,touch:true}), /last chapter/);
});

test('page swipes do not capture vertical scrolling or accidental taps', () => {
  assert.equal(swipeDirection(12, 3), 0);
  assert.equal(swipeDirection(-60, 120), 0);
  assert.equal(swipeDirection(70, 60), 0);
  assert.equal(swipeDirection(-90, 15), 1);
  assert.equal(swipeDirection(90, -15), -1);
});

test('a turning sheet follows the drag and stops at a complete half-turn', () => {
  assert.equal(pageRotation(0,true),0);
  assert.equal(pageRotation(.5,true),-90);
  assert.equal(pageRotation(1,true),-180);
  assert.equal(pageRotation(.5,false),90);
  assert.equal(pageRotation(2,false),180);
  assert.equal(dragProgress(-156,390,true),.5);
  assert.equal(dragProgress(156,390,false),.5);
  assert.equal(dragProgress(100,390,true),0);
  assert.equal(dragProgress(-900,390,true),1);
});

test('all four tradition chapters contain 18 names without JavaScript rendering', () => {
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  for(const id of ['traditions','candles','bluebills','wines-shots']) {
    const section=html.match(new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`));
    assert.ok(section,`${id} chapter exists in the delivered HTML`);
    assert.equal((section[1].match(/<li>/g)||[]).length,18);
    assert.doesNotMatch(section[1],/<details|<summary/);
  }
});


test('fullscreen layout preserves hidden chapter isolation', () => {
  const css=readFileSync(new URL('../public/experience.css',import.meta.url),'utf8');
  // The global [hidden] rule has lower specificity than fullscreen page styles.
  // Keep an explicit chapter-level override so nine absolute pages cannot stack.
  assert.match(css,/\.book-mode \.book-page\[hidden\]\s*\{\s*display:none!important\s*\}/);
  assert.doesNotMatch(css,/\.book-mode \.book-page\s*\{[^}]*display:block!important/);
});


test('header navigation styling does not collapse the booklet dock or hide tradition links', () => {
  for(const file of ['style.css','galaxy.css']) {
    const css=readFileSync(new URL(`../public/${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(css,/(?:^|})\s*(?:\.galaxy-page\s+)?nav(?:\s+a:first-child)?\s*\{/);
  }
  const css=readFileSync(new URL('../public/experience.css',import.meta.url),'utf8');
  assert.match(css,/\.book-controls\{display:block;/);
});
