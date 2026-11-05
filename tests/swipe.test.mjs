import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {clampPage,swipeDirection,dragProgress} from '../public/booklet-state.js';

// Exercise the real event handlers with touch capture transfer and interruption.
const source=readFileSync(new URL('../public/booklet.js',import.meta.url),'utf8');
const handlers=source.slice(source.indexOf("viewport.addEventListener('pointerdown'"),source.indexOf("addEventListener('hashchange'"));
function harness() {
  const listeners=new Map(),finished=[],turns=[];
  let captured=false;
  const target={closest:()=>null};
  const viewport={clientWidth:390,
    addEventListener(type,handler){listeners.set(type,handler)},
    setPointerCapture(){captured=true;emit('lostpointercapture',{target})},
    hasPointerCapture(){return captured},
    releasePointerCapture(){captured=false;emit('lostpointercapture',{target:viewport})},
  };
  function emit(type,extra={}) {
    listeners.get(type)?.({pointerId:1,isPrimary:true,button:0,clientX:280,clientY:120,target,...extra});
  }
  const context={viewport,gesture:undefined,busy:false,current:1,pages:[{},{},{}],
    clampPage,swipeDirection,dragProgress,
    document:{body:{classList:{contains:()=>false}},addEventListener(){}},
    window:{getSelection:()=>''},performance:{now:()=>1000},addEventListener(){},
    motionEnabled:()=>true,update(){},
    prepareTurn(index){return {index,forward:true,progress:0}},
    previewTurn(state,progress){state.progress=progress},
    finishTurn(state,commit){finished.push({index:state.index,commit})},
    turn(index){turns.push(index)},
  };
  runInNewContext(handlers,context);
  return {emit,finished,turns,viewport,context};
}
test('implicit touch capture transfer does not cancel a horizontal page swipe',()=>{
  const h=harness();
  h.emit('pointerdown');
  h.emit('pointermove',{clientX:170});
  h.emit('lostpointercapture',{target:{},pointerId:1});
  h.emit('pointerup',{clientX:130});
  assert.deepEqual(h.finished,[{index:2,commit:true}]);
});
test('vertical scrolling does not begin a page turn',()=>{
  const h=harness();h.emit('pointerdown');
  h.emit('pointermove',{clientX:270,clientY:230});
  h.emit('pointerup',{clientX:260,clientY:290});
  assert.deepEqual(h.finished,[]);assert.deepEqual(h.turns,[]);
});
test('losing the viewport capture cancels an unfinished turn once',()=>{
  const h=harness();h.emit('pointerdown');h.emit('pointermove',{clientX:170});
  h.emit('lostpointercapture',{target:h.viewport});h.emit('pointercancel');
  assert.deepEqual(h.finished,[{index:2,commit:false}]);
});
test('swiping works with effects paused without starting an animation',()=>{
  const h=harness();h.context.motionEnabled=()=>false;
  h.emit('pointerdown');h.emit('pointermove',{clientX:170});h.emit('pointerup',{clientX:130});
  assert.deepEqual(h.finished,[]);assert.deepEqual(h.turns,[2]);
});
