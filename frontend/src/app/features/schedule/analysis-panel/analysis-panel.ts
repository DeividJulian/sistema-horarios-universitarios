import { Component, input } from '@angular/core';

import { AnalysisResult } from '../../../workers/schedule-analysis';

@Component({
  selector: 'app-analysis-panel',
  templateUrl: './analysis-panel.html',
  styleUrl: './analysis-panel.css',
})
export class AnalysisPanel {
  readonly result = input.required<AnalysisResult>();
}
