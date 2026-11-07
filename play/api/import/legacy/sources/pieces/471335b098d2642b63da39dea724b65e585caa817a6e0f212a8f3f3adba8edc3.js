/**
* @typedef {{
*   id: string, label: string, latin: string, note: string, from: string, stages: Stage[],
*   grow: (stage: number, seed: string) => import('three').Group, layer?: Layer
* }} Plant — `grow` builds it at a stage (0 … 9, the stages' indices; between them, on the way)
