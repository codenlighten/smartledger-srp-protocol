# SRP 1.0.1 Conformance Report

Generated: 2026-03-04T12:50:26.014Z

## Summary

- Overall OK: Yes
- Total requirements: 14
- Pass: 12
- Manual review: 2
- Fail: 0

## Sources

- Spec: SRP-v1.0.1-SPEC.md
- Vectors: srp-test-vectors.js
- Manifest: SRP-v1.0.1-CONFORMANCE.json

## Command Runs

### test

- Command: `npm test`
- Status: PASS
- Started: 2026-03-04T12:50:25.558Z
- Ended: 2026-03-04T12:50:25.892Z

Output:

```text
> version1@1.0.0 test
> node srp-test-vectors.js

SRP deterministic vector tests: PASS
```

### conformance

- Command: `npm run conformance`
- Status: PASS
- Started: 2026-03-04T12:50:25.892Z
- Ended: 2026-03-04T12:50:26.014Z

Output:

```text
> version1@1.0.0 conformance
> node srp-conformance-check.js

SRP conformance manifest valid: 14 requirements (12 pass, 2 manual-review).
```

## Requirement Matrix

| ID | Section | Normative | Automated | Status | Description | Automated By |
| --- | --- | --- | --- | --- | --- | --- |
| SRP-4-CONSTANTS | 4 | MUST | Yes | pass | Implementation exposes protocol constants exactly as specified. | srp-test-vectors.js |
| SRP-6-CANONICALIZE | 6 | MUST | Yes | pass | Canonicalization sorts keys recursively, preserves array order, rejects undefined/non-finite values, and enforces strict-mode constraints. | srp-test-vectors.js |
| SRP-7-RECORD-HASH | 7 | MUST | Yes | pass | recordHash is SHA256(recordCanonical) and encoded as lowercase 64-char hex. | srp-test-vectors.js |
| SRP-8-SIGNED-DOMAIN | 8 | MUST | Yes | pass | signedMaterialHash is SHA256('SRP-SIGNED-MATERIAL\|' + signedMaterialCanonical). | srp-test-vectors.js |
| SRP-9-DUP-SIGNER | 9 | MUST | Yes | pass | Duplicate signatures by same pubKey for one record are rejected. | srp-test-vectors.js |
| SRP-10-VERIFY | 10 | MUST | Yes | pass | Verification recomputes signed material hash and validates BSV message signature. | srp-test-vectors.js |
| SRP-11-ANCHOR-FORMAT | 11 | MUST | Yes | pass | Anchor payload bytes are 'SRP' \| 0x01 \| 32-byte recordHash. | srp-test-vectors.js |
| SRP-12-EVIDENCE | 12 | SHOULD | No | manual-review | Evidence bundle contains record, hashes, signed material, anchor, audit, and verification metadata. | - |
| SRP-13-MERKLE-LEAF | 13.1 | MUST | Yes | pass | Merkle leaves are validated as 32-byte lowercase hex. | srp-test-vectors.js |
| SRP-13-MERKLE-NODE-DOMAIN | 13.2 | MUST | Yes | pass | Merkle node hashing uses SHA256('SRP-MERKLE-NODE\|' + leftBytes + rightBytes). | srp-test-vectors.js |
| SRP-13-ODD-DUPLICATION | 13.2 | MUST | Yes | pass | Odd node duplication is deterministic (right = left for missing pair). | srp-test-vectors.js |
| SRP-13-PROOF-VERIFY | 13.5 | MUST | Yes | pass | Merkle proofs verify true for valid proofs and false for tampered proofs. | srp-test-vectors.js |
| SRP-14-VECTORS | 14 | MUST | Yes | pass | Implementation passes deterministic vectors exactly. | npm test |
| SRP-15-CROSS-RUNTIME | 15 | MUST | No | manual-review | Node and browser implementations produce identical deterministic outputs. | - |
