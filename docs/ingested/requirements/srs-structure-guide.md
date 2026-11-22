# SRS structure guide (project-authored)

Project-authored guidance for the Requirements Agent. It is not an external standard and must not be cited as one.

A good software requirements specification for an EHR module contains:

- Purpose and scope: which EHR capability is covered and which are out of scope.
- Stakeholders and roles: patient, physician, nurse, front desk, pharmacist, lab technician, billing staff, administrator, privacy officer, auditor.
- User journeys: end-to-end scenarios such as registering a patient, documenting an encounter, ordering a test, reviewing a result, prescribing a medication, granting a patient access to their record.
- Functional requirements: uniquely identified, atomic statements ("The system shall ...") with priority, rationale, acceptance criteria, and a verification method (test, inspection, demonstration, analysis).
- Non-functional requirements: security, privacy, audit, availability, performance, usability, accessibility, interoperability, data retention, clinical safety.
- Traceability: each requirement links to a source (stakeholder need, retrieved standard, or assumption) and to the risks it mitigates.
- Assumptions, constraints, risks, and open issues, each identified so later documents can reference them.

Quality attributes for each requirement: necessary, unambiguous, verifiable, feasible, consistent, and traceable. Avoid vague words such as "fast", "user-friendly", or "secure" without a measurable criterion; when no evidence supports a number, write NEEDS-VALIDATION instead of inventing one.
