import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIO_COLUMNS, parseScenarioCsv, serializeScenarioCsv } from '../src/scenario-csv.js';
const header = SCENARIO_COLUMNS.join(',');

test('generates names and round-trips decimal seconds and forward references', () => {
 const tasks = parseScenarioCsv(header + '\nReply.goms,starting_after,Alert_2 finishes,2.5\nAlert.goms,starting_at,,15');
 assert.deepEqual(tasks[0], {id:'Reply_1',model:'Reply.goms',startType:'starting_after',referenceTask:'Alert_2',referenceEvent:'finishes',startValue:'2.5'});
 assert.deepEqual(parseScenarioCsv(serializeScenarioCsv(tasks)), tasks);
 assert.equal(serializeScenarioCsv(tasks).split('\r\n')[0], 'goms_file,start_type,reference_task,start_time_in_seconds');
});

test('names use the position across all tasks and omit only the final extension', () => {
 const tasks = parseScenarioCsv(header + '\nLeader_Line_Offset.goms,starting_at,,0\nMonitor.goms,starting_at,,.25\nLeader_Line_Offset.goms,starting_at,,0.5\nRoute.goms copy.GOMS,starting_at,,1');
 assert.deepEqual(tasks.map(task => task.id), ['Leader_Line_Offset_1', 'Monitor_2', 'Leader_Line_Offset_3', 'Route.goms copy_4']);
 assert.deepEqual(parseScenarioCsv(serializeScenarioCsv(tasks)), tasks);
});

test('supports BOM, CRLF, reordered columns and quoted filenames', () => {
 const tasks = parseScenarioCsv('\uFEFFstart_time_in_seconds,reference_task,goms_file,start_type\r\n0,,"Push, then ""confirm"".goms",starting_at\r\n');
 assert.equal(tasks[0].model, 'Push, then "confirm".goms');
 assert.equal(tasks[0].id, 'Push, then "confirm"_1');
 assert.deepEqual(parseScenarioCsv(serializeScenarioCsv(tasks)), tasks);
});

test('rejects ambiguous, incomplete and old-format schedules', () => {
 for (const csv of [
  'id,model,start_type,start_value,reference_task,notes\na,A.goms,absolute,0,,',
  'unique_task_name,' + header + '\na,A.goms,starting_at,,0',
  'goms_file,start_type,start_type,start_time_in_seconds\nA.goms,starting_at,,0',
  header, header + '\nA.goms,absolute,,0', header + '\nA.goms,starting_at,,00:00:10',
  header + '\nA.goms,starting_at,,', header + '\nA.goms,starting_at,other,0',
  header + '\nA.goms,starting_after,,0', header + '\nA.goms,starting_after,missing finishes,0',
  header + '\nA.goms,starting_after,B_2 starts,0\nB.goms,starting_after,A_1 finishes,0',
  header + '\nA.goms,starting_at,,-1', header + '\nA.goms,starting_at,,1,extra',
  header + '\nA.goms,starting_at', header + '\nA.txt,starting_at,,0',
  header + '\n"A.goms,starting_at,,0',
 ]) assert.throws(() => parseScenarioCsv(csv), undefined, csv);
});
