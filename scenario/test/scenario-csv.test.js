import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIO_COLUMNS, parseScenarioCsv, serializeScenarioCsv } from '../src/scenario-csv.js';
const header = SCENARIO_COLUMNS.join(',');

test('loads new schema, decimal seconds and forward references',()=>{
 const tasks=parseScenarioCsv(header+'\nreply,Reply.goms,starting_after,alert finishes,2.5\nalert,Alert.goms,starting_at,,15');
 assert.deepEqual(tasks[0],{id:'reply',model:'Reply.goms',startType:'starting_after',referenceTask:'alert',referenceEvent:'finishes',startValue:'2.5'});
 assert.deepEqual(parseScenarioCsv(serializeScenarioCsv(tasks)),tasks);
 assert.equal(serializeScenarioCsv(tasks).split('\r\n')[0],header);
});
test('supports BOM, CRLF, reordered columns and quoted filenames',()=>{
 const tasks=parseScenarioCsv('\uFEFFgoms_file,unique_task_name,start_type,start_time_in_seconds,reference_task\r\n"Push, then ""confirm"".goms",push,starting_at,0,\r\n');
 assert.equal(tasks[0].model,'Push, then "confirm".goms');
 assert.deepEqual(parseScenarioCsv(serializeScenarioCsv(tasks)),tasks);
});
test('rejects ambiguous, incomplete and old-format schedules',()=>{
 for(const csv of [
  'id,model,start_type,start_value,reference_task,notes\na,A.goms,absolute,0,,',
  header, header+'\na,A.goms,absolute,,0', header+'\na,A.goms,starting_at,,00:00:10',
  header+'\na,A.goms,starting_at,,',header+'\na,A.goms,starting_at,other,0',
  header+'\na,A.goms,starting_after,,0',header+'\na,A.goms,starting_after,missing finishes,0',
  header+'\na,A.goms,starting_at,,0\na,B.goms,starting_at,,1',
  header+'\na,A.goms,starting_after,b starts,0\nb,B.goms,starting_after,a finishes,0',
  header+'\na,A.goms,starting_at,,-1',header+'\na,A.goms,starting_at,,1,extra',
  header+'\na,"A.goms,starting_at,,0',
 ]) assert.throws(()=>parseScenarioCsv(csv),undefined,csv);
});
