import { clampPage, swipeDirection, visibleChapters, pageHint } from './booklet-state.js';

const book = document.querySelector('#invitation-book');
const traditionSection = document.querySelector('#traditions');
const traditionCards = [...traditionSection.querySelectorAll('.ritual-card')];
const traditionLabels = ['Roses', 'Candles', 'Bluebills', 'Wines & shots'];
for (const [index, card] of traditionCards.entries()) {
  const section = document.createElement('section');
  section.id = index === 0 ? 'traditions' : ['','candles','bluebills','wines-shots'][index];
  section.className = 'section tradition-chapter';
  section.dataset.chapterLabel = traditionLabels[index];
  const intro = document.createElement('div'); intro.className = 'ritual-intro';
  const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow';
  eyebrow.textContent = `THE EIGHTEEN / ${String(index + 1).padStart(2,'0')} OF 04`;
  const heading = document.createElement('h2'); heading.textContent = card.querySelector('h3').textContent;
  const note = document.createElement('p'); note.className = 'ritual-note';
  note.textContent = ['Eighteen gestures of love, shared with the people closest to my heart.', 'Eighteen lights, wishes, and treasures for the chapter ahead.', 'Eighteen blessings, offered with love and beautiful intentions.', 'Eighteen toasts to friendship, joy, and a world of possibilities.'][index];
  const crest = document.createElement('img'); crest.src='/crystal.svg';crest.alt='';crest.className='ritual-crest';
  intro.append(eyebrow,heading,note,crest);
  card.querySelector('h3').textContent='Our honored participants';
  section.append(intro,card); traditionSection.before(section);
}
traditionSection.remove();
const pages = [...book.querySelectorAll(':scope > section')];
const defaultLabels = {home:'The cover', dedication:'For you', details:'The evening', attire:'The attire', rsvp:'Your reply'};
const labels = pages.map(page=>page.dataset.chapterLabel || defaultLabels[page.id]);
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
const coarsePointer = matchMedia('(pointer: coarse)');
const toolbar = document.createElement('div');toolbar.className='chapter-toolbar';
const menuButton = document.createElement('button');menuButton.className='contents-button';menuButton.textContent='Chapters';menuButton.setAttribute('aria-haspopup','dialog');
tabs.before(toolbar);toolbar.append(menuButton,tabs);
const menu = document.createElement('dialog');menu.id='contents-dialog';menu.setAttribute('aria-labelledby','contents-title');
const menuHeader=document.createElement('div');menuHeader.className='contents-heading';
const menuTitle=document.createElement('h2');menuTitle.id='contents-title';menuTitle.textContent='Inside the invitation';
const closeMenu=document.createElement('button');closeMenu.className='contents-close';closeMenu.textContent='×';closeMenu.setAttribute('aria-label','Close chapters');
menuHeader.append(menuTitle,closeMenu);const menuList=document.createElement('div');menuList.className='contents-list';
menu.append(menuHeader,menuList);document.body.append(menu);
menuButton.onclick=()=>menu.showModal();closeMenu.onclick=()=>menu.close();
menu.addEventListener('click',event=>{if(event.target===menu)menu.close()});

pages.forEach((page, index) => {
  page.classList.add('book-page');
  page.classList.remove('reveal');
  page.setAttribute('aria-label', `Page ${index + 1}: ${labels[index]}`);
  page.querySelector('h1, h2')?.setAttribute('tabindex', '-1');
  viewport.append(page);
  if(index < pages.length-1) {
    const end=document.createElement('button');end.className='chapter-end';
    const line=document.createElement('span');line.className='chapter-end-kicker';line.textContent='THE NEXT CHAPTER';
    const label=document.createElement('strong');label.textContent=labels[index+1];
    const instruction=document.createElement('span');instruction.className='chapter-end-instruction';
    instruction.textContent=coarsePointer.matches?'Swipe left or tap to continue →':'Continue to the next chapter →';
    end.append(line,label,instruction);end.onclick=()=>turn(index+1);page.append(end);
  }
  page.addEventListener('scroll', updateReading, {passive:true});
  const menuItem=document.createElement('button');menuItem.className='contents-item';
  const menuNumber=document.createElement('span');menuNumber.textContent=String(index+1).padStart(2,'0');
  const menuLabel=document.createElement('span');menuLabel.textContent=labels[index];
  menuItem.append(menuNumber,menuLabel);menuItem.onclick=()=>{menu.close();turn(index)};menuList.append(menuItem);
  const tab = document.createElement('button');
  tab.className = 'chapter-tab';
  tab.textContent = String(index + 1).padStart(2, '0');
  tab.setAttribute('aria-label', `Page ${index + 1}: ${labels[index]}`);
  tab.title = labels[index];
  tab.onclick = () => turn(index);
  tabs.append(tab);
});

function update() {
  menuButton.disabled = busy;
  previous.disabled = current === 0 || busy;
  next.disabled = current === pages.length - 1 || busy;
  next.querySelector('span').textContent = current === 0 ? 'Open book' : current === pages.length - 2 ? 'Your reply' : 'Next';
  const pageCaption = `${String(current + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')} · ${labels[current]}`;
  if (caption.textContent !== pageCaption) caption.textContent = pageCaption;
  const visible = visibleChapters(current,pages.length);
  [...tabs.children].forEach((tab, index) => {
    tab.hidden = !visible.includes(index);
    tab.disabled = busy;
    if (index === current) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  document.querySelectorAll('header nav a').forEach(link => {
    if (link.hash === `#${pages[current].id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  [...menuList.children].forEach((item,index)=>{
    if(index===current)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
  });
  updateReading();
}

function updateReading() {
  const page=pages[current];
  const scrollable=page.scrollHeight>page.clientHeight+12;
  const atEnd=!scrollable || page.scrollTop+page.clientHeight>=page.scrollHeight-90;
  const distance=page.scrollHeight-page.clientHeight;
  controls.style.setProperty('--reading-progress',String(distance>0?Math.min(1,page.scrollTop/distance):1));
  hint.textContent=pageHint({scrollable,atEnd,hasNext:current<pages.length-1,nextLabel:labels[current+1],touch:coarsePointer.matches});
  page.querySelector('.chapter-end')?.classList.toggle('is-ready',atEnd);
  book.classList.toggle('chapter-at-end',atEnd);

}

async function turn(target, { focus = true, animate = true } = {}) {
  const index = clampPage(target, pages.length);
  if (index === current || busy) return;
  busy = true; update();
  book.classList.add('book-turning');
  const old = pages[current], incoming = pages[index];
  const forward = index > current;
  incoming.hidden = false; incoming.inert = true;
  incoming.classList.add('book-arriving');
  old.inert = true;
  if (animate && !reduced.matches && document.documentElement.dataset.effects !== 'paused') {
    const duration = 750;
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
  book.classList.remove('book-turning');
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
