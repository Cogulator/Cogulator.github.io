export const SCENARIO_COLUMNS = ['unique_task_name','goms_file','start_type','reference_task','start_time_in_seconds'];

function readRows(text) {
  const input = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rows = [];
  let row = [], field = '', quoted = false, closedQuote = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else field += char;
    } else if (char === ',' || char === '\n') {
      row.push(field); field = ''; closedQuote = false;
      if (char === '\n') { if (row.some(value => value.trim())) rows.push(row); row = []; }
    } else if (char === '"') {
      if (field || closedQuote) throw new Error('Invalid CSV quoting. Enclose fields containing commas or quotes in double quotes.');
      quoted = true;
    } else {
      if (closedQuote && char.trim()) throw new Error('Unexpected text after a quoted CSV field.');
      if (!closedQuote) field += char;
    }
  }
  if (quoted) throw new Error('Unclosed quote in scenario CSV.');
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function parseScenarioCsv(text) {
  const rows = readRows(text);
  const headers = rows.shift()?.map(value => value.trim()) || [];
  if (headers.length !== SCENARIO_COLUMNS.length || new Set(headers).size !== headers.length || SCENARIO_COLUMNS.some(name => !headers.includes(name))) {
    throw new Error(`Scenario CSV requires these five columns: ${SCENARIO_COLUMNS.join(',')}`);
  }
  if (!rows.length) throw new Error('The scenario CSV needs at least one task row.');
  const ids = new Set();
  const tasks = rows.map((row, index) => {
    const fail = message => { throw new Error(`Scenario row ${index + 2}: ${message}`); };
    if (row.length !== headers.length) fail('expected five fields.');
    const item = Object.fromEntries(headers.map((header, i) => [header, row[i].trim()]));
    const id = item.unique_task_name, model = item.goms_file;
    if (!id) fail('unique_task_name cannot be blank.');
    if (ids.has(id)) fail(`unique_task_name “${id}” is duplicated.`);
    ids.add(id);
    if (!model || !/\.goms$/i.test(model)) fail('goms_file must name a .goms file.');
    const startType = item.start_type;
    if (!['starting_at','starting_after'].includes(startType)) fail('start_type must be starting_at or starting_after.');
    const startValue = item.start_time_in_seconds;
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(startValue) || !Number.isFinite(Number(startValue) * 1000)) {
      fail('start_time_in_seconds must be a non-negative number of seconds, such as 0 or 2.5.');
    }
    const referenceText = item.reference_task;
    const reference = referenceText.match(/^(.+)\s+(starts|finishes)$/);
    const referenceTask = reference ? reference[1].trim() : referenceText;
    const referenceEvent = reference?.[2] || '';
    if (startType === 'starting_at' && referenceTask) fail('leave reference_task blank for starting_at.');
    if (startType === 'starting_after' && !referenceTask) fail('starting_after requires reference_task.');
    if (startType === 'starting_after' && !reference) fail('reference_task must be a task name followed by starts or finishes, just as in a Task.');
    return { id, model, startType, referenceTask, referenceEvent, startValue };
  });
  const byId = new Map(tasks.map(task => [task.id, task]));
  const visited = new Set(), visiting = new Set();
  function visit(task) {
    if (visited.has(task.id)) return;
    if (visiting.has(task.id)) throw new Error(`Circular reference_task dependency involving “${task.id}”.`);
    visiting.add(task.id);
    if (task.referenceTask) {
      const reference = byId.get(task.referenceTask);
      if (!reference) throw new Error(`Task “${task.id}” references unknown task “${task.referenceTask}”.`);
      visit(reference);
    }
    visiting.delete(task.id); visited.add(task.id);
  }
  tasks.forEach(visit);
  return tasks;
}

export function serializeScenarioCsv(tasks) {
  const rows = tasks.map(task => [task.id, task.model, task.startType, task.referenceTask ? `${task.referenceTask} ${task.referenceEvent}` : '', task.startValue]);
  return [SCENARIO_COLUMNS.join(','), ...rows.map(row => row.map(value => '"' + String(value).replaceAll('"','""') + '"').join(','))].join('\r\n') + '\r\n';
}
