(function initSRPCore(global) {
  "use strict";

  const isNode = typeof module !== "undefined" && !!module.exports;
  const bsv = global.bsv || (isNode ? require("@smartledger/bsv") : null);
  if (!bsv) {
    throw new Error("SRP core requires bsv library (global bsv or @smartledger/bsv).");
  }

  if (!global.bsv) {
    global.bsv = bsv;
  }

  const Buffer = bsv.deps.Buffer;

  const DEFAULT_INTENT = "By signing this record, I affirm that I have reviewed its contents and I intend for my electronic signature to be legally binding under applicable electronic signature laws.";
  const DEFAULT_SIGNATURE_SCHEME = "BSV-BSM-v1";
  const HASH_ALGORITHM = "SHA256";
  const SIGNED_MATERIAL_DOMAIN = "SRP-SIGNED-MATERIAL|";
  const MERKLE_NODE_DOMAIN = "SRP-MERKLE-NODE|";

  function sortKeysDeep(value, opts) {
    const options = opts || {};
    const strict = !!options.strict;
    const path = options.path || "$";

    if (value === undefined) {
      throw new Error("Undefined values are not allowed in SRP canonicalization.");
    }
    if (value === null && strict) {
      throw new Error(`Null values are not allowed in strict mode at ${path}.`);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("NaN/Infinity are not allowed in SRP canonicalization.");
    }
    if (typeof value === "string" && strict && value.trim() === "") {
      throw new Error(`Empty string is not allowed in strict mode at ${path}.`);
    }

    if (Array.isArray(value)) {
      if (strict && value.length === 0) {
        throw new Error(`Empty array is not allowed in strict mode at ${path}.`);
      }
      return value.map((item, idx) => sortKeysDeep(item, { strict, path: `${path}[${idx}]` }));
    }

    if (value && typeof value === "object") {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        out[key] = sortKeysDeep(value[key], { strict, path: `${path}.${key}` });
      }
      return out;
    }

    return value;
  }

  function canonicalStringify(obj, opts) {
    return JSON.stringify(sortKeysDeep(obj, opts));
  }

  function sha256Hex(text) {
    const digest = bsv.crypto.Hash.sha256(Buffer.from(text, "utf8"));
    return digest.toString("hex");
  }

  function normalizeIso(iso) {
    const d = new Date(iso || Date.now());
    if (Number.isNaN(d.valueOf())) {
      throw new Error("createdAt must be a valid ISO date.");
    }
    return d.toISOString();
  }

  function derivePubFromWif(wif) {
    const priv = bsv.PrivateKey.fromWIF(wif);
    return priv.toPublicKey().toString("hex");
  }

  function buildRecordInput(input) {
    const strict = !!input.strict;
    const version = (input.version || "1.0").trim();
    const recordType = (input.recordType || "").trim();
    const recordId = (input.recordId || "").trim();
    const createdAt = normalizeIso((input.createdAt || "").trim());
    const payload = input.payload;

    if (!recordType) throw new Error("recordType is required.");
    if (!recordId) throw new Error("recordId is required.");

    canonicalStringify(payload, { strict, path: "$.payload" });

    return { version, recordType, recordId, createdAt, payload };
  }

  function generateRecordId(input) {
    const strict = !!input.strict;
    const includeCreatedAt = input.includeCreatedAt !== false;
    const source = {
      version: (input.version || "1.0").trim(),
      recordType: (input.recordType || "").trim(),
      payload: input.payload
    };

    if (includeCreatedAt) {
      source.createdAt = normalizeIso((input.createdAt || "").trim());
    }

    return sha256Hex(canonicalStringify(source, { strict }));
  }

  function computeRecordState(input) {
    const strict = !!input.strict;
    const existingSignatures = Array.isArray(input.existingSignatures) ? input.existingSignatures : [];
    const recordInput = buildRecordInput(input);
    const recordCanonical = canonicalStringify(recordInput, { strict });
    const recordHash = sha256Hex(recordCanonical);

    const record = {
      ...recordInput,
      hashAlgorithm: HASH_ALGORITHM,
      recordHash,
      signatures: existingSignatures
    };

    const signedMaterial = {
      intent: input.intent || DEFAULT_INTENT,
      signatureScheme: input.signatureScheme || DEFAULT_SIGNATURE_SCHEME,
      hashAlgorithm: HASH_ALGORITHM,
      hashDomain: SIGNED_MATERIAL_DOMAIN,
      canonical: "",
      hash: ""
    };

    signedMaterial.canonical = canonicalStringify({
      recordHash,
      intent: signedMaterial.intent,
      signatureScheme: signedMaterial.signatureScheme,
      hashAlgorithm: signedMaterial.hashAlgorithm
    });
    signedMaterial.hash = sha256Hex(`${signedMaterial.hashDomain}${signedMaterial.canonical}`);

    return {
      record,
      recordCanonical,
      recordHash,
      signedMaterial
    };
  }

  function appendSignature(record, wif, signedMaterial, signedAt) {
    if (!record || !Array.isArray(record.signatures)) {
      throw new Error("record with signatures array is required.");
    }
    if (!wif || !wif.trim()) {
      throw new Error("WIF is required to sign.");
    }

    const priv = bsv.PrivateKey.fromWIF(wif.trim());
    const pubKey = priv.toPublicKey().toString("hex");

    if (record.signatures.some((s) => s.pubKey === pubKey)) {
      throw new Error("This pubKey has already signed this record.");
    }

    const signature = bsv.Message(signedMaterial.hash).sign(priv);
    const sigObj = {
      pubKey,
      signature,
      signedAt: signedAt || new Date().toISOString(),
      algorithm: "ECDSA-secp256k1",
      intent: signedMaterial.intent,
      signatureScheme: signedMaterial.signatureScheme,
      hashAlgorithm: signedMaterial.hashAlgorithm || HASH_ALGORITHM,
      hashDomain: signedMaterial.hashDomain || SIGNED_MATERIAL_DOMAIN,
      signedMaterialHash: signedMaterial.hash
    };

    record.signatures = [...record.signatures, sigObj];

    return {
      signature: sigObj,
      pubKey,
      record
    };
  }

  function verifySignature(sigObj, signedMaterialHash) {
    const pub = bsv.PublicKey.fromString(sigObj.pubKey);
    const address = bsv.Address.fromPublicKey(pub);
    const ok = bsv.Message(signedMaterialHash).verify(address, sigObj.signature) && sigObj.signedMaterialHash === signedMaterialHash;

    return {
      ok,
      verifiedAt: new Date().toISOString(),
      pubKey: sigObj.pubKey,
      signatureAlgorithm: sigObj.algorithm,
      signatureScheme: sigObj.signatureScheme,
      signedMaterialHash
    };
  }

  function buildAnchorPayloadHex(recordHash, protocolId, versionByte) {
    if (!recordHash || recordHash.length !== 64) {
      throw new Error("recordHash must be 32-byte hex.");
    }
    const proto = Buffer.from(protocolId || "SRP", "utf8");
    const v = Buffer.from([typeof versionByte === "number" ? versionByte : 0x01]);
    const hash = Buffer.from(recordHash, "hex");
    return Buffer.concat([proto, v, hash]).toString("hex");
  }

  function normalizeHashHex(hash, label) {
    const name = label || "hash";
    if (typeof hash !== "string") {
      throw new Error(`${name} must be a hex string.`);
    }
    const normalized = hash.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(normalized)) {
      throw new Error(`${name} must be 32-byte hex (64 chars).`);
    }
    return normalized;
  }

  function hashPairHex(leftHex, rightHex) {
    const left = Buffer.from(normalizeHashHex(leftHex, "leftHex"), "hex");
    const right = Buffer.from(normalizeHashHex(rightHex, "rightHex"), "hex");
    const domain = Buffer.from(MERKLE_NODE_DOMAIN, "utf8");
    const digest = bsv.crypto.Hash.sha256(Buffer.concat([domain, left, right]));
    return digest.toString("hex");
  }

  function buildMerkleTree(recordHashes) {
    if (!Array.isArray(recordHashes) || recordHashes.length === 0) {
      throw new Error("recordHashes must be a non-empty array of 32-byte hex hashes.");
    }

    const leaves = recordHashes.map((h, i) => normalizeHashHex(h, `recordHashes[${i}]`));
    const levels = [leaves];
    let current = leaves;

    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || current[i];
        next.push(hashPairHex(left, right));
      }
      levels.push(next);
      current = next;
    }

    return {
      leaves: [...leaves],
      levels,
      root: levels[levels.length - 1][0],
      leafCount: leaves.length
    };
  }

  function generateMerkleProof(tree, index) {
    if (!tree || !Array.isArray(tree.levels) || tree.levels.length === 0) {
      throw new Error("A valid Merkle tree object is required.");
    }
    if (!Number.isInteger(index) || index < 0 || index >= tree.leafCount) {
      throw new Error("index is out of bounds for Merkle leaves.");
    }

    const proof = [];
    let idx = index;

    for (let level = 0; level < tree.levels.length - 1; level += 1) {
      const nodes = tree.levels[level];
      const isRightNode = idx % 2 === 1;
      const siblingIndex = isRightNode ? idx - 1 : idx + 1;
      const sibling = nodes[siblingIndex] || nodes[idx];
      proof.push({
        position: isRightNode ? "left" : "right",
        hash: sibling
      });
      idx = Math.floor(idx / 2);
    }

    return proof;
  }

  function verifyMerkleProof(rootHash, leafHash, proof) {
    const root = normalizeHashHex(rootHash, "rootHash");
    let computed = normalizeHashHex(leafHash, "leafHash");

    if (!Array.isArray(proof)) {
      throw new Error("proof must be an array.");
    }

    for (let i = 0; i < proof.length; i += 1) {
      const step = proof[i] || {};
      const pos = step.position;
      const sibling = normalizeHashHex(step.hash, `proof[${i}].hash`);

      if (pos !== "left" && pos !== "right") {
        throw new Error(`proof[${i}].position must be 'left' or 'right'.`);
      }

      computed = pos === "left" ? hashPairHex(sibling, computed) : hashPairHex(computed, sibling);
    }

    return computed === root;
  }

  function buildMerkleBatch(recordHashes) {
    const tree = buildMerkleTree(recordHashes);
    const proofs = tree.leaves.map((leafHash, index) => ({
      index,
      leafHash,
      proof: generateMerkleProof(tree, index)
    }));

    return {
      root: tree.root,
      leafCount: tree.leafCount,
      proofs
    };
  }

  function buildEvidenceBundle(params) {
    return {
      record: sortKeysDeep(params.record),
      recordHash: params.recordHash,
      recordCanonical: params.recordCanonical,
      signedMaterial: {
        intent: params.signedMaterial.intent,
        signatureScheme: params.signedMaterial.signatureScheme,
        hashAlgorithm: params.signedMaterial.hashAlgorithm || HASH_ALGORITHM,
        hashDomain: params.signedMaterial.hashDomain || SIGNED_MATERIAL_DOMAIN,
        canonical: params.signedMaterial.canonical,
        hash: params.signedMaterial.hash
      },
      hashAlgorithm: params.hashAlgorithm || HASH_ALGORITHM,
      anchor: {
        txid: params.txid || null,
        network: params.network || "mainnet",
        anchoredAt: params.anchoredAt || new Date().toISOString(),
        merkleProof: params.merkleProof || null,
        anchorPayloadHex: params.anchorPayloadHex || null
      },
      audit: {
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        emailVerified: !!params.emailVerified
      },
      verification: params.verification || null
    };
  }

  const SRP = {
    DEFAULT_INTENT,
    DEFAULT_SIGNATURE_SCHEME,
    HASH_ALGORITHM,
    SIGNED_MATERIAL_DOMAIN,
    MERKLE_NODE_DOMAIN,
    sortKeysDeep,
    canonicalStringify,
    sha256Hex,
    normalizeIso,
    derivePubFromWif,
    buildRecordInput,
    generateRecordId,
    computeRecordState,
    appendSignature,
    verifySignature,
    buildAnchorPayloadHex,
    normalizeHashHex,
    hashPairHex,
    buildMerkleTree,
    generateMerkleProof,
    verifyMerkleProof,
    buildMerkleBatch,
    buildEvidenceBundle
  };

  global.SRP = SRP;
  if (isNode) {
    module.exports = SRP;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
