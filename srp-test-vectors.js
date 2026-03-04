"use strict";

const assert = require("assert/strict");
const SRP = require("./srp-core.js");

const VECTOR_1 = {
  name: "SRP v1.0 golden deterministic vector",
  input: {
    version: "1.0",
    recordType: "contract",
    recordId: "rec-001",
    createdAt: "2026-03-03T00:00:00.000Z",
    payload: {
      partyA: "Acme Corp",
      partyB: "Beta LLC",
      jurisdiction: "Delaware",
      amount: 1500000,
      milestones: ["M1", "M2"]
    }
  },
  expected: {
    recordCanonical: "{\"createdAt\":\"2026-03-03T00:00:00.000Z\",\"payload\":{\"amount\":1500000,\"jurisdiction\":\"Delaware\",\"milestones\":[\"M1\",\"M2\"],\"partyA\":\"Acme Corp\",\"partyB\":\"Beta LLC\"},\"recordId\":\"rec-001\",\"recordType\":\"contract\",\"version\":\"1.0\"}",
    recordHash: "d59327459070c90ae3875196ed957bd7472ad989d0a6d2da2727891692c2e8e6",
    signableCanonical: "{\"hashAlgorithm\":\"SHA256\",\"intent\":\"By signing this record, I affirm that I have reviewed its contents and I intend for my electronic signature to be legally binding under applicable electronic signature laws.\",\"recordHash\":\"d59327459070c90ae3875196ed957bd7472ad989d0a6d2da2727891692c2e8e6\",\"signatureScheme\":\"BSV-BSM-v1\"}",
    signableHash: "168ad1f48a47dcd802315e588b6f0a5436455c56c1155c26fbccb14745faa642",
    hashAlgorithm: "SHA256",
    hashDomain: "SRP-SIGNED-MATERIAL|",
    recordIdWithCreatedAt: "8fe3638d2082026a7eba77feeb9d59d68f701239c4d7cf08e20eb3d1bcd2ba06",
    recordIdWithoutCreatedAt: "040b7599b207c069fa4b02b256014a3e0cdb2c857e1234ac379d8fe995e38e21",
    anchorHex: "53525001d59327459070c90ae3875196ed957bd7472ad989d0a6d2da2727891692c2e8e6"
  }
};

const SIGNING_VECTOR = {
  wif: "KydjawdT23sE7a4WYQNH5dNkrLrPHGANa3tggxoHbdcgLqvHcfJV",
  expectedPubKey: "028571c1040fb05b4b1c6e9c457000bb8f64be4c8def01c31410ce12239baef9e5"
};

const MERKLE_VECTOR = {
  leaves: [
    VECTOR_1.expected.recordHash,
    VECTOR_1.expected.signableHash,
    VECTOR_1.expected.recordIdWithCreatedAt
  ],
  expectedDomain: "SRP-MERKLE-NODE|",
  expectedRoot: "c70f530775a6486963d65779a7ccbf26c2e8474fcfb6c3078c6b0533122646c8",
  proof0: [
    { position: "right", hash: "168ad1f48a47dcd802315e588b6f0a5436455c56c1155c26fbccb14745faa642" },
    { position: "right", hash: "3799841c0078c729c18646e49b1cd922f12458fba16596ecbf5c80c8d918eaaa" }
  ],
  proof1: [
    { position: "left", hash: "d59327459070c90ae3875196ed957bd7472ad989d0a6d2da2727891692c2e8e6" },
    { position: "right", hash: "3799841c0078c729c18646e49b1cd922f12458fba16596ecbf5c80c8d918eaaa" }
  ],
  proof2: [
    { position: "right", hash: "8fe3638d2082026a7eba77feeb9d59d68f701239c4d7cf08e20eb3d1bcd2ba06" },
    { position: "left", hash: "20309985f36f7b38733007edbaa53e7017db8b7160dcee43580cea673026d146" }
  ]
};

function runDeterministicVectorTest() {
  const state = SRP.computeRecordState({
    ...VECTOR_1.input,
    strict: true,
    intent: SRP.DEFAULT_INTENT,
    signatureScheme: SRP.DEFAULT_SIGNATURE_SCHEME,
    existingSignatures: []
  });

  assert.equal(state.recordCanonical, VECTOR_1.expected.recordCanonical, "recordCanonical must match golden vector");
  assert.equal(state.recordHash, VECTOR_1.expected.recordHash, "recordHash must match golden vector");
  assert.equal(state.record.hashAlgorithm, VECTOR_1.expected.hashAlgorithm, "record hash algorithm must match");
  assert.equal(state.signedMaterial.canonical, VECTOR_1.expected.signableCanonical, "signable canonical must match golden vector");
  assert.equal(state.signedMaterial.hash, VECTOR_1.expected.signableHash, "signable hash must match golden vector");
  assert.equal(state.signedMaterial.hashAlgorithm, VECTOR_1.expected.hashAlgorithm, "signed material hash algorithm must match");
  assert.equal(state.signedMaterial.hashDomain, VECTOR_1.expected.hashDomain, "signed material hash domain must match");

  const recordIdWithCreatedAt = SRP.generateRecordId({
    ...VECTOR_1.input,
    strict: true,
    includeCreatedAt: true
  });
  assert.equal(recordIdWithCreatedAt, VECTOR_1.expected.recordIdWithCreatedAt, "recordId with createdAt must match golden vector");

  const recordIdWithoutCreatedAt = SRP.generateRecordId({
    ...VECTOR_1.input,
    strict: true,
    includeCreatedAt: false
  });
  assert.equal(recordIdWithoutCreatedAt, VECTOR_1.expected.recordIdWithoutCreatedAt, "recordId without createdAt must match golden vector");

  const anchorHex = SRP.buildAnchorPayloadHex(state.recordHash, "SRP", 0x01);
  assert.equal(anchorHex, VECTOR_1.expected.anchorHex, "anchor hex must match golden vector");
}

function runSigningAndGuardsTest() {
  const state = SRP.computeRecordState({
    ...VECTOR_1.input,
    strict: true,
    intent: SRP.DEFAULT_INTENT,
    signatureScheme: SRP.DEFAULT_SIGNATURE_SCHEME,
    existingSignatures: []
  });

  const appended = SRP.appendSignature(state.record, SIGNING_VECTOR.wif, state.signedMaterial, "2026-03-03T01:02:03.000Z");
  assert.equal(appended.pubKey, SIGNING_VECTOR.expectedPubKey, "pubKey must match fixed signing vector");
  assert.equal(appended.record.signatures.length, 1, "one signature should be present");

  const verification = SRP.verifySignature(appended.record.signatures[0], state.signedMaterial.hash);
  assert.equal(verification.ok, true, "signature should verify for signed material hash");

  assert.throws(
    () => SRP.appendSignature(appended.record, SIGNING_VECTOR.wif, state.signedMaterial),
    /already signed/i,
    "duplicate signer should be rejected"
  );
}

function runMerkleVectorTest() {
  assert.equal(SRP.MERKLE_NODE_DOMAIN, MERKLE_VECTOR.expectedDomain, "merkle node domain separator must match");

  const tree = SRP.buildMerkleTree(MERKLE_VECTOR.leaves);
  assert.equal(tree.root, MERKLE_VECTOR.expectedRoot, "merkle root must match golden vector");

  const proof0 = SRP.generateMerkleProof(tree, 0);
  const proof1 = SRP.generateMerkleProof(tree, 1);
  const proof2 = SRP.generateMerkleProof(tree, 2);

  assert.deepEqual(proof0, MERKLE_VECTOR.proof0, "proof0 must match golden vector");
  assert.deepEqual(proof1, MERKLE_VECTOR.proof1, "proof1 must match golden vector");
  assert.deepEqual(proof2, MERKLE_VECTOR.proof2, "proof2 must match golden vector");

  assert.equal(SRP.verifyMerkleProof(tree.root, MERKLE_VECTOR.leaves[0], proof0), true, "proof0 should verify");
  assert.equal(SRP.verifyMerkleProof(tree.root, MERKLE_VECTOR.leaves[1], proof1), true, "proof1 should verify");
  assert.equal(SRP.verifyMerkleProof(tree.root, MERKLE_VECTOR.leaves[2], proof2), true, "proof2 should verify");

  const tamperedProof = [{ ...proof0[0], hash: proof0[0].hash.slice(0, 63) + (proof0[0].hash[63] === "0" ? "1" : "0") }, ...proof0.slice(1)];
  assert.equal(SRP.verifyMerkleProof(tree.root, MERKLE_VECTOR.leaves[0], tamperedProof), false, "tampered proof should fail verification");

  const batch = SRP.buildMerkleBatch(MERKLE_VECTOR.leaves);
  assert.equal(batch.root, MERKLE_VECTOR.expectedRoot, "batch root must match golden vector");
  assert.equal(batch.leafCount, MERKLE_VECTOR.leaves.length, "batch leafCount must match inputs");
  assert.equal(batch.proofs.length, MERKLE_VECTOR.leaves.length, "batch proofs count must match inputs");
}

function run() {
  runDeterministicVectorTest();
  runSigningAndGuardsTest();
  runMerkleVectorTest();
  console.log("SRP deterministic vector tests: PASS");
}

run();
