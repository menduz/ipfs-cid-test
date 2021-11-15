import * as fs from "fs"

const expectedHashPinata = "bafybeibdik2ihfpcdi7aaaguptwcoc5msav7uhn5hu54xlq2pdwkh5arzy"

console.log("Expected hash: ", expectedHashPinata)

import * as dagPB from "@ipld/dag-pb"
import { sha256 } from "multiformats/hashes/sha2"
import { CID } from "multiformats/cid"
async function multiformatHash(arrayBuffer) {
  const bytes = dagPB.encode({
    Data: arrayBuffer,
    Links: [],
  })

  const hash = await sha256.digest(bytes)

  return CID.create(1, dagPB.code, hash).toString()
}

import * as IPFS from "ipfs"
async function ipfsHash(arrayBuffer) {
  const instance = await IPFS.create({
    offline: true,
    emptyRepo: true,
    start: false,
  })

  const { cid } = await instance.add(arrayBuffer, {
    onlyHash: true,
    cidVersion: 1,
  })

  return cid.toString()
}

import { execSync } from "child_process"
async function realIpfs(arrayBuffer) {
  const result = execSync(
    `docker run -v ${process.cwd()}:/opt/ipfs-test ipfs/go-ipfs add -q --offline --only-hash /opt/ipfs-test/file --cid-version 1`
  )
  const cid = /(bafy.+)/.exec(result.toString())[0]
  return cid.toString()
}

import { importer } from "ipfs-unixfs-importer"
import { createBlockApi } from "./blockapi.mjs"
async function unixfsImporter(content) {
  const block = createBlockApi()

  let last = undefined

  for await (const res of importer({ content }, block, { cidVersion: 1, onlyHash: true, rawLeaves: true })) {
    last = res.cid
  }

  return last
}

import * as Hash from "ipfs-only-hash"
Hash.of(fs.readFileSync("./file"), { cidVersion: 1 })
  .then(($) => {
    console.log("ipfs-only-hash:", $ == expectedHashPinata, $)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

multiformatHash(fs.readFileSync("./file"))
  .then(($) => {
    console.log("@ipld/dag-pb:", $ == expectedHashPinata, $)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

ipfsHash(fs.readFileSync("./file"))
  .then(($) => {
    console.log("ipfs(npm):", $ == expectedHashPinata, $)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

realIpfs(fs.readFileSync("./file"))
  .then(($) => {
    console.log("ipfs(docker):", $ == expectedHashPinata, $)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

unixfsImporter(fs.readFileSync("./file"))
  .then(($) => {
    console.log("unixfs:", $ == expectedHashPinata, $)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
