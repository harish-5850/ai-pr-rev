import { Module } from '@nestjs/common';
import { EslintRunnerService } from './eslint-runner.service';
import { SemgrepRunnerService } from './semgrep-runner.service';
import { ResultMergerService } from './result-merger.service';

@Module({
    providers: [EslintRunnerService, SemgrepRunnerService, ResultMergerService],
    exports: [EslintRunnerService, SemgrepRunnerService, ResultMergerService],
})
export class AnalysisModule { }
