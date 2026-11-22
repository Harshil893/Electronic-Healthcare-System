import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { requirementsAgent, sdlcSelectionAgent } from './ehr-agents';
import { textFromGenerateResult } from './text-utils';
import { workspaceRoot } from './workspace';

const previewDir = join(workspaceRoot, 'artifacts/evaluation');

const listRequirements = createStep({
  id: 'list-ehr-requirements',
  description: 'EHR Requirements Agent structures the brief into an SRS.',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ requirements: z.string() }),
  execute: async ({ inputData }) => {
    const result = await requirementsAgent.generate(inputData.prompt);
    const requirements = textFromGenerateResult(result);
    if (!requirements) throw new Error('EHR Requirements Agent returned no text');
    return { requirements };
  },
});

const selectSdlc = createStep({
  id: 'select-ehr-sdlc',
  description: 'SDLC Selection Agent chooses and justifies a lifecycle for the EHR SRS.',
  inputSchema: z.object({ requirements: z.string() }),
  outputSchema: z.object({ requirements: z.string(), sdlc: z.string(), document: z.string() }),
  execute: async ({ inputData }) => {
    const result = await sdlcSelectionAgent.generate(`Select a suitable SDLC for this EHR specification.\n\n${inputData.requirements}`);
    const sdlc = textFromGenerateResult(result);
    if (!sdlc) throw new Error('EHR SDLC Selection Agent returned no text');
    return { requirements: inputData.requirements, sdlc, document: `${inputData.requirements.trim()}\n\n---\n\n${sdlc.trim()}` };
  },
});

const writePreview = createStep({
  id: 'write-ehr-preview',
  description: 'Write Markdown and a polished HTML preview under artifacts/evaluation.',
  inputSchema: z.object({ requirements: z.string(), sdlc: z.string(), document: z.string() }),
  outputSchema: z.object({ requirements: z.string(), sdlc: z.string(), document: z.string(), markdownPath: z.string(), htmlPath: z.string() }),
  execute: async ({ inputData }) => {
    await mkdir(previewDir, { recursive: true });
    const markdownPath = join(previewDir, 'latest.md');
    const htmlPath = join(previewDir, 'latest.html');
    await writeFile(markdownPath, `${inputData.document.trim()}\n`, 'utf8');
    await writeFile(htmlPath, htmlPreview(inputData.document), 'utf8');
    return { ...inputData, markdownPath, htmlPath };
  },
});

// "</" is escaped so the markdown can never close the inline <script> early.
const htmlPreview = (markdown: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>CARE · EHR Requirements Studio</title><style>:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#13293d;background:#f3f8f8;line-height:1.6}body{margin:0}.shell{max-width:1080px;margin:auto;padding:32px 22px 64px}.hero{background:linear-gradient(135deg,#0b3c49,#0f766e);color:#fff;border-radius:24px;padding:34px 38px;box-shadow:0 16px 42px #0b3c4922}.eyebrow{letter-spacing:.12em;text-transform:uppercase;font-size:.75rem;color:#99f6e4;font-weight:700}.hero h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.05;margin:12px 0}.hero p{max-width:720px;color:#d5f1ee;margin:0}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.chip{border:1px solid #ffffff38;border-radius:999px;padding:5px 11px;font-size:.8rem;color:#e6fbf8}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0}.card{background:#fff;border:1px solid #dbe7e8;border-radius:16px;padding:18px;box-shadow:0 5px 18px #0b3c490b}.card strong{display:block;color:#0f766e;font-size:1.1rem}.content{background:#fff;border:1px solid #dbe7e8;border-radius:18px;padding:28px 34px;box-shadow:0 5px 18px #0b3c490b}.content h2{color:#0b3c49;border-bottom:1px solid #e3eeee;padding-bottom:8px;margin-top:2rem}.content h3{color:#0f766e}.content table{border-collapse:collapse;width:100%;display:block;overflow:auto}.content th,.content td{border:1px solid #dbe7e8;padding:9px;text-align:left;vertical-align:top}.content th{background:#e8f6f4}.content code{background:#eaf1f3;padding:2px 5px;border-radius:5px}.content blockquote{border-left:4px solid #2dd4bf;margin-left:0;padding-left:16px;color:#4b6270}.footer{color:#5b7280;font-size:.82rem;margin-top:18px}@media(max-width:760px){.grid{grid-template-columns:1fr}.hero{padding:26px 24px}.content{padding:22px 18px}}</style></head><body><main class="shell"><section class="hero"><div class="eyebrow">CARE · Requirements Engineering</div><h1>Electronic Health Record Specification</h1><p>Retrieval-grounded requirements and SDLC analysis for patient records, clinical documentation, orders and results, e-prescribing, interoperability, privacy, security, and accessibility.</p><div class="chips"><span class="chip">Local LM Studio</span><span class="chip">BM25 evidence</span><span class="chip">Clinical and legal review required</span></div></section><section class="grid"><div class="card"><strong>1 · Discover</strong>Requirements are extracted from the project brief and stakeholder context.</div><div class="card"><strong>2 · Ground</strong>Public healthcare standards are retrieved from the local EHR corpus.</div><div class="card"><strong>3 · Decide</strong>An SDLC is selected with project-specific gates and residual risks.</div></section><article class="content" id="content"></article><p class="footer">Generated locally by CARE. Clinical, legal, privacy, security, and accessibility conclusions require qualified human review.</p></main><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><script>document.getElementById('content').innerHTML=marked.parse(${JSON.stringify(markdown).replace(/<\//g, '<\\/')});</script></body></html>`;

export const requirementsThenSdlc = createWorkflow({
  id: 'ehr-requirements-then-sdlc',
  description: 'EHR requirements followed by justified SDLC selection. Writes artifacts/evaluation/latest.md and latest.html.',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ requirements: z.string(), sdlc: z.string(), document: z.string(), markdownPath: z.string(), htmlPath: z.string() }),
}).then(listRequirements).then(selectSdlc).then(writePreview).commit();

export const runRequirementsThenSdlc = async (prompt: string) => {
  const run = await requirementsThenSdlc.createRun();
  const result = await run.start({ inputData: { prompt } });
  if (result.status !== 'success') {
    const message = result.status === 'failed' ? result.error.message : result.status;
    throw new Error(`Workflow failed: ${message}`);
  }
  return result.result;
};
