import test from 'node:test';
import assert from 'node:assert/strict';
import { packTaskLanes, buildSummary, summaryCsv } from '../src/summary-data.js';
import { profileScenarioInBrowser } from '../src/browser-profiler.js';
import { parseScenarioCsv, SCENARIO_COLUMNS } from '../src/scenario-csv.js';

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
  assert.deepEqual(summary.models.map(model=>model.taskTimePercentage),[50,50]);
  const csv=summaryCsv(summary);
  assert.match(csv, /"metric","multitasking_time","2","seconds"/);
  assert.match(csv, /"task","","","","b","B.goms","1","2","6","4","1","2"/);
});
test('zero-duration tasks do not inflate concurrency',()=>{
 const summary=buildSummary([],{totalTaskTime:0,memory:{averageLoad:0},workload:{max:0},taskInstances:[{id:'empty',scheduledStartTime:0,startTime:0,endTime:0}]});
 assert.equal(summary.metrics.find(m=>m.key==='peak_concurrent_tasks').value,0);
 assert.equal(summary.instances[0].operatorTime,0);
 assert.equal(summary.instances[0].waitingTime,0);
 assert.equal(summary.models[0].taskTimePercentage,0);
});

test('model statistics average repeated instances and attribute overlapping time to each model',()=>{
 const tasks=[{id:'a1',model:'A.goms'},{id:'a2',model:'A.goms'},{id:'b',model:'B.goms'}];
 const profile={totalTaskTime:4000,memory:{averageLoad:0,loads:Array.from({length:81},(_,index)=>index)},workload:{max:0},taskInstances:[
   {id:'a1',scheduledStartTime:0,startTime:0,endTime:1000},
   {id:'a2',scheduledStartTime:2000,startTime:2000,endTime:4000},
   {id:'b',scheduledStartTime:500,startTime:500,endTime:2500},
 ],steps:[
   {taskId:'a1',startTime:0,endTime:500},
   {taskId:'a2',startTime:2000,endTime:3500},
   {taskId:'b',startTime:500,endTime:2500},
 ]};
 const summary=buildSummary(tasks,profile);
 const modelA=summary.models.find(model=>model.model==='A.goms');
 assert.deepEqual({
   instances:modelA.instances, averageTaskTime:modelA.averageTaskTime, taskTimeStandardDeviation:modelA.taskTimeStandardDeviation,
   averageMemoryLoad:modelA.averageMemoryLoad, memoryLoadStandardDeviation:modelA.memoryLoadStandardDeviation, multitaskingTime:modelA.multitaskingTime,
 },{instances:2,averageTaskTime:1.5,taskTimeStandardDeviation:.5,averageMemoryLoad:35,memoryLoadStandardDeviation:25,multitaskingTime:1});
 assert.equal(modelA.averageOperatorTime,1);
 assert.equal(modelA.averageWaitingTime,.5);
 assert.equal(modelA.averageStartDelay,0);
 assert.equal(modelA.taskTimePercentage,60);
 assert.equal(summary.models.find(model=>model.model==='B.goms').taskTimePercentage,40);
 assert.equal(summary.models.reduce((sum,model)=>sum+model.taskTimePercentage,0),100);
 assert.equal(summary.models.find(model=>model.model==='B.goms').multitaskingTime,1);
 assert.match(summaryCsv(summary), /"model".*"A.goms".*"1.5".*"35".*"1"/);
});

test('separates visual contention after a notification from delay before a visual task starts', () => {
 const tasks = parseScenarioCsv(SCENARIO_COLUMNS.join(',') + '\nBlock.goms,starting_at,,0\nReview.goms,starting_at,,0\nVisual.goms,starting_at,,0');
 const profile = profileScenarioInBrowser({ tasks, models: [
  {name:'Block.goms',source:'Goal: Block\n.Look at display (2 seconds)'},
  {name:'Review.goms',source:'Goal: Review\n.Hear alert (250 ms)\n.Look at proposal (500 ms)'},
  {name:'Visual.goms',source:'Goal: Visual\n.Look at display (1 seconds)'},
 ] });
 assert.deepEqual(profile.errors, []);
 const summary = buildSummary(tasks, profile);
 const review = summary.instances.find(item => item.model === 'Review.goms');
 assert.equal(review.operatorTime, 0.75);
 assert.equal(review.waitingTime, 1.75);
 assert.equal(review.delay, 0);
 assert.equal(review.duration, 2.5);
 const visual = summary.instances.find(item => item.model === 'Visual.goms');
 assert.equal(visual.operatorTime, 1);
 assert.equal(visual.waitingTime, 0);
 assert.equal(visual.delay, 2.5);
 const reviewModel = summary.models.find(item => item.model === 'Review.goms');
 assert.equal(reviewModel.averageOperatorTime, 0.75);
 assert.equal(reviewModel.averageWaitingTime, 1.75);
 assert.equal(reviewModel.averageStartDelay, 0);

 const rows = summaryCsv(summary).split('\r\n').filter(Boolean).map(line => line.slice(1, -1).split('","'));
 const headers = rows.shift();
 assert.ok(rows.every(row => row.length === headers.length));
 const records = rows.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
 const modelRow = records.find(row => row.record_type === 'model' && row.model === 'Review.goms');
 assert.equal(modelRow.average_operator_time_seconds, '0.75');
 assert.equal(modelRow.average_waiting_time_seconds, '1.75');
 assert.equal(modelRow.average_start_delay_seconds, '0');
 assert.equal(Number(modelRow.task_time_percentage), 2.5 / 5.5 * 100);
 const taskRow = records.find(row => row.record_type === 'task' && row.task_id === 'Visual_3');
 assert.equal(taskRow.operator_time_seconds, '1');
 assert.equal(taskRow.waiting_time_seconds, '0');
 assert.equal(taskRow.start_delay_seconds, '2.5');
});

test('parallel operator intervals count once and gaps count as waiting', () => {
 const profile = { totalTaskTime: 9000, memory: {averageLoad:0}, workload: {max:0},
  taskInstances: [{id:'parallel', scheduledStartTime:0, startTime:0, endTime:9000}],
  steps: [
   {taskId:'parallel', startTime:3000, endTime:6000},
   {taskId:'parallel', startTime:8000, endTime:9000},
   {taskId:'parallel', startTime:0, endTime:4000},
   {taskId:'parallel', startTime:1000, endTime:2000},
  ],
 };
 const summary = buildSummary([], profile);
 assert.equal(summary.instances[0].operatorTime, 7);
 assert.equal(summary.instances[0].waitingTime, 2);
 assert.equal(summary.models[0].averageOperatorTime + summary.models[0].averageWaitingTime, 9);
});
