import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { requirementsAgent, sdlcSelectionAgent } from './ehr-agents';
import { assertCorpusSearchable } from './rag';
import { careApiRoutes } from './server';
import { requirementsThenSdlc } from './workflow';
import { careWorkspace } from './workspace';

export const mastra = new Mastra({
  agents: { requirementsAgent, sdlcSelectionAgent },
  workflows: { requirementsThenSdlc },
  storage: new LibSQLStore({
    id: 'care-storage',
    url: process.env.MASTRA_DATABASE_URL ?? 'file:./care.db',
  }),
  workspace: careWorkspace,
  server: { apiRoutes: careApiRoutes },
});

await careWorkspace.init();
await assertCorpusSearchable();
