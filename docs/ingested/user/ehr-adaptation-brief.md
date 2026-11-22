# EHR adaptation brief

This project is the electronic health record (EHR) adaptation of a two-agent requirements-engineering assistant.

Scope: general EHR systems for provider organisations — patient registration, charting and clinical notes, orders and results, e-prescribing, scheduling, patient portal access, interoperability (HL7 FHIR), privacy, security, audit, and accessibility.

Pipeline: the first stage produces an SRS from a project brief; the second stage reads that SRS and selects and justifies an SDLC.

Data policy: no patient, clinician, diagnosis, medication, laboratory, encounter, or claims data is generated or bundled. All standards claims come from the public corpus in `docs/ingested/ehr/` or are marked NEEDS-VALIDATION.

Jurisdiction: the corpus is US-centric (HIPAA, ONC, HL7 FHIR US Core). Requirements that depend on another jurisdiction are marked NEEDS-VALIDATION.
