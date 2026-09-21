import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScenarioCsv, SCENARIO_COLUMNS } from '../src/scenario-csv.js';
import { profileScenarioInBrowser, parseScenarioTime } from '../src/browser-profiler.js';

test('CSV offsets and reference events compile to native Task timing with automatic threads', () => {
 const tasks = parseScenarioCsv(SCENARIO_COLUMNS.join(',') + '\nfirst,A.goms,starting_at,,2\nsecond,B.goms,starting_after,first starts,0.5\nthird,C.goms,starting_after,first finishes,1');
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
  ['first',2000,4000],['second',2500,3500],['third',5000,6000]
 ]);
});

test('browser adapter only accepts finite nonnegative seconds',()=>{
 assert.equal(parseScenarioTime('.5'),500);
 for(const value of ['', '-1', '00:01:00', 'Infinity']) assert.throws(()=>parseScenarioTime(value));
});
