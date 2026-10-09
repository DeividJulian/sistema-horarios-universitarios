/// <reference lib="webworker" />

import { analyzeSchedule, AnalysisInput } from './schedule-analysis';

addEventListener('message', ({ data }: { data: AnalysisInput }) => {
  postMessage(analyzeSchedule(data));
});
