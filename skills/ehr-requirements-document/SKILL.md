---
name: ehr-requirements-document
description: Reference rules for EHR requirements analysis and justified SDLC selection.
---
# EHR requirements and SDLC rules

Domain scope: patient registration, charting and clinical documentation, orders and results, e-prescribing, scheduling, patient portal access, interoperability, privacy, security, audit, and accessibility.

Lifecycle choices come from Waterfall, V-Model, Spiral, Agile, DevSecOps, or a named hybrid, using `docs/ingested/product/sdlc-selection-criteria.txt`.

Never invent patient, clinician, diagnosis, medication, laboratory, encounter, or claims data. Use retrieved public sources for standards claims, cite exact local paths, and write `NEEDS-VALIDATION` when evidence or jurisdiction is absent. Human review by qualified clinicians, privacy officers, and counsel remains mandatory for clinical, legal, regulatory, privacy, and production decisions.
