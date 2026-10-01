import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { watchResize } from '../src/ui/layout.js';
import { test } from 'node:test';
test('resize restart cannot overwrite newer navigation or leak callbacks',async()=>{
globalThis.window={setTimeout,clearTimeout};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const registry=new Map([['dpr',1]]),events=new EventEmitter(),scale=Object.assign(new EventEmitter(),{width:390,height:844}),sceneEvents=new EventEmitter();
let phase=0,restarts=[];
const scene={game:{events,registry},registry,scale,events:sceneEvents,sys:{isActive:()=>true},scene:{restart:payload=>restarts.push(payload)}};
watchResize(scene,{restart:true,persist:()=>({beat:0,phase})});
scale.emit('resize',{width:310,height:844});await wait(190);assert.equal(restarts.length,0);
// Explicit navigation is processed before POST_STEP and shuts down the old scene.
sceneEvents.emit('shutdown');phase=2;events.emit('poststep');assert.equal(restarts.length,0);
watchResize(scene,{restart:true,persist:()=>({beat:0,phase})});
scale.emit('resize',{width:310,height:844});await wait(190);phase=3;events.emit('poststep');assert.deepEqual(restarts,[{beat:0,phase:3}]);
// Debouncing removes a registered callback as well as a timer.
scale.emit('resize',{width:390,height:844});await wait(190);scale.emit('resize',{width:320,height:844});assert.equal(events.listenerCount('poststep'),0);sceneEvents.emit('shutdown');await wait(190);assert.equal(events.listenerCount('poststep'),0);
delete globalThis.window;
});
