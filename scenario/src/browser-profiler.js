import engine from '@cogulator/modeling-engine';

const { profileScenario } = engine;

export function parseScenarioTime(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text) * 1000)) {
    throw new Error(`Invalid scenario time “${text}”. Use a non-negative number of seconds.`);
  }
  return Number(text) * 1000;
}

function summarizeMemoryChunks(workingMemory) {
  const chunks = new Map();
  for (let stack = 0; stack < workingMemory.length; stack += 1) {
    for (const chunk of workingMemory[stack]) {
      const key = `${chunk.chunkName}\u0000${chunk.addedAt}`;
      const current = chunks.get(key) || {
        name: chunk.chunkName.replace(/^<[^:>]+:/, '<'),
        startTime: chunk.addedAt,
        endTime: (stack + 1) * 50,
        color: chunk.color,
      };
      current.endTime = Math.max(current.endTime, (stack + 1) * 50);
      chunks.set(key, current);
    }
  }
  return [...chunks.values()].sort((a, b) => a.startTime - b.startTime || a.name.localeCompare(b.name));
}

export function profileScenarioInBrowser({ tasks, models }) {
  const sourceByName = new Map((models || []).map(model => [model.name, model.source]));
  const prepared = tasks.map(task => {
    const source = sourceByName.get(task.model);
    if (source == null) throw new Error(`No loaded .goms file matches “${task.model}”.`);
    const startType = task.startType === 'starting_at' ? 'absolute'
      : task.startType === 'starting_after' && task.referenceEvent === 'starts' ? 'after_start'
      : task.startType === 'starting_after' && task.referenceEvent === 'finishes' ? 'after_finish' : null;
    if (!startType) throw new Error(`Invalid Task timing for “${task.id}”.`);
    return { id: task.id, model: task.model, source, startType,
      startTime: parseScenarioTime(task.startValue), referenceTask: task.referenceTask };
  });
  const result = profileScenario({ tasks: prepared });

  return {
    source: result.source,
    sourceMap: result.sourceMap,
    totalTaskTime: result.totalTaskTime,
    taskInstances: result.taskInstances,
    memory: {
      averageLoad: result.memory.averageLoad,
      loads: result.memory.workingMemory.map(stack => stack.length),
      chunks: summarizeMemoryChunks(result.memory.workingMemory),
    },
    workload: { max: result.workload.max },
    errors: result.errors,
  };
}
