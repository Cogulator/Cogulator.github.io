# Cogulator Scenario Profiler

A browser-hosted tool for scheduling multiple Cogulator `.goms` task models into a longer scenario. It keeps all files and modeling work in the browser: no model or scenario files are uploaded or stored by the site.

## Run

```sh
npm run dev
```

## Current workflow

1. Add `.goms` files. Each may be instantiated as a scheduled task.
2. Load the scenario CSV using the scenario upload panel.
3. The profiler generates one GOMS source with a Task wrapper for every CSV row, then evaluates that source with the shared Cogulator processor. Timeline and Summary appear together on one results page.
4. Use **Export Scenario GOMS** to download the exact combined model, or expand **Inspect scenario GOMS** beneath the summary to read it. Modeling errors identify the original task, model, and line. Command/Ctrl+S still downloads the CSV.

Each CSV row is a separate task instance, which permits an instance to overlap itself or another instance of the same model.

```csv
unique_task_name,goms_file,start_type,reference_task,start_time_in_seconds
alert,System alert response.goms,starting_at,,15
reply,Reply to controller.goms,starting_after,alert finishes,2
monitor,Monitor.goms,starting_after,alert starts,0
```

The five columns mirror Task scheduling:

- `unique_task_name`: a unique name for this model insertion. References use this name; generated thread names are assigned automatically.
- `goms_file`: the exact name of a loaded `.goms` file.
- `start_type`: `starting_at` or `starting_after`.
- `reference_task`: blank for `starting_at`; for `starting_after`, the referenced unique task name followed by `starts` or `finishes`, just as in a Task timing clause.
- `start_time_in_seconds`: a non-negative number of seconds, including decimals. For `starting_at`, this is the scenario offset. For `starting_after`, it is the delay added after the referenced event. Enter `0` for no delay.

For example, `reply` becomes `Task: Reply to controller.goms as task_2 starting_after task_1 finishes plus 2000 ms`. The processor waits for the referenced task's actual start or completion (including internal branches), exactly as it does in Cogulator. No thread-name column is needed.

The old `id,model,start_type,start_value,reference_task,notes` format and clock-formatted times are no longer accepted. Missing references, duplicate names, circular dependencies, and invalid times are reported when loading the CSV. Scenario CSV export uses the same five-column format.

## GitHub Pages

The included GitHub Actions workflow builds and publishes the site from the `main` branch. In the GitHub repository, open **Settings → Pages**, set the source to **GitHub Actions**, then push the repository to GitHub. The published application is fully static; people load their own local `.goms` and `.csv` files through the browser.

To create a production build locally:

```sh
npm run build
```

## Current scope

The first release supports one modeled participant. Multiple participants remain a future extension: each participant should own an independent engine/resource pool, with explicit message/event links for cross-participant actions such as spoken responses.

## Combined GOMS source

Each task receives a unique generated thread ID (`task_1`, `task_2`, …), retaining a mapping to the CSV ID. Absolute times become `starting_at` offsets. Relative times become `starting_after ... starts` or `starting_after ... finishes` clauses with an offset. These follow actual resource-delayed starts and completion of all internal branches.

The shared processor handles all resource contention, working memory, and workload. No standalone-duration estimates or separate scenario step scheduler are used. Generated source and direct Cogulator runs use the same scheduling semantics. To compare timings, use the same operator definitions in Cogulator as the profiler's default library.

Load individual Goal/Also models, rather than files already containing Task wrappers. GoTo inside Task models is not yet supported. Invalid schedules are rejected; models with processing errors can still be inspected in the source inspector. The download includes comment lines identifying each original CSV task and model.

## Results layout and customization

The loaded scenario uses a single page with the timeline, summary metrics, and task timing table. Timeline rows are packed by actual task start/end times: sequential tasks reuse one row, and only overlapping spans need additional rows. Adjacent tasks with matching finish/start times share a row. The chart represents task spans, including waits and resource delays within those spans, rather than individual resource occupancy.

**Export Summary Data** downloads a CSV containing scenario metrics and one timing record per task. It includes scheduled and actual starts, finish times, durations, initial delays, and the displayed timeline row (one-based). GOMS export and Command/Ctrl+S scenario-CSV export remain available.

Edit [`src/style.css`](src/style.css) to change the interface. The `:root` section holds page/panel colors, lane colors, content width, page gutters, lane height, and minimum timeline height. The remaining rules are grouped by screen section. This replaces the previous `src/style/main.css` stylesheet.

Run `npm test` for scenario CSV validation, shared-processor timing, timeline packing, and summary-export checks.

The timeline includes an elapsed-time ruler and **Zoom in / Fit / Zoom out** controls. Zoom keeps the current view centered; scroll horizontally to explore the expanded timeline. **Fit** shows the entire scenario at any window width. A newly profiled scenario starts fitted.
