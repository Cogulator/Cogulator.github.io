import test from 'node:test';
import assert from 'node:assert/strict';
import { packTaskLanes, buildSummary, summaryCsv } from '../src/summary-data.js';

test('sequential and touching tasks share one lane regardless of source order',()=>{
  const items=packTaskLanes([{id:'c',start:2,end:3},{id:'a',start:0,end:1},{id:'b',start:1,end:2}]);
  assert.deepEqual(items.map(item=>[item.id,item.lane]),[['a',0],['b',0],['c',0]]);
});
test('overlaps use only as many lanes as peak concurrency and reuse released lanes',()=>{
  const items=packTaskLanes([{id:'a',start:0,end:8},{id:'b',start:1,end:3},{id:'c',start:2,end:5},{id:'d',start:3,end:4},{id:'e',start:8,end:9}]);
  assert.deepEqual(items.map(item=>item.lane),[0,1,2,1,0]);
});
test('summary and export agree on overlap duration, timings and row assignments',()=>{
  const tasks=[{id:'a',model:'A.goms'},{id:'b',model:'B.goms'}];
  const profile={totalTaskTime:6000,memory:{averageLoad:1.2},workload:{max:5},taskInstances:[
    {id:'a',scheduledStartTime:0,startTime:0,endTime:4000},
    {id:'b',scheduledStartTime:1000,startTime:2000,endTime:6000},
  ]};
  const summary=buildSummary(tasks,profile);
  assert.equal(summary.metrics.find(m=>m.key==='multitasking_time').value,2);
  assert.equal(summary.metrics.find(m=>m.key==='peak_concurrent_tasks').value,2);
  assert.equal(summary.instances[1].delay,1);
  const csv=summaryCsv(summary);
  assert.match(csv, /"metric","multitasking_time","2","seconds"/);
  assert.match(csv, /"task","","","","b","B.goms","1","2","6","4","1","2"/);
});
test('zero-duration tasks do not inflate concurrency',()=>{
 const summary=buildSummary([],{totalTaskTime:0,memory:{averageLoad:0},workload:{max:0},taskInstances:[{id:'empty',scheduledStartTime:0,startTime:0,endTime:0}]});
 assert.equal(summary.metrics.find(m=>m.key==='peak_concurrent_tasks').value,0);
});

test('model statistics average repeated instances and attribute overlapping time to each model',()=>{
 const tasks=[{id:'a1',model:'A.goms'},{id:'a2',model:'A.goms'},{id:'b',model:'B.goms'}];
 const profile={totalTaskTime:4000,memory:{averageLoad:0,loads:Array.from({length:81},(_,index)=>index)},workload:{max:0},taskInstances:[
   {id:'a1',scheduledStartTime:0,startTime:0,endTime:1000},
   {id:'a2',scheduledStartTime:2000,startTime:2000,endTime:4000},
   {id:'b',scheduledStartTime:500,startTime:500,endTime:2500},
 ]};
 const summary=buildSummary(tasks,profile);
 const modelA=summary.models.find(model=>model.model==='A.goms');
 assert.deepEqual({
   instances:modelA.instances, averageTaskTime:modelA.averageTaskTime, taskTimeStandardDeviation:modelA.taskTimeStandardDeviation,
   averageMemoryLoad:modelA.averageMemoryLoad, memoryLoadStandardDeviation:modelA.memoryLoadStandardDeviation, multitaskingTime:modelA.multitaskingTime,
 },{instances:2,averageTaskTime:1.5,taskTimeStandardDeviation:.5,averageMemoryLoad:35,memoryLoadStandardDeviation:25,multitaskingTime:1});
 assert.equal(summary.models.find(model=>model.model==='B.goms').multitaskingTime,1);
 assert.match(summaryCsv(summary), /"model".*"A.goms".*"1.5".*"35".*"1"/);
});
