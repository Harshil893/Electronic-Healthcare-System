# CARE setup and test guide

Written for Ubuntu (or WSL on Windows, or macOS with the same commands). It takes you from prerequisites to verifying the two-agent EHR workflow in the web UI.

## 1. What you are installing

CARE is a local application. It does not call a hosted AI provider.

- **LM Studio** runs a local model and exposes an OpenAI-compatible API.
- **CARE** is a Node.js + Mastra app with two agents and a custom web UI.
- **BM25 RAG** searches the public EHR corpus you download in step 9.
- **LibSQL** stores local Mastra state in `care.db`.

```text
Your EHR brief
      |
      v
Agent 1: EHR Requirements Agent  ->  SRS
      |
      v
Agent 2: EHR SDLC Selection Agent ->  SDLC choice + justification + workflow
```

## 2. Prerequisites

```bash
sudo apt update
sudo apt install -y curl git unzip build-essential ca-certificates python3 poppler-utils
```

`python3` and `curl` are needed by the corpus script. `poppler-utils` (for `pdftotext`) is only needed for the NIST SP 800-66 PDF; without it that one source is skipped.

## 3. Node.js 22.13 or newer

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm use 22
node --version   # v22.x
```

## 4. LM Studio and a model

1. Install LM Studio from <https://lmstudio.ai/download>.
2. Download a model that fits your RAM/VRAM (default config expects `qwen/qwen3-vl-8b`; a smaller Qwen is fine).
3. In LM Studio's **Developer / Local Server** tab, load the model and start the server on `127.0.0.1:1234`.
4. Check it:

```bash
curl http://127.0.0.1:1234/v1/models
```

Note the exact model identifier it returns.

## 5. Extract the project

```bash
mkdir -p ~/projects && unzip care-ehr-requirements.zip -d ~/projects
cd ~/projects/care-ehr-requirements
code .
```

## 6. Environment file

```bash
cp .env.example .env
```

Set `LM_STUDIO_MODEL` to the exact identifier from step 4 if it differs. Keep `.env` private.

## 7. Install dependencies

```bash
npm install
```

## 8. (Optional) Make the corpus script executable

```bash
chmod +x scripts/download-ehr-corpus.sh
```

## 9. Download the public EHR corpus (required, once)

```bash
npm run corpus
```

It downloads HIPAA (HHS), HL7 FHIR, ASTP/ONC, NIST, OWASP ASVS and WCAG pages, extracts text for BM25, and writes `docs/CORPUS_SHA256.txt`. A source that fails to download is skipped with a warning and the rest still work; re-run later to retry. If nothing downloads, check your connection.

CARE refuses to start with an empty corpus and tells you to run this step.

## 10. Static checks

```bash
npm run check     # typecheck + production build
```

You should see `Build successful`.

## 11. Start CARE

Keep LM Studio's server running, then:

```bash
npm run dev
```

Open the web UI: <http://localhost:4111/care>. The pill at the top should say **LM Studio connected**.

## 12. Run the two agents in the web UI

1. Click an example chip (for example **E-prescribing**) or write your own brief.
2. Click **Generate SRS + SDLC**.
3. The **Agent 1** panel fills with the SRS (a local model can take a few minutes), then the **Agent 2** panel fills with the SDLC decision.
4. Use Copy, `.md`, **Download combined .md**, or **Print / Save as PDF**.

Sample brief:

```text
Electronic prescribing module for a 40-bed hospital. Physicians prescribe,
pharmacists verify, the system checks drug-allergy and interaction alerts,
controlled substances need extra approval, every access is audited, and the
module exchanges data with the pharmacy system over HL7 FHIR.
```

## 13. Run the workflow in Mastra Studio (optional)

Open <http://localhost:4111>, go to **Workflows**, select `requirementsThenSdlc`, and run it with `{"prompt": "..."}`. It also writes:

```bash
ls -lh artifacts/evaluation/latest.md artifacts/evaluation/latest.html
xdg-open artifacts/evaluation/latest.html
```

## 14. What a correct result looks like

Agent 1 output: sections Summary, Assumptions, Stakeholders, User journeys, Requirements (FR-#/NFR-# with priority, rationale, source, acceptance criteria, verification), Traceability, Risks (RISK-#), Open issues. It must not choose an SDLC.

Agent 2 output: Decision factors (table citing FR/NFR/RISK IDs), Chosen SDLC, Justification, Alternatives rejected, Project-specific workflow, Residual risk. The SDLC must follow from the SRS, not from habit; the evidence chips above each panel show which corpus files were retrieved.

Small local models sometimes drift from the exact headings. If so, click Generate again or use a larger model.

## 15. Troubleshooting

- **Pill says "LM Studio not reachable"**: start the local server in LM Studio; confirm `curl http://127.0.0.1:1234/v1/models` works and nothing else uses port 1234.
- **`model not found`**: `LM_STUDIO_MODEL` must match the identifier from `/v1/models` exactly; edit `.env` and restart `npm run dev`.
- **`EHR corpus is empty ... Run: npm run corpus`**: do step 9. Check with `ls docs/ingested/ehr/*.txt`.
- **Old Node version**: `source ~/.bashrc && nvm use 22`.
- **Port 4111 busy / "Another development server instance is already running"**: stop the old `npm run dev` (Ctrl+C) and retry.
- **Slow or out of memory**: use a smaller quantized model and set its identifier in `.env`.
- **Output has `NEEDS-VALIDATION` markers**: expected. They flag claims the corpus does not support (for example non-US law); a human must validate them.

## 16. Stop and restart

Ctrl+C in the `npm run dev` terminal. To restart later: `cd ~/projects/care-ehr-requirements && nvm use 22 && npm run dev`, with LM Studio's server running.
