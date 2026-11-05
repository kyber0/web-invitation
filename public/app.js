import {traditions} from './traditions.js';
const $=s=>document.querySelector(s), id=new URLSearchParams(location.search).get('invite');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const behindIntro = [...document.querySelectorAll('header, main, footer, .floating-rsvp')];
behindIntro.forEach(element => element.inert = true);
document.body.classList.add('intro-open');
function dismiss(){
  const hadFocus = $('#intro').contains(document.activeElement);
  $('#intro').classList.add('dismissed');
  $('#intro').setAttribute('aria-hidden','true');
  $('#intro').inert = true;
  behindIntro.forEach(element => element.inert = false);
  document.body.classList.remove('intro-open');
  if (hadFocus) document.querySelector('h1').focus({preventScroll:true});
  try{sessionStorage.setItem('opened','1')}catch{}
}
$('#intro').addEventListener('keydown', event => {
  if(event.key === 'Escape') dismiss();
  if(event.key === 'Tab') {
    if(event.shiftKey && document.activeElement === $('#skip')) {event.preventDefault();$('#open').focus();}
    else if(!event.shiftKey && document.activeElement === $('#open')) {event.preventDefault();$('#skip').focus();}
  }
});
try{if(sessionStorage.getItem('opened'))dismiss()}catch{}
$('#skip').onclick=dismiss;$('#open').onclick=()=>{$('#intro').classList.add('opening');setTimeout(dismiss,reduced?0:1600)};
if(!reduced){document.body.classList.add('motion');const observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add('visible');observer.unobserve(item.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
for(const [title,names] of Object.entries(traditions)){const details=document.createElement('details'),summary=document.createElement('summary'),ol=document.createElement('ol');summary.textContent=title;const number=document.createElement('span');number.className='tradition-number';number.textContent='18';number.setAttribute('aria-hidden','true');summary.prepend(number);for(const name of names){const li=document.createElement('li');li.textContent=name;ol.append(li)}details.append(summary,ol);$('#tradition-lists').append(details)}
function countdown(){const seconds=Math.max(0,Math.floor((Date.parse('2026-12-26T17:00:00+08:00')-Date.now())/1000));$('#countdown').replaceChildren();for(const [label,value] of [['DAYS',Math.floor(seconds/86400)],['HRS',Math.floor(seconds/3600)%24],['MIN',Math.floor(seconds/60)%60],['SEC',seconds%60]]){const div=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');b.textContent=String(value).padStart(2,'0');small.textContent=label;div.append(b,small);$('#countdown').append(div)}}countdown();setInterval(countdown,1000);
const calendar='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cleveth Kate//Invitation//EN\r\nBEGIN:VEVENT\r\nUID:cleveth-kate-18-2026@invitation\r\nDTSTAMP:20261105T000000Z\r\nDTSTART:20261226T090000Z\r\nSUMMARY:Cleveth Kate’s 18th Birthday\r\nLOCATION:Argene Convention Center\\, Zone 3\\, Sagrada\\, Baao\\, Camarines Sur\r\nEND:VEVENT\r\nEND:VCALENDAR';
$('#calendar').href=URL.createObjectURL(new Blob([calendar],{type:'text/calendar'}));$('#calendar').download='cleveth-kate-birthday.ics';
let invitation;
function names(){const old=[...document.querySelectorAll('#names input')].map(x=>x.value);$('#names').replaceChildren();for(let i=0;i<Number($('#count').value);i++){const label=document.createElement('label'),input=document.createElement('input');label.textContent=`Attendee ${i+1}`;input.name=`attendee-${i}`;input.required=true;input.maxLength=150;input.autocomplete='name';input.value=old[i]??invitation?.attendees[i]??'';label.append(input);$('#names').append(label)}}
$('#count').onchange=names;document.querySelectorAll('[name=status]').forEach(el=>el.onchange=()=>{const attending=el.value==='attending';$('#attendee-fields').hidden=!attending;$('#attendee-fields').querySelectorAll('input,select').forEach(x=>x.disabled=!attending)});
if(id){try{const response=await fetch(`/api/invitation?id=${encodeURIComponent(id)}`),data=await response.json();if(!response.ok)throw Error(data.error);invitation=data;$('#welcome-name').textContent=`Dear ${data.name}, it would mean so much to celebrate this milestone with you.`;$('#reserved').textContent=`We have reserved ${data.seats} ${data.seats===1?'seat':'seats'} especially for you.`;$('#rsvp-loading').textContent=data.closed?'RSVP has closed. Please contact your host for changes.':`Your invitation · ${data.seats} reserved ${data.seats===1?'seat':'seats'}`;if(!data.closed){$('#rsvp-form').hidden=false;for(let i=1;i<=data.seats;i++)$('#count').add(new Option(String(i),String(i)));$('#count').value=String(data.attendees.length||1);names();if(data.status!=='pending'){const radio=document.querySelector(`[name=status][value=${data.status}]`);radio.checked=true;radio.dispatchEvent(new Event('change'));$('#rsvp-message').textContent='Your response is saved. You can update it below.'}}}catch(e){$('#rsvp-loading').textContent=e.message;$('#rsvp-loading').classList.add('error')}}
$('#rsvp-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;$('#rsvp-message').classList.remove('error');try{const status=new FormData(event.target).get('status'),attendees=[...document.querySelectorAll('#names input')].map(x=>x.value.trim());const response=await fetch('/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status,attendees})});const data=await response.json();if(!response.ok)throw Error(data.error);$('#rsvp-message').textContent=status==='attending'?'✓ Your place is saved. We look forward to celebrating with you.':'Thank you for letting us know. You will be missed.';}catch(e){$('#rsvp-message').textContent=e.message;$('#rsvp-message').classList.add('error')}finally{button.disabled=false}};
