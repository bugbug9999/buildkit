Done. Replaced the flat step grid with the full ReactFlow implementation. Key additions over the original:

- `@xyflow/react` import + CSS
- `LiveExecutionNode` custom node with status badge, glow pulse, ping dot
- `nodes` / `edges` memos with start/end nodes and color-coded edges
- `<ReactFlow fitView>` canvas replacing the `<div className="grid gap-3">` step list
- `pipelines` store selector for codebase fallback
- All original logs, progress bar, and buttons preserved
