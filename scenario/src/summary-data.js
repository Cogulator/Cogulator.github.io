// Rows represent overlapping task spans, not model identity or resource type.
export function packTaskLanes(instances) {
  const laneEnds = [];
  const sorted = instances.map((instance, index) => ({ ...instance, index }))
    .sort((a, b) => a.start - b.start || a.index - b.index);
  return sorted.map(instance => {
    let lane = instance.end === instance.start ? 0 : laneEnds.findIndex(end => end <= instance.start);
    if (lane < 0) lane = laneEnds.length;
    if (instance.end > instance.start) laneEnds[lane] = instance.end;
    return { ...instance, lane };
  });
}

function memoryLoadDuring(instance, loads) {
  if (!loads?.length) return 0;
  const first = Math.max(0, Math.ceil(instance.start * 1000 / 50));
  const last = Math.min(loads.length - 1, Math.floor(instance.end * 1000 / 50));
  const samples = loads.slice(first, Math.max(first + 1, last + 1));
  return samples.reduce((sum, load) => sum + load, 0) / samples.length;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  const mean = average(values);
  return Math.sqrt(average(values.map(value => (value - mean) ** 2)));
}

export function buildSummary(tasks, profile) {
  if (!profile?.taskInstances.length) return null;
  const byId = new Map(tasks.map(task => [task.id, task]));
  const instances = packTaskLanes(profile.taskInstances.map(instance => ({
    id: instance.id, model: byId.get(instance.id)?.model || instance.id,
    scheduledStart: instance.scheduledStartTime / 1000,
    start: instance.startTime / 1000, end: instance.endTime / 1000,
    duration: (instance.endTime - instance.startTime) / 1000,
    delay: (instance.startTime - instance.scheduledStartTime) / 1000,
  })));
  for (const instance of instances) instance.memoryLoad = memoryLoadDuring(instance, profile.memory?.loads);
  const events = instances.filter(item => item.duration > 0)
    .flatMap(item => [{ time: item.start, change: 1, model: item.model }, { time: item.end, change: -1, model: item.model }])
    .sort((a, b) => a.time - b.time || a.change - b.change);
  let active = 0, peak = 0, multitasking = 0, previous = 0;
  const activeByModel = new Map();
  const multitaskingByModel = new Map();
  for (const event of events) {
    const elapsed = event.time - previous;
    if (active > 1) {
      multitasking += elapsed;
      for (const [model, count] of activeByModel) {
        if (count > 0) multitaskingByModel.set(model, (multitaskingByModel.get(model) || 0) + elapsed);
      }
    }
    active += event.change;
    activeByModel.set(event.model, (activeByModel.get(event.model) || 0) + event.change);
    peak = Math.max(peak, active);
    previous = event.time;
  }
  const models = [...new Map(instances.map(item => [item.model, []])).entries()].map(([model, modelInstances]) => {
    for (const instance of instances) if (instance.model === model) modelInstances.push(instance);
    const durations = modelInstances.map(instance => instance.duration);
    const memoryLoads = modelInstances.map(instance => instance.memoryLoad);
    return {
      model,
      instances: modelInstances.length,
      averageTaskTime: average(durations), taskTimeStandardDeviation: standardDeviation(durations),
      averageMemoryLoad: average(memoryLoads), memoryLoadStandardDeviation: standardDeviation(memoryLoads),
      multitaskingTime: multitaskingByModel.get(model) || 0,
    };
  });
  return { instances, models, metrics: [
    { key: 'scenario_span', label: 'Scenario span', value: profile.totalTaskTime / 1000, unit: 'seconds' },
    { key: 'scheduled_tasks', label: 'Scheduled tasks', value: instances.length, unit: 'tasks' },
    { key: 'total_task_time', label: 'Total task time', value: instances.reduce((sum, item) => sum + item.duration, 0), unit: 'seconds' },
    { key: 'peak_concurrent_tasks', label: 'Peak concurrent tasks', value: peak, unit: 'tasks' },
    { key: 'multitasking_time', label: 'Multitasking time', value: multitasking, unit: 'seconds' },
    { key: 'average_memory_load', label: 'Average memory load', value: profile.memory.averageLoad, unit: 'chunks' },
    { key: 'max_workload', label: 'Peak workload', value: profile.workload.max, unit: 'out of 10' },
  ] };
}

export function summaryCsv(summary) {
  if (!summary) return '';
  const rows = [['record_type','metric','value','unit','task_id','model','scheduled_start_seconds','start_seconds','end_seconds','duration_seconds','start_delay_seconds','timeline_row','average_task_time_seconds','task_time_sd_seconds','average_wm_load_chunks','wm_load_sd_chunks','total_time_multitasked_seconds']];
  for (const metric of summary.metrics) rows.push(['metric',metric.key,metric.value,metric.unit,'','','','','','','','']);
  for (const model of summary.models) rows.push(['model','','','', '',model.model,'','','','','','',model.averageTaskTime,model.taskTimeStandardDeviation,model.averageMemoryLoad,model.memoryLoadStandardDeviation,model.multitaskingTime]);
  for (const item of summary.instances) rows.push(['task','','','',item.id,item.model,item.scheduledStart,item.start,item.end,item.duration,item.delay,item.lane + 1]);
  return rows.map(row => row.map(value => {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"','""') + '"';
  }).join(',')).join('\r\n') + '\r\n';
}
