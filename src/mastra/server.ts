import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import { config } from './config';
import { requirementsAgent, sdlcSelectionAgent } from './ehr-agents';
import { gatherEvidence } from './rag';
import { textFromGenerateResult } from './text-utils';
import { workspaceRoot } from './workspace';

const briefBody = z.object({ prompt: z.string().trim().min(8, 'Write a longer brief (8+ characters).').max(8000) });
const sdlcBody = z.object({ requirements: z.string().trim().min(40, 'Requirements text is too short.').max(60000) });

const fail = (c: { json: (body: unknown, status?: 400 | 500) => Response }, error: unknown, status: 400 | 500 = 500) =>
  c.json({ error: error instanceof Error ? error.message : String(error) }, status);

// Custom web UI + API (served by the same Mastra server, e.g. http://localhost:4111/care).
export const careApiRoutes = [
  registerApiRoute('/care', {
    method: 'GET',
    requiresAuth: false,
    handler: async (c) => c.html(await readFile(join(workspaceRoot, 'ui/index.html'), 'utf8')),
  }),

  registerApiRoute('/care/health', {
    method: 'GET',
    requiresAuth: false,
    handler: async (c) => {
      let lmStudio = false;
      try {
        const res = await fetch(`${config.lmStudio.baseURL.replace(/\/$/, '')}/models`, { signal: AbortSignal.timeout(2500) });
        lmStudio = res.ok;
      } catch { /* LM Studio not reachable */ }
      return c.json({ lmStudio, model: config.lmStudio.model });
    },
  }),

  // Agent (i): brief in -> SRS out.
  registerApiRoute('/care/requirements', {
    method: 'POST',
    requiresAuth: false,
    handler: async (c) => {
      const parsed = briefBody.safeParse(await c.req.json().catch(() => ({})));
      if (!parsed.success) return fail(c, parsed.error.issues[0]?.message ?? 'Invalid request', 400);
      try {
        const evidence = (await gatherEvidence(parsed.data.prompt)).map((hit) => hit.id);
        const requirements = textFromGenerateResult(await requirementsAgent.generate(parsed.data.prompt));
        if (!requirements) throw new Error('EHR Requirements Agent returned no text. Is the model loaded in LM Studio?');
        return c.json({ requirements, evidence });
      } catch (error) {
        console.error('[care] requirements failed', error);
        return fail(c, error);
      }
    },
  }),

  // Agent (ii): SRS in -> SDLC out.
  registerApiRoute('/care/sdlc', {
    method: 'POST',
    requiresAuth: false,
    handler: async (c) => {
      const parsed = sdlcBody.safeParse(await c.req.json().catch(() => ({})));
      if (!parsed.success) return fail(c, parsed.error.issues[0]?.message ?? 'Invalid request', 400);
      try {
        const evidence = (await gatherEvidence(parsed.data.requirements.slice(0, 1500))).map((hit) => hit.id);
        const sdlc = textFromGenerateResult(await sdlcSelectionAgent.generate(`Select a suitable SDLC for this EHR specification.\n\n${parsed.data.requirements}`));
        if (!sdlc) throw new Error('EHR SDLC Selection Agent returned no text.');
        return c.json({ sdlc, evidence });
      } catch (error) {
        console.error('[care] sdlc failed', error);
        return fail(c, error);
      }
    },
  }),
];
