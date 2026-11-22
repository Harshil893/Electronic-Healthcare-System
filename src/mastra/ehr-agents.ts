import { Agent } from '@mastra/core/agent';
import { chatModel } from './lm-studio';
import { REQUIREMENTS_PROMPT, SDLC_PROMPT } from './prompts';
import { ragContextProcessor } from './rag';
import { careWorkspace } from './workspace';

const options = {
  modelSettings: { maxOutputTokens: 4200 },
  providerOptions: { lmStudio: { reasoningEffort: 'none', enable_thinking: false } },
} as const;

export const requirementsAgent = new Agent({
  id: 'ehr-requirements-agent',
  name: 'EHR Requirements Agent',
  description: 'Identifies and structures requirements for electronic health record systems.',
  instructions: REQUIREMENTS_PROMPT,
  model: chatModel,
  defaultOptions: options,
  workspace: careWorkspace,
  inputProcessors: [ragContextProcessor],
});

export const sdlcSelectionAgent = new Agent({
  id: 'ehr-sdlc-selection-agent',
  name: 'EHR SDLC Selection Agent',
  description: 'Selects and justifies an SDLC for an EHR requirements specification.',
  instructions: SDLC_PROMPT,
  model: chatModel,
  defaultOptions: { ...options, modelSettings: { maxOutputTokens: 3600 } },
  workspace: careWorkspace,
  inputProcessors: [ragContextProcessor],
});
