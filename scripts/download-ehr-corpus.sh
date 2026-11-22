#!/usr/bin/env bash
# Downloads the public EHR source corpus and extracts text for the local BM25 index.
# A source that fails to download is skipped with a warning; the script only fails if nothing downloads.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/docs/ingested/ehr"
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
mkdir -p "$DEST"
OK=0
FAILED=()

html_to_text() {
  python3 - "$1" "$2" <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import sys

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'noscript', 'svg'}:
            self.skip += 1
        elif self.skip == 0 and tag in {'p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'li', 'br', 'tr'}:
            self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'noscript', 'svg'} and self.skip:
            self.skip -= 1
        elif self.skip == 0 and tag in {'p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'li', 'tr'}:
            self.parts.append('\n')
    def handle_data(self, data):
        if self.skip == 0:
            self.parts.append(data)

source = Path(sys.argv[1]).read_text(errors='replace')
parser = TextExtractor()
parser.feed(source)
text = '\n'.join(' '.join(line.split()) for line in ''.join(parser.parts).splitlines() if line.strip())
Path(sys.argv[2]).write_text(text + '\n')
PY
}

fetch() {
  local name="$1" url="$2" target="$DEST/$1.html"
  echo "Downloading $name"
  if ! curl -fL --retry 3 --connect-timeout 20 -A "$UA" "$url" -o "$target"; then
    echo "  WARN: could not download $name ($url) - skipping" >&2
    rm -f "$target"; FAILED+=("$name"); return 0
  fi
  if ! html_to_text "$target" "$DEST/$name.txt" || [ ! -s "$DEST/$name.txt" ]; then
    echo "  WARN: could not extract text from $name - skipping" >&2
    rm -f "$target" "$DEST/$name.txt"; FAILED+=("$name"); return 0
  fi
  OK=$((OK + 1))
}

fetch_pdf() {
  local name="$1" url="$2" target="$DEST/$1.pdf"
  echo "Downloading $name (PDF)"
  if ! command -v pdftotext >/dev/null 2>&1; then
    echo "  WARN: pdftotext missing (sudo apt install poppler-utils) - skipping $name" >&2
    FAILED+=("$name"); return 0
  fi
  if ! curl -fL --retry 3 --connect-timeout 20 -A "$UA" "$url" -o "$target" || ! pdftotext -layout "$target" "$DEST/$name.txt" || [ ! -s "$DEST/$name.txt" ]; then
    echo "  WARN: could not download or extract $name ($url) - skipping" >&2
    rm -f "$target" "$DEST/$name.txt"; FAILED+=("$name"); return 0
  fi
  OK=$((OK + 1))
}

# US privacy and security law (HHS)
fetch hipaa-security-rule        https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
fetch hipaa-privacy-rule         https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html
fetch hipaa-breach-notification  https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html

# Interoperability (HL7 FHIR R4 and US Core)
fetch hl7-fhir-overview          https://hl7.org/fhir/R4/overview.html
fetch hl7-fhir-security          https://hl7.org/fhir/R4/security.html
fetch hl7-fhir-resource-list     https://hl7.org/fhir/R4/resourcelist.html
fetch hl7-fhir-us-core           https://hl7.org/fhir/us/core/

# Health IT certification and information sharing (ASTP/ONC)
fetch onc-health-it-certification https://www.healthit.gov/topic/certification-ehrs/certification-health-it
fetch onc-information-blocking    https://www.healthit.gov/topic/information-blocking

# Security, privacy, accessibility baselines
fetch_pdf nist-sp-800-66r2       https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-66r2.pdf
fetch owasp-asvs                 https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/README.md
fetch wcag-2-2                   https://www.w3.org/TR/WCAG22/
fetch nist-privacy-framework     https://www.nist.gov/privacy-framework

if [ "$OK" -eq 0 ]; then
  echo "ERROR: no source could be downloaded. Check your internet connection and run again." >&2
  exit 1
fi

cat > "$DEST/README.md" <<'EOF'
# EHR RAG corpus

This directory contains public, provenance-tracked source material for electronic health record (EHR) requirements engineering. The HTML and PDF files are the downloaded originals; the TXT files are mechanically extracted text used by the local BM25 index. No patient, clinician, diagnosis, medication, laboratory, encounter, or claims data is fabricated by this project.

Run `npm run corpus` (or `./scripts/download-ehr-corpus.sh`) to refresh the corpus. Review source changes before using the material for a clinical, legal, or production decision. The corpus is US-centric; requirements that depend on another jurisdiction are marked NEEDS-VALIDATION.
EOF

(cd "$ROOT" && sha256sum docs/ingested/ehr/*.html docs/ingested/ehr/*.pdf docs/ingested/ehr/*.txt 2>/dev/null > docs/CORPUS_SHA256.txt)
echo
echo "Corpus written to $DEST ($OK sources downloaded)"
if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "Skipped: ${FAILED[*]}"
  echo "Re-run later to retry; the project works with whatever downloaded."
fi
