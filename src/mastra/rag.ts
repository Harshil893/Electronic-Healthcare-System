import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { InputProcessorOrWorkflow, ProcessInputArgs, ProcessInputResult } from '@mastra/core/processors';
import { careWorkspace, workspaceRoot } from './workspace';

const SKIP_IDS = /(?:clarify|specify|analyze)-command/i;
const MAX_HIT_CHARS = 1400;
const TOP_K = 6;
const EHR_SDLC_QUERY = 'electronic health record patient chart clinical documentation orders results medication privacy security audit interoperability accessibility patient safety application lifecycle';

const partText = (part: unknown): string => {
  if (typeof part === 'string') return part;
  if (!part || typeof part !== 'object') return '';
  const record = part as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;
  if (typeof record.content === 'string') return record.content;
  return '';
};

const messageText = (message: { content?: unknown }): string => {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(partText).join('\n');
  if (content && typeof content === 'object') {
    const record = content as Record<string, unknown>;
    if (typeof record.content === 'string') return record.content;
    if (Array.isArray(record.parts)) return record.parts.map(partText).join('\n');
  }
  return '';
};

const queryFromMessages = (messages: Array<{ role?: string; content?: unknown }>) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== 'user') continue;
    const text = messageText(message).trim();
    if (text) return text;
  }
  return '';
};

export const retrieveEvidence = async (query: string) => {
  const trimmed = query.trim();
  if (trimmed.length < 8) return [];
  const results = await careWorkspace.search(trimmed, { mode: 'bm25', topK: TOP_K });
  return results.filter((hit) => !SKIP_IDS.test(hit.id));
};

const uniqueHits = (...lists: Array<Array<{ id: string; content: string }>>) => {
  const seen = new Set<string>();
  const merged: Array<{ id: string; content: string }> = [];
  for (const list of lists) {
    for (const hit of list) {
      if (seen.has(hit.id)) continue;
      seen.add(hit.id);
      merged.push(hit);
    }
  }
  return merged.slice(0, 10);
};

// Same evidence the agents see: the user's text plus a fixed EHR lifecycle query.
export const gatherEvidence = async (query: string) =>
  uniqueHits(await retrieveEvidence(query), await retrieveEvidence(EHR_SDLC_QUERY));

export const formatEvidence = (hits: Array<{ id: string; content: string }>) => {
  if (hits.length === 0) {
    return [
      'Retrieved evidence: none.',
      'Mark every legal, regulatory, clinical-safety, security, privacy, accessibility, and numeric claim NEEDS-VALIDATION.',
      'Do not invent patient, clinician, medication, diagnosis, lab, encounter, or claims data.',
    ].join('\n');
  }
  const blocks = hits.map((hit, index) => {
    const excerpt = hit.content.replace(/\s+/g, ' ').trim().slice(0, MAX_HIT_CHARS);
    return `[${index + 1}] ${hit.id}\n${excerpt}`;
  });
  return [
    'Retrieved evidence from docs/ingested (already searched — do not call search tools).',
    'Treat spec-kit command files as background only; this project is for electronic health record (EHR) systems.',
    ...blocks,
  ].join('\n\n');
};

export const assertCorpusSearchable = async () => {
  const corpusDir = join(workspaceRoot, 'docs/ingested/ehr');
  const files = existsSync(corpusDir) ? readdirSync(corpusDir).filter((name) => name.endsWith('.txt')) : [];
  if (files.length === 0) {
    throw new Error('EHR corpus is empty (docs/ingested/ehr has no .txt files). Run: npm run corpus');
  }
  const hits = await retrieveEvidence('HIPAA FHIR OWASP WCAG privacy electronic health record patient');
  if (hits.length === 0) {
    throw new Error('Workspace BM25 index returned no EHR hits; docs/ingested was not indexed.');
  }
};

export const ragContextProcessor = {
  id: 'rag-context-processor',
  name: 'EHR RAG Context',
  async processInput({ messages, systemMessages }: ProcessInputArgs): Promise<ProcessInputResult> {
    const query = queryFromMessages(messages);
    if (!query) return { messages, systemMessages };
    const evidence = formatEvidence(await gatherEvidence(query));
    return { messages, systemMessages: [...systemMessages, { role: 'system', content: evidence }] };
  },
} as InputProcessorOrWorkflow;
