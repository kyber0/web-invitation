import { clampPage, swipeDirection, visibleChapters, pageHint, pageRotation, dragProgress, turnFrames } from './booklet-state.js';

const book = document.querySelector('#invitation-book');
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
const menuActions=document.createElement('div');menuActions.className='contents-actions';
menuActions.append(document.querySelector('#motion-toggle'),closeMenu);
menuHeader.append(menuTitle,menuActions);const menuList=document.createElement('div');menuList.className='contents-list';
menu.append(menuHeader,menuList);document.body.append(menu);
menuButton.onclick=()=>menu.showModal();closeMenu.onclick=()=>menu.close();
menu.addEventListener('click',event=>{if(event.target===menu)menu.close()});

pages.forEach((page, index) => {
  page.classList.add('book-page');
  const emblems = {
    traditions:'M12 20V10M12 15C5 15 4 11 4 11S10 10 12 15M12 12C18 12 20 8 20 8S15 7 12 12M12 10C5 10 5 3 9 4Q12 0 15 4C19 3 19 10 12 10Z',
    candles:'M8 21V10H16V21M6 21H18M12 8C7 6 12 1 12 1S17 6 12 8Z',
    bluebills:'M3 7H21V19H3ZM6 10H7M17 16H18M12 10C8 10 8 16 12 16C16 16 16 10 12 10M7 4H17',
    'wines-shots':'M7 2H17L18 9C18 16 6 16 6 9ZM12 14V22M8 22H16M7 8H17'
  };
  if(emblems[page.id]) {
    const emblem=document.createElement('span');emblem.className='chapter-emblem';
    emblem.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',emblems[page.id]);
    svg.append(path);emblem.append(svg);page.querySelector('.ritual-intro').prepend(emblem);
  }
  page.classList.remove('reveal');
  page.setAttribute('aria-label', `Page ${index + 1}: ${labels[index]}`);
  page.querySelector('h1, h2')?.setAttribute('tabindex', '-1');
  const body=document.createElement('div');body.className='chapter-body';
  while(page.firstChild)body.append(page.firstChild);
  page.append(body);viewport.append(page);
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

function motionEnabled() {
  return !reduced.matches && document.documentElement.dataset.effects !== 'paused';
}

function sheetTransform(progress, forward) {
  return `rotateY(${pageRotation(progress,forward)}deg)`;
}

function prepareTurn(index) {
  document.dispatchEvent(new Event('book:turnstart'));
  const old=pages[current],incoming=pages[index],forward=index>current;
  incoming.hidden=false;incoming.inert=true;old.inert=true;
  // Reset before the destination is revealed beneath the turning sheet.
  incoming.scrollTop=0;
  const sheet=document.createElement('div');sheet.className='book-turn-sheet';sheet.inert=true;sheet.setAttribute('aria-hidden','true');
  const front=document.createElement('div');front.className='sheet-front';
  sheet.style.transformOrigin=forward?'left center':'right center';
  const snapshot=old.cloneNode(true);
  snapshot.removeAttribute('id');snapshot.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  snapshot.classList.remove('book-current','book-arriving');snapshot.hidden=false;snapshot.inert=true;
  front.append(snapshot);
  const back=document.createElement('div');back.className='sheet-back';
  const monogram=document.createElement('span');monogram.textContent='CK';
  const mark=document.createElement('small');mark.textContent='A CHAPTER WRITTEN IN THE STARS';
  back.append(monogram,mark);sheet.append(front,back);
  const shadow=document.createElement('div');shadow.className='turn-cast-shadow';shadow.setAttribute('aria-hidden','true');
  if(!forward)shadow.style.background='linear-gradient(270deg,#000c,transparent 55%)';
  viewport.append(shadow,sheet);snapshot.scrollTop=old.scrollTop;
  old.style.visibility='hidden';
  sheet.style.transform=sheetTransform(0,forward);
  book.classList.add('book-turning');
  return {index,old,incoming,forward,sheet,shadow,progress:0};
}

function previewTurn(state,progress) {
  state.progress=Math.max(0,Math.min(1,progress));
  if(state.previewFrame)return;
  state.previewFrame=requestAnimationFrame(()=>{
    state.previewFrame=0;
    state.sheet.style.transform=sheetTransform(state.progress,state.forward);
    state.shadow.style.opacity=String(Math.sin(state.progress*Math.PI)*.65);
  });
}

async function finishTurn(state,commit,{focus=true}={}) {
  cancelAnimationFrame(state.previewFrame);
  state.previewFrame=0;
  const end=commit?1:0;
  if(motionEnabled()) {
    const duration=Math.max(160,680*Math.abs(end-state.progress));
    const frames=turnFrames(state.progress,end,state.forward);
    const timing={duration,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'};
    const animation=state.sheet.animate(frames.map(({offset,transform})=>({offset,transform})),timing);
    const shade=state.shadow.animate(frames.map(({offset,opacity})=>({offset,opacity})),timing);
    await Promise.allSettled([animation.finished,shade.finished]);
  }
  state.sheet.remove();state.shadow.remove();
  state.old.style.removeProperty('visibility');state.incoming.style.removeProperty('visibility');
  if(commit) {
    state.old.hidden=true;state.old.classList.remove('book-current');
    state.incoming.classList.add('book-current');state.incoming.inert=false;state.incoming.scrollTop=0;
    current=state.index;
    history.replaceState(null,'',`${location.pathname}${location.search}#${state.incoming.id}`);
  } else {
    state.incoming.hidden=true;state.old.inert=false;
  }
  busy=false;book.classList.remove('book-turning');update();
  if(commit&&focus)state.incoming.querySelector('h1,h2')?.focus({preventScroll:true});
  if(commit)document.dispatchEvent(new CustomEvent('book:page',{detail:{index:current,id:pages[current].id}}));
}

async function turn(target,{focus=true,animate=true}={}) {
  const index=clampPage(target,pages.length);
  if(index===current||busy)return;
  busy=true;update();
  if(animate&&motionEnabled())return finishTurn(prepareTurn(index),true,{focus});
  pages[current].hidden=true;pages[current].inert=true;pages[current].classList.remove('book-current');
  current=index;pages[current].hidden=false;pages[current].inert=false;pages[current].scrollTop=0;pages[current].classList.add('book-current');
  busy=false;history.replaceState(null,'',`${location.pathname}${location.search}#${pages[current].id}`);update();
  if(focus)pages[current].querySelector('h1,h2')?.focus({preventScroll:true});
  document.dispatchEvent(new CustomEvent('book:page',{detail:{index:current,id:pages[current].id}}));
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
viewport.addEventListener('pointerdown',event=>{
  if(document.body.classList.contains('intro-open')||!event.isPrimary||event.button!==0||busy||event.target.closest('input,select,textarea,button:not(.chapter-end),a,summary,label'))return;
  gesture={x:event.clientX,y:event.clientY,id:event.pointerId,state:null};
});
// A completed drag on the continuation button must not also activate its click.
let suppressSwipeClickUntil=0;
viewport.addEventListener('click',event=>{
  if(performance.now()<suppressSwipeClickUntil){event.preventDefault();event.stopImmediatePropagation();}
},true);
viewport.addEventListener('dragstart',event=>event.preventDefault());
viewport.addEventListener('pointermove',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.state) {
    if(Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}
    if(Math.abs(dx)<18||Math.abs(dx)<Math.abs(dy)*1.5||!motionEnabled())return;
    const index=clampPage(current+(dx<0?1:-1),pages.length);
    if(index===current)return;
    // Capture only after horizontal intent, preserving ordinary button taps.
    // Capture before the original touch target becomes inert/hidden.
    viewport.setPointerCapture(event.pointerId);
    busy=true;update();gesture.state=prepareTurn(index);
  }
  const state=gesture.state;
  previewTurn(state,dragProgress(dx,viewport.clientWidth,state.forward));
});
viewport.addEventListener('pointerup',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const active=gesture;gesture=null;
  if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  const direction=swipeDirection(event.clientX-active.x,event.clientY-active.y);
  if(active.state) {
    suppressSwipeClickUntil=performance.now()+400;
    const commit=direction===(active.state.forward?1:-1)||active.state.progress>.35;
    finishTurn(active.state,commit,{focus:false});
  } else if(!window.getSelection()?.toString()&&direction) {
    suppressSwipeClickUntil=performance.now()+400;
    turn(current+direction,{focus:false});
  }
});
function cancelGesture() {
  const state=gesture?.state;
  gesture=null;
  if(state)finishTurn(state,false,{focus:false});
}
viewport.addEventListener('pointercancel',cancelGesture);
viewport.addEventListener('lostpointercapture',event=>{
  // Descendant lost-capture events bubble during normal implicit capture transfer.
  if(event.target===viewport && event.pointerId===gesture?.id)cancelGesture();
});
addEventListener('blur',cancelGesture);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGesture()});
addEventListener('hashchange', () => {
  const index = pages.findIndex(page => `#${page.id}` === location.hash);
  if (index >= 0) turn(index);
});
addEventListener('resize', update, { passive: true });
new ResizeObserver(update).observe(viewport);
// Observe actual content, not the temporary page-turn clones. Coalesce countdown
// and RSVP changes into one reading-progress measurement per animation frame.
let readingFrame;
function scheduleReadingUpdate() {
  if(readingFrame)return;
  readingFrame=requestAnimationFrame(()=>{readingFrame=0;updateReading()});
}
const contentObserver=new MutationObserver(scheduleReadingUpdate);
for(const page of pages)contentObserver.observe(page.querySelector('.chapter-body'), {childList:true,subtree:true,characterData:true});
viewport.addEventListener('load', update, true);
viewport.addEventListener('toggle', update, true);
update();

document.dispatchEvent(new Event('book:ready'));
