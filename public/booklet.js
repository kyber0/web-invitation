import { clampPage, swipeDirection } from './booklet-state.js';

const book = document.querySelector('#invitation-book');
const pages = [...book.querySelectorAll(':scope > section')];
const labels = ['The cover', 'For you', 'The evening', 'The attire', 'The eighteen', 'Your reply'];
const controls = document.querySelector('.book-controls');
const tabs = document.querySelector('#chapter-tabs');
const previous = document.querySelector('#previous-page');
const next = document.querySelector('#next-page');
const caption = document.querySelector('#page-caption');
const hint = document.querySelector('#page-hint');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const viewport = document.createElement('div');
viewport.className = 'book-viewport';
book.append(viewport);
const bookmark = document.createElement('a');
bookmark.className = 'book-ribbon';
bookmark.href = '#rsvp';
bookmark.textContent = 'RSVP';
bookmark.setAttribute('aria-label', 'Turn to the RSVP page');
book.append(bookmark);
let current = 0, busy = false, gesture;

pages.forEach((page, index) => {
  page.classList.add('book-page');
  page.classList.remove('reveal');
  page.setAttribute('aria-label', `Page ${index + 1}: ${labels[index]}`);
  page.querySelector('h1, h2')?.setAttribute('tabindex', '-1');
  viewport.append(page);
  const tab = document.createElement('button');
  tab.className = 'chapter-tab';
  tab.textContent = String(index + 1).padStart(2, '0');
  tab.setAttribute('aria-label', `Page ${index + 1}: ${labels[index]}`);
  tab.title = labels[index];
  tab.onclick = () => turn(index);
  tabs.append(tab);
});

function update() {
  previous.disabled = current === 0 || busy;
  next.disabled = current === pages.length - 1 || busy;
  next.querySelector('span').textContent = current === 0 ? 'Open book' : current === pages.length - 2 ? 'Your reply' : 'Next';
  caption.textContent = `${String(current + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')} · ${labels[current]}`;
  [...tabs.children].forEach((tab, index) => {
    tab.disabled = busy;
    if (index === current) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  document.querySelectorAll('header nav a').forEach(link => {
    if (link.hash === `#${pages[current].id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const page = pages[current];
  hint.textContent = page.scrollHeight > page.clientHeight + 12
    ? 'Scroll this page · Swipe to turn'
    : current === pages.length - 1 ? 'Your place in the story' : 'Swipe to turn · Tap a chapter above';
}

async function turn(target, { focus = true, animate = true } = {}) {
  const index = clampPage(target, pages.length);
  if (index === current || busy) return;
  busy = true; update();
  const old = pages[current], incoming = pages[index];
  const forward = index > current;
  incoming.hidden = false; incoming.inert = true;
  incoming.classList.add('book-arriving');
  old.inert = true;
  if (animate && !reduced.matches && document.documentElement.dataset.effects !== 'paused') {
    const duration = 650;
    old.style.transformOrigin = forward ? 'left center' : 'right center';
    incoming.style.transformOrigin = forward ? 'right center' : 'left center';
    const leaving = old.animate([
      { transform: 'rotateY(0deg)', opacity: 1, filter: 'brightness(1)' },
      { transform: `rotateY(${forward ? -78 : 78}deg)`, opacity: 0, filter: 'brightness(.45)' },
    ], { duration, easing: 'cubic-bezier(.45,0,.2,1)' });
    const arriving = incoming.animate([
      { transform: `rotateY(${forward ? 35 : -35}deg) translateX(${forward ? 6 : -6}%)`, opacity: 0, filter: 'brightness(.5)' },
      { transform: 'rotateY(0deg) translateX(0)', opacity: 1, filter: 'brightness(1)' },
    ], { duration, easing: 'cubic-bezier(.2,.7,.2,1)' });
    await Promise.allSettled([leaving.finished, arriving.finished]);
  }
  old.hidden = true; old.classList.remove('book-current');
  incoming.classList.remove('book-arriving'); incoming.classList.add('book-current');
  incoming.inert = false; incoming.scrollTop = 0;
  current = index; busy = false;
  history.replaceState(null, '', `${location.pathname}${location.search}#${incoming.id}`);
  update();
  if (focus) incoming.querySelector('h1, h2')?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('book:page', { detail: { index, id: incoming.id } }));
}

const deepLink = pages.findIndex(page => `#${page.id}` === location.hash);
current = deepLink >= 0 ? deepLink : 0;
pages.forEach((page, index) => {
  page.hidden = index !== current; page.inert = index !== current;
  page.classList.toggle('book-current', index === current);
});
document.body.classList.add('book-mode'); controls.hidden = false;
// The opening invitation is a modal; its background controls stay out of the tab order.
controls.inert = document.body.classList.contains('intro-open');
document.addEventListener('book:open', () => { controls.inert = false; update(); });
previous.onclick = () => turn(current - 1);
next.onclick = () => turn(current + 1);
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const target = pages.findIndex(page => `#${page.id}` === link.hash);
  if (target >= 0) { event.preventDefault(); turn(target); }
});
document.addEventListener('keydown', event => {
  if (document.body.classList.contains('intro-open') || document.querySelector('dialog[open]') || event.target.closest('input, select, textarea, button, summary')) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); turn(current + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); turn(current - 1); }
});
viewport.addEventListener('pointerdown', event => {
  if (event.button !== 0 || busy || event.target.closest('input, select, textarea, button, a, summary, label')) return;
  gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
viewport.addEventListener('pointerup', event => {
  if (!gesture || event.pointerId !== gesture.id) return;
  const direction = swipeDirection(event.clientX - gesture.x, event.clientY - gesture.y);
  gesture = null;
  if (!window.getSelection()?.toString() && direction) turn(current + direction);
});
viewport.addEventListener('pointercancel', () => { gesture = null; });
addEventListener('hashchange', () => {
  const index = pages.findIndex(page => `#${page.id}` === location.hash);
  if (index >= 0) turn(index);
});
addEventListener('resize', update, { passive: true });
new ResizeObserver(update).observe(viewport);
new MutationObserver(update).observe(viewport, { childList: true, subtree: true });
viewport.addEventListener('load', update, true);
viewport.addEventListener('toggle', update, true);
update();
