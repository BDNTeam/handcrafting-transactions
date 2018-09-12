const base58 = require("bs58");
const nacl = require("tweetnacl");
const cc = require("crypto-conditions");
const assert = require("assert");
const stringify = require("json-stable-stringify");
const sha3 = require("js-sha3");
const driver = require("bigchaindb-driver");

// 手动的构造一个 bigchaindb transaction
// 参考 https://docs.bigchaindb.com/projects/py-driver/en/latest/handcraft.html

const Ed25519Keypair = seed => {
  const keyPair = seed ? nacl.sign.keyPair.fromSeed(seed) : nacl.sign.keyPair();
  const ret = {};
  ret.publicKey = base58.encode(keyPair.publicKey);
  // tweetnacl's generated secret key is the secret key + public key (resulting in a 64-byte buffer)
  ret.privateKey = base58.encode(keyPair.secretKey.slice(0, 32));
  return ret;
};

const sha256Hash = data => {
  return sha3.sha3_256
    .create()
    .update(data)
    .hex();
};

// function ensureOurEd25519FUsageIsOk() {
//   const ed25519Fulfillment = new cc.Ed25519Sha256();
//   ed25519Fulfillment.setPublicKey(
//     base58.decode("7oSRUswLhed1a5hmwjzzCVo5babBNEg93imbCRzBKMqP")
//   );

//   assert.ok(
//     ed25519Fulfillment.getConditionUri() ===
//       "ni:///sha-256;wz4gzxowG6yW4qfpNEqYzf1y4D4nuaFoS3dm851t4fE?fpt=ed25519-sha-256&cost=131072"
//   );
// }

// ensureOurEd25519FUsageIsOk();

const version = "2.0";

const asset = {
  data: {
    bicycle: {
      manufacturer: "bkfab",
      serial_number: "abcd1234"
    }
  }
};

const metadata = { planet: "earth" };

const operation = "CREATE";

const alice = Ed25519Keypair();

const ed25519 = new cc.Ed25519Sha256();
ed25519.setPublicKey(base58.decode(alice.publicKey));

const condition_details = {
  type: "ed25519-sha-256",
  public_key: alice.publicKey
};

const output = {
  amount: "1",
  condition: {
    details: condition_details,
    uri: ed25519.getConditionUri()
  },
  public_keys: [alice.publicKey]
};

const outputs = [output];

const input = {
  fulfillment: null,
  fulfills: null,
  owners_before: [alice.publicKey]
};

const inputs = [input];

const handcrafted_creation_tx = {
  asset,
  metadata,
  operation,
  outputs,
  inputs,
  version,
  id: null
};

let message = stringify(handcrafted_creation_tx);
message = sha256Hash(message);

const ed25519Fulfillment = new cc.Ed25519Sha256();
ed25519Fulfillment.sign(
  Buffer.from(message, "hex"),
  base58.decode(alice.privateKey)
);
const fulfillment_uri = ed25519Fulfillment.serializeUri();

handcrafted_creation_tx["inputs"][0]["fulfillment"] = fulfillment_uri;

const json_str_tx = stringify(handcrafted_creation_tx);
const creation_tx_id = sha256Hash(json_str_tx);
handcrafted_creation_tx["id"] = creation_tx_id;

// const prepared_creation_tx = driver.Transaction.makeCreateTransaction(
//   asset.data,
//   metadata,
//   // A transaction needs an output
//   [
//     driver.Transaction.makeOutput(
//       driver.Transaction.makeEd25519Condition(alice.publicKey)
//     )
//   ],
//   alice.publicKey
// );

// const prepared_creation_tx_signed = driver.Transaction.signTransaction(
//   prepared_creation_tx,
//   alice.privateKey
// );
// console.log(stringify(prepared_creation_tx_signed));

console.log(stringify(handcrafted_creation_tx));

const API_PATH = "http://104.238.140.52:9984/api/v1/";
const conn = new driver.Connection(API_PATH);
conn
  .postTransactionCommit(handcrafted_creation_tx)
  .then(retrievedTx =>
    console.log("Transaction", retrievedTx.id, "successfully posted.")
  );
