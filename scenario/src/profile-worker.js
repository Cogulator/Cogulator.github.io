import { profileScenarioInBrowser } from './browser-profiler.js';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ profile: profileScenarioInBrowser(data) });
  } catch (error) {
    self.postMessage({ error: error.message || 'Could not profile scenario' });
  }
};
