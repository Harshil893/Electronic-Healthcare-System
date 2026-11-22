# CARE · EHR Requirements Engineering

**CARE** means **Conversational Agents for Requirements in EHR**. It is a local, retrieval-grounded two-agent requirements-engineering assistant for **electronic health record (EHR)** systems.

CARE keeps the architecture of the CHAI e-commerce project (Mastra, LM Studio, LibSQL, BM25 RAG, a two-step workflow) and adapts the domain to healthcare, with a custom web UI.

## Two-agent pipeline

1. **EHR Requirements Agent** receives the project brief and produces a structured SRS: summary, assumptions, stakeholders, user journeys, requirements (with rationale, priority, acceptance criteria, verification), traceability, risks, open issues.
2. **EHR SDLC Selection Agent** receives Agent 1's complete output, extracts decision factors, recommends one SDLC approach, justifies it, rejects alternatives, and creates a project-specific workflow.

The connection is implemented in `src/mastra/workflow.ts` (Studio) and `src/mastra/server.ts` (web UI):

```
project brief
  -> Requirements Agent
  -> complete SRS
  -> SDLC Selection Agent
  -> combined SRS + SDLC document
```

The RAG layer retrieves evidence before each agent responds. It does not replace either agent.

## EHR knowledge base

Downloaded by `npm run corpus` from public sources: HHS HIPAA Security, Privacy, and Breach Notification rule pages; HL7 FHIR R4 (overview, security, resource list) and US Core; ASTP/ONC health IT certification and information blocking pages; NIST SP 800-66 Rev. 2; OWASP ASVS; W3C WCAG 2.2; NIST Privacy Framework. It contains no generated patient, clinician, diagnosis, medication, lab, encounter, or claims records.

The corpus is **US-centric**. Anything that depends on another jurisdiction is marked `NEEDS-VALIDATION` by the agents.

## Setup and testing

Complete sequential guide: [`SETUP_AND_TEST.md`](SETUP_AND_TEST.md). The short version:

```
npm install
cp .env.example .env
npm run corpus      # downloads the public EHR corpus (needs internet, bash, python3)
npm run check
npm run dev
```

Then open the web UI at **http://localhost:4111/care** (Mastra Studio is at `http://localhost:4111`). LM Studio must be running locally with the configured model loaded and its OpenAI-compatible server listening at `http://127.0.0.1:1234/v1`.

## Web UI

`/care` is a single page (`ui/index.html`): write or pick a brief, click **Generate SRS + SDLC**, and the Agent 1 panel fills in first, then the Agent 2 panel. Each panel shows which corpus files were retrieved as evidence, and has Copy and `.md` download; a combined download and Print / Save as PDF are available once both finish. Routes (all in `src/mastra/server.ts`):

| Route | Purpose |
| --- | --- |
| `GET /care` | the web UI |
| `GET /care/health` | LM Studio reachability |
| `POST /care/requirements` | `{prompt}` → `{requirements, evidence}` |
| `POST /care/sdlc` | `{requirements}` → `{sdlc, evidence}` |

## Generated outputs

Running the `requirementsThenSdlc` workflow in Mastra Studio also writes:

- `artifacts/evaluation/latest.md`
- `artifacts/evaluation/latest.html`

## Project layout

```
src/mastra/
  index.ts               # Mastra instance: agents, workflow, storage, workspace, UI routes
  ehr-agents.ts          # The two specialized agents
  prompts.ts             # EHR output contracts (SRS and SDLC)
  rag.ts                 # BM25 retrieval and evidence injection
  workflow.ts            # Requirements -> SDLC -> preview files
  server.ts              # Web UI + /care API routes
  workspace.ts           # Corpus and skill indexing
  text-utils.ts          # Cleans <think> blocks from local-model output
  config.ts, lm-studio.ts
ui/index.html            # Custom web UI
scripts/
  download-ehr-corpus.sh
docs/ingested/ehr/       # Public EHR source corpus (created by npm run corpus)
docs/ingested/product/   # SDLC selection criteria
skills/ehr-requirements-document/
```

## Important limitations

CARE is a requirements-engineering prototype. Its outputs are not clinical, legal, privacy, security, accessibility, or compliance approvals, and not medical advice. Unsupported claims are marked `NEEDS-VALIDATION`, and consequential decisions require qualified human review (clinicians, privacy officer, counsel).

## License

MIT — see [LICENSE](LICENSE).
