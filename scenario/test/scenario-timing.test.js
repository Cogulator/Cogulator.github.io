import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScenarioCsv, SCENARIO_COLUMNS } from '../src/scenario-csv.js';
import { profileScenarioInBrowser, parseScenarioTime } from '../src/browser-profiler.js';
import engine from '@cogulator/modeling-engine';

test('each task uses consistent chunk names for acquisition, use and removal', () => {
 const source = 'Goal: Leader Line Offset\n.Look at <763>\n.Recall <8> for direction\n.Type <8> <763>\n.Cognitive_processor verify correct\n.Keystroke Enter\n.Ignore <8> <763>';
 const result = engine.profileScenario({ tasks: [
  { id: 'first', source, startTime: 0 },
  { id: 'second', source, startTime: 0 },
 ] });
 assert.deepEqual(result.errors, []);
 for (const [id, prefix] of [['first', 'task_1'], ['second', 'task_2']]) {
  const steps = result.steps.filter(step => step.taskId === id);
  const names = numbers => numbers.map(number => `<${prefix}:${number}>`);
  assert.deepEqual(steps.find(step => step.operator === 'look').chunkNames, names([763]));
  assert.deepEqual(steps.find(step => step.operator === 'recall').chunkNames, names([8]));
  assert.deepEqual(steps.find(step => step.operator === 'type').chunkNames, names([8, 763]));
  assert.deepEqual(steps.find(step => step.operator === 'ignore').chunkNames, names([8, 763]));
  assert.ok(result.memory.workingMemory.some(stack => stack.some(chunk => chunk.chunkName === names([763])[0])));
 }
});

test('CSV offsets and reference events compile to native Task timing with automatic threads', () => {
 const tasks = parseScenarioCsv(SCENARIO_COLUMNS.join(',') + '\nA.goms,starting_at,,2\nB.goms,starting_after,A_1 starts,0.5\nC.goms,starting_after,A_1 finishes,1');
 const result = profileScenarioInBrowser({tasks, models:[
  {name:'A.goms',source:'Goal: A\n. Look at target (2 seconds)'},
  {name:'B.goms',source:'Goal: B\n. Say word (1 seconds)'},
  {name:'C.goms',source:'Goal: C\n. Click button (1 seconds)'},
 ]});
 assert.deepEqual(result.errors,[]);
 assert.match(result.source,/as task_1 starting_at 2000 ms/);
 assert.match(result.source,/as task_2 starting_after task_1 starts plus 500 ms/);
 assert.match(result.source,/as task_3 starting_after task_1 finishes plus 1000 ms/);
 assert.equal(result.totalTaskTime,6000);
 assert.deepEqual(result.taskInstances.map(t=>[t.id,t.startTime,t.endTime]),[
  ['A_1',2000,4000],['B_2',2500,3500],['C_3',5000,6000]
 ]);
});

test('browser adapter only accepts finite nonnegative seconds',()=>{
 assert.equal(parseScenarioTime('.5'),500);
 for(const value of ['', '-1', '00:01:00', 'Infinity']) assert.throws(()=>parseScenarioTime(value));
});

test('Unix timestamps use elapsed time while relative delays remain unchanged', () => {
 const tasks = parseScenarioCsv(SCENARIO_COLUMNS.join(',') + '\nA.goms,starting_at,,1532047230\nA.goms,starting_at,,1532047235\nA.goms,starting_after,A_1 finishes,1');
 const result = profileScenarioInBrowser({ tasks, models: [{name:'A.goms',source:'Goal: A\n. Click button (1 seconds)'}] });
 assert.deepEqual(result.errors, []);
 assert.equal(result.timeOrigin, 1532047230000);
 assert.equal(result.totalTaskTime, 6000);
 assert.deepEqual(result.taskInstances.map(t => [t.id,t.scheduledStartTime,t.endTime]), [
  ['A_1',0,1000],['A_2',5000,6000],['A_3',2000,3000],
 ]);
 assert.ok(result.memory.loads.length < 200);
});
