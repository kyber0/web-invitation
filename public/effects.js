const canvas = document.querySelector('#starfield');
const ctx = canvas.getContext('2d');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector('#motion-toggle');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let paused = motionPreference.matches;
try { if (!motionPreference.matches) paused = localStorage.getItem('effects-paused') === 'true'; } catch {}
let width = 0, height = 0, stars = [], particles = [], shooting = [], last = 0, elapsed = 0, frame;
let pointer = { x: 0, y: 0 }, trailAt = 0, nextShooting = 5;
let constellationAt = -Infinity;
const entranceAnimations = new Set();

function resize() {
  width = innerWidth; height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = width * ratio; canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = width < 700 ? 90 : 175;
  stars = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width, y: Math.random() * height,
    size: i % 14 === 0 ? 1.5 : Math.random() * .9 + .25,
    phase: Math.random() * Math.PI * 2, depth: Math.random() + .25,
  }));
}

function glint(x, y, size, alpha) {
  ctx.globalAlpha = alpha * .58; ctx.fillStyle = '#cfddf0';
  ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  if (size > 1.3) {
    ctx.strokeStyle = '#bdd6ff'; ctx.lineWidth = .55;
    ctx.beginPath(); ctx.moveTo(x - size * 4, y); ctx.lineTo(x + size * 4, y);
    ctx.moveTo(x, y - size * 4); ctx.lineTo(x, y + size * 4); ctx.stroke();
  }
}

function burst(x, y, count = 25) {
  if (paused) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 20 + Math.random() * 90;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, size: Math.random() * 1.6 + .4 });
  }
  particles = particles.slice(-180);
}

function draw(time) {
  const dt = Math.min((time - last) / 1000 || 0, .04); last = time;
  if (!paused) elapsed += dt;
  ctx.clearRect(0, 0, width, height);
  for (const star of stars) {
    const x = star.x + (paused ? 0 : pointer.x * star.depth * 9);
    const y = star.y + (paused ? 0 : pointer.y * star.depth * 9);
    glint(x, y, star.size, .3 + (Math.sin(elapsed * .7 + star.phase) + 1) * .3);
    if (!paused && finePointer.matches) {
      const px = (pointer.x + .5) * width, py = (pointer.y + .5) * height;
      const distance = Math.hypot(x - px, y - py);
      if (distance < 110) {
        ctx.globalAlpha = (1 - distance / 110) * .2;
        ctx.strokeStyle = '#9cbfff'; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(px, py); ctx.stroke();
      }
    }
  }
  if (!paused) {
    if (elapsed > nextShooting) { shooting.push({ x: width * (.3 + Math.random() * .7), y: Math.random() * height * .4, life: 1 }); nextShooting = elapsed + 7 + Math.random() * 9; }
    for (const star of shooting) {
      star.x -= dt * 300; star.y += dt * 150; star.life -= dt * .75;
      ctx.globalAlpha = Math.max(0, star.life) * .38;
      const gradient = ctx.createLinearGradient(star.x, star.y, star.x + 100, star.y - 50);
      gradient.addColorStop(0, '#e1eeff'); gradient.addColorStop(1, '#729ee100');
      ctx.strokeStyle = gradient; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(star.x, star.y); ctx.lineTo(star.x + 100, star.y - 50); ctx.stroke();
    }
    shooting = shooting.filter(star => star.life > 0);
    for (const particle of particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += dt * 12; particle.life -= dt * .6;
      glint(particle.x, particle.y, particle.size, Math.max(0, particle.life));
    }
    particles = particles.filter(particle => particle.life > 0);
  }
  // A brief, eighteen-star constellation responds to the dedication button.
  const constellationAge = elapsed - constellationAt;
  if (!paused && constellationAge >= 0 && constellationAge < 4) {
    const fade = Math.min(1, constellationAge * 2, (4 - constellationAge) / 1.5);
    const radius = Math.min(width * .36, height * .28, 260);
    const points = Array.from({length:18}, (_,index) => {
      const angle = index / 18 * Math.PI * 2 - Math.PI / 2;
      return {x:width / 2 + Math.cos(angle) * radius, y:height * .43 + Math.sin(angle) * radius * .7};
    });
    ctx.strokeStyle='#a5c5ef';ctx.lineWidth=.65;ctx.globalAlpha=fade*.3;
    ctx.beginPath();
    points.forEach((point,index)=>{
      if(index===0)ctx.moveTo(point.x,point.y);else ctx.lineTo(point.x,point.y);
    });
    ctx.closePath();ctx.stroke();
    points.forEach((point,index)=>glint(point.x,point.y,index%3===0?2:1.2,fade));
  }
  ctx.globalAlpha = 1;
  if (!paused && !document.hidden) frame = requestAnimationFrame(draw);
}

function restart() { cancelAnimationFrame(frame); last = performance.now(); draw(last); }
function syncMotion() {
  document.documentElement.dataset.effects = paused ? 'paused' : 'playing';
  toggle.textContent = paused ? 'Play effects' : 'Pause effects';
  toggle.setAttribute('aria-pressed', String(paused));
  if (paused) { particles = []; shooting = []; constellationAt = -Infinity; entranceAnimations.forEach(animation=>animation.cancel()); entranceAnimations.clear(); }
  restart();
}
toggle.onclick = () => { paused = !paused; try { localStorage.setItem('effects-paused', paused); } catch {} syncMotion(); };
motionPreference.addEventListener('change', event => { paused = event.matches; syncMotion(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(frame); else restart(); });
addEventListener('resize', () => { resize(); restart(); }, { passive: true });
addEventListener('pointermove', event => {
  pointer = { x: event.clientX / width - .5, y: event.clientY / height - .5 };
  if (!paused && performance.now() - trailAt > 65) {
    trailAt = performance.now(); burst(event.clientX, event.clientY, finePointer.matches ? 1 : 2);
  }
}, { passive: true });
addEventListener('pointerdown', event => { if (!event.target.closest('input, select, textarea')) burst(event.clientX, event.clientY, 12); }, { passive: true });
const portrait = document.querySelector('[data-tilt]');
portrait.addEventListener('pointermove', event => {
  if (paused || !finePointer.matches) return;
  const rect = portrait.getBoundingClientRect();
  portrait.style.setProperty('--tilt-x', `${((event.clientX - rect.left) / rect.width - .5) * 7}deg`);
  portrait.style.setProperty('--tilt-y', `${-((event.clientY - rect.top) / rect.height - .5) * 7}deg`);
});
portrait.addEventListener('pointerleave', () => { portrait.style.setProperty('--tilt-x', '0deg'); portrait.style.setProperty('--tilt-y', '0deg'); });
const progress = document.querySelector('.scroll-progress');
function scrollProgress() { const available = document.documentElement.scrollHeight - innerHeight; progress.style.transform = `scaleX(${available > 0 ? scrollY / available : 0})`; }
addEventListener('scroll', scrollProgress, { passive: true }); scrollProgress();
// Keep the shortcut out of the way while the guest is already completing RSVP.
const floatingRsvp = document.querySelector('.floating-rsvp');
new IntersectionObserver(entries => {
  floatingRsvp.hidden = entries[0].isIntersecting;
}, { threshold: 0 }).observe(document.querySelector('#rsvp'));
const sectionLinks = [...document.querySelectorAll('header nav a')];
const sectionObserver = new IntersectionObserver(entries => {
  if (document.body.classList.contains('book-mode')) return;
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const link of sectionLinks) {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
}, { rootMargin: '-15% 0px -60% 0px' });
for (const section of document.querySelectorAll('#details, #traditions, #rsvp')) sectionObserver.observe(section);
document.addEventListener('book:page', () => burst(width * .75, height * .35, 30));
document.querySelector('#light-sky').onclick = () => {
  if(!paused)constellationAt=elapsed;
  document.querySelector('#sky-message').textContent = paused ? 'A beautiful new chapter, written in the stars.' : 'Here’s to a night that shines as brightly as you.';
  for (let i = 0; i < 5; i++) burst(width * (.15 + Math.random() * .7), height * (.15 + Math.random() * .65), 25);
};
const dialog = document.querySelector('#portrait-dialog');
document.querySelector('#view-portrait').onclick = () => dialog.showModal();
document.querySelector('#close-portrait').onclick = () => dialog.close();
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
const responseMessage = document.querySelector('#rsvp-message');
new MutationObserver(() => {
  if (responseMessage.textContent.startsWith('✓')) {
    const rect = responseMessage.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top, 70);
  }
}).observe(responseMessage, { childList: true, characterData: true, subtree: true });
// Short, finite entrances leave content visible even if motion is cancelled.
function welcomeChapter() {
  entranceAnimations.forEach(animation=>animation.cancel());entranceAnimations.clear();
  if(paused || document.body.classList.contains('intro-open'))return;
  const page=document.querySelector('.book-current');
  if(!page)return;
  const elements=page.querySelectorAll('.chapter-body > div:not(.portrait-stage), .chapter-body > article');
  elements.forEach((element,index)=>{
    const animation=element.animate([
      {opacity:.7,transform:'translateY(12px)'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:520,delay:index*70,easing:'cubic-bezier(.2,.7,.2,1)'});
    entranceAnimations.add(animation);
    animation.finished.then(()=>entranceAnimations.delete(animation),()=>entranceAnimations.delete(animation));
  });
}
document.addEventListener('book:page',welcomeChapter);
document.addEventListener('book:open',welcomeChapter);
document.addEventListener('book:ready',welcomeChapter);
// One paint per frame; touch scrolling never drives these pointer highlights.
for(const card of document.querySelectorAll('.ritual-card,.invitation-card')) {
  let highlightFrame=0, point;
  card.addEventListener('pointermove',event=>{
    if(paused || !finePointer.matches)return;
    point={x:event.clientX,y:event.clientY};
    if(highlightFrame)return;
    highlightFrame=requestAnimationFrame(()=>{
      highlightFrame=0;
      if(paused)return;
      const bounds=card.getBoundingClientRect();
      card.style.setProperty('--shine-x',`${point.x-bounds.left}px`);
      card.style.setProperty('--shine-y',`${point.y-bounds.top}px`);
    });
  },{passive:true});
  card.addEventListener('pointerleave',()=>{
    cancelAnimationFrame(highlightFrame);highlightFrame=0;
    card.style.removeProperty('--shine-x');card.style.removeProperty('--shine-y');
  });
}
resize(); syncMotion();
