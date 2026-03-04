# SmartLedger SRP Protocol

**Signed Record Protocol (SRP) v1.0.1**

Deterministic, domain-separated, legally defensible digital record infrastructure with scalable Merkle batch anchoring.

---

## What This Is

SmartLedger SRP is a protocol engine for:

> **Identity → Signed Record → Hash → Anchor**

It provides a minimal, deterministic way to create verifiable digital records that can be independently validated, anchored to Bitcoin SV (or any integrity rail), and presented as structured evidence.

This repository contains:

* The SRP core protocol engine
* Deterministic test vectors
* Merkle batching implementation
* Formal specification (v1.0.1)
* Machine-readable conformance manifest
* Auditor-ready conformance reports

This is protocol infrastructure — not a token platform.

---

# Design Principles

SRP is built around the following constraints:

* Deterministic canonicalization
* Explicit hash algorithm declaration
* Domain-separated hashing
* Detached signatures with legal intent binding
* Minimal on-chain footprint
* Scalable Merkle batching
* Regression-locked behavior via vectors
* Formal conformance verification

The blockchain is treated as an **integrity anchor**, not a database.

---

# Protocol Layers

SRP separates concerns cleanly:

## 1. Record Layer

* Canonical JSON (strict mode optional)
* Sorted keys at all levels
* Frozen `recordHash`
* Explicit `hashAlgorithm`

`recordHash = SHA256(recordCanonical)`

---

## 2. Signed Material Layer

Signatures bind to:

`SHA256("SRP-SIGNED-MATERIAL|" + signedMaterialCanonical)`

Signed material includes:

* intent text
* recordHash
* signatureScheme
* hashAlgorithm
* hashDomain

This prevents cross-protocol replay and ambiguity.

---

## 3. Anchor Layer

Minimal binary payload:

`"SRP" | versionByte | recordHash`

Example:

`53525001<32-byte-hash>`

---

## 4. Merkle Batch Layer

For scalable anchoring:

* Strict 32-byte hex leaves
* Deterministic odd-node duplication
* Domain-separated node hashing:

`SHA256("SRP-MERKLE-NODE|" + left + right)`

Supports:

* Tree construction
* Proof generation
* Proof verification
* Batch helper abstraction

---

# Repository Structure

`srp-core.js`                  # Deterministic protocol engine  
`srp-test-vectors.js`          # Golden regression vectors  
`SRP-v1.0.1-SPEC.md`           # Formal protocol specification  
`SRP-v1.0.1-CONFORMANCE.json`  # Machine-readable conformance checklist  
`srp-conformance-check.js`     # Conformance validator  
`srp-conformance-report.js`    # JSON conformance report generator  
`srp-conformance-render-md.js` # Auditor-friendly markdown report  
`conformance-report.json`  
`conformance-report.md`  
`srp-protocol.html`            # Browser SRP playground

---

# Deterministic Regression

Golden vectors lock:

* Canonicalization behavior
* Record hash stability
* Signed material hash
* Anchor payload format
* Merkle root computation
* Merkle proof structure
* Tamper detection behavior

Run tests:

`npm test`

---

# Conformance Workflow

Validate protocol compliance:

`npm run conformance`

Generate machine-readable report:

`npm run conformance:report`

Generate auditor-readable Markdown:

`npm run conformance:markdown`

Outputs:

* `conformance-report.json`
* `conformance-report.md`

This allows independent implementations to self-certify.

---

# What SRP Is Not

SRP does not:

* Issue tokens
* Store full documents on-chain
* Replace courts
* Claim legal magic
* Conflate ownership with blockchain state

It provides cryptographic integrity and structured evidence.

Legal meaning comes from:

* The signed content
* The explicit intent language
* The identity binding
* The anchored timestamp

---

# Intended Applications

SRP can support:

* Contracts
* Asset registries
* Royalty allocations
* Governance records
* Notarization
* Delegated authority
* Evidence logging

All built on the same primitive.

---

# Versioning Policy

Behavior never changes inside a version.

If canonicalization, hashing, or signed material rules change:

`version = "2.0"`

Vectors and conformance files must be updated.

---

# Current Status

SRP v1.0.1 includes:

* Deterministic canonicalization
* Strict mode enforcement
* Explicit hash metadata
* Signed-material domain separation
* Merkle node domain separation
* Proof verification
* Conformance manifest
* Auditor-readable report generation

Protocol maturity: **Infrastructure-grade**

---

# Strategic Position

SRP is designed for:

* Enterprise systems
* Courts and arbitrators
* Compliance teams
* Independent verifiers
* Multi-implementation compatibility

It is a verifiable digital record standard — not a speculative blockchain project.
