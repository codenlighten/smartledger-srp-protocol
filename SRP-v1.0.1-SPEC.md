# SRP v1.0.1 Specification

## 1. Scope

This document defines the **Signed Record Protocol (SRP) v1.0.1** for deterministic record creation, detached signing, verifiable anchoring, and Merkle batch proofs.

This version freezes behavior already implemented in `srp-core.js` and verified by `srp-test-vectors.js`.

## 2. Design Goals

- Deterministic serialization and hashing
- Cryptographic domain separation between protocol layers
- Explicit algorithm declarations
- Detached, multi-party signature compatibility
- Minimal on-chain commitment payloads
- Deterministic Merkle batch verification

## 3. Normative Keywords

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as described in RFC 2119.

## 4. Protocol Constants

- `protocolId`: `"SRP"`
- `protocolVersion`: `"1.0"`
- `anchorVersionByte`: `0x01`
- `hashAlgorithm`: `"SHA256"`
- `signatureScheme`: `"BSV-BSM-v1"`
- `signedMaterialDomain`: `"SRP-SIGNED-MATERIAL|"`
- `merkleNodeDomain`: `"SRP-MERKLE-NODE|"`

## 5. Record Schema

A record object MUST contain:

- `version` (string)
- `recordType` (string)
- `recordId` (string)
- `createdAt` (ISO-8601 UTC string)
- `payload` (object)
- `hashAlgorithm` (string, currently `"SHA256"`)
- `recordHash` (64-char lowercase hex)
- `signatures` (array)

## 6. Canonicalization Rules

Canonicalization MUST:

1. Use strict JSON (UTF-8, no comments).
2. Sort object keys lexicographically at all nesting levels.
3. Preserve array order.
4. Reject `undefined`.
5. Reject non-finite numbers (`NaN`, `Infinity`, `-Infinity`).
6. In strict mode, reject:
   - `null`
   - empty strings
   - empty arrays

`recordCanonical` is computed from record fields **excluding** `signatures`, `recordHash`, and `hashAlgorithm` enrichment fields. Canonical source fields:

- `version`
- `recordType`
- `recordId`
- `createdAt`
- `payload`

## 7. Record Hashing

`recordHash` MUST be computed as:

- $recordHash = SHA256(recordCanonical)$

where `recordCanonical` is the UTF-8 byte serialization defined in section 6.

The resulting hash MUST be represented as 64 lowercase hex characters.

## 8. Signed Material Construction

`signedMaterialCanonical` MUST be canonicalized from:

- `hashAlgorithm`
- `intent`
- `recordHash`
- `signatureScheme`

Then:

- $signedMaterialHash = SHA256(signedMaterialDomain + signedMaterialCanonical)$

with `signedMaterialDomain = "SRP-SIGNED-MATERIAL|"`.

This domain separation is mandatory.

## 9. Detached Signature Object

Each signature entry MUST include:

- `pubKey` (hex compressed secp256k1 public key)
- `signature` (BSV message signature, base64)
- `signedAt` (ISO-8601 UTC)
- `algorithm` (`"ECDSA-secp256k1"`)
- `intent`
- `signatureScheme`
- `hashAlgorithm`
- `hashDomain`
- `signedMaterialHash`

Duplicate signatures by the same `pubKey` on the same record MUST be rejected.

## 10. Signature Verification

Verification MUST:

1. Recompute `signedMaterialHash` from canonical material and constants.
2. Verify BSV message signature over `signedMaterialHash`.
3. Confirm stored `signedMaterialHash` equals recomputed value.

If any step fails, verification result MUST be false.

## 11. Anchor Payload Format

Single-record anchor payload bytes MUST be:

- `"SRP" | 0x01 | recordHashBytes`

where `recordHashBytes` is the 32-byte binary hash.

Hex encoding of this byte sequence is the exported anchor payload representation.

## 12. Evidence Bundle

Evidence bundle SHOULD include:

- `record`
- `recordHash`
- `recordCanonical`
- `hashAlgorithm`
- `signedMaterial`:
  - `intent`
  - `signatureScheme`
  - `hashAlgorithm`
  - `hashDomain`
  - `canonical`
  - `hash`
- `anchor`:
  - `txid`
  - `network`
  - `anchoredAt`
  - `merkleProof`
  - `anchorPayloadHex`
- `audit`:
  - `ipAddress`
  - `userAgent`
  - `emailVerified`
- `verification`

Audit metadata MUST NOT affect canonicalization or cryptographic hashes.

## 13. Merkle Batching

### 13.1 Leaves

Each leaf MUST be a 32-byte lowercase hex string.

### 13.2 Node Hashing

For each pair `(left, right)`:

- if `right` is missing, `right = left` (odd-node duplication)
- $node = SHA256(merkleNodeDomain + leftBytes + rightBytes)$

where `merkleNodeDomain = "SRP-MERKLE-NODE|"`.

### 13.3 Root

Repeat pairing until one node remains. That node is the Merkle root.

### 13.4 Proof

A proof is an ordered list of steps:

- `position`: `"left"` or `"right"`
- `hash`: sibling 32-byte hex

### 13.5 Verification

Start with leaf hash, fold each proof step using section 13.2 rule, and compare to root.

## 14. Determinism & Regression Lock

Behavioral compatibility for v1.0.1 is locked by deterministic vectors in:

- `srp-test-vectors.js`

Implementations claiming compatibility MUST pass these vectors exactly.

## 15. Compatibility Notes

- Browser and Node implementations MUST produce identical canonical bytes and hash outputs.
- Changing canonicalization, domain constants, or hashing algorithm requires a protocol version bump.

## 16. Security Notes

- Domain separation is mandatory across signed material and Merkle nodes.
- Algorithm declarations prevent silent algorithm substitution.
- Detached signatures should always be accompanied by explicit intent language shown in UI before signing.

## 17. Versioning Policy

- v1.0.1 freezes current deterministic behavior.
- Any incompatible cryptographic or canonicalization change MUST increment major/minor protocol version and regenerate vectors.
