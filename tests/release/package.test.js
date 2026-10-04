import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { createZip, crc32 } from '../../scripts/lib/zip.mjs';

function readZip(buffer) {
  const endOffset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(endOffset >= 0, 'end of central directory record is present');
  const count = buffer.readUInt16LE(endOffset + 10);
  let cursor = buffer.readUInt32LE(endOffset + 16);
  const files = new Map();
  for (let i = 0; i < count; i += 1) {
    assert.equal(buffer.readUInt32LE(cursor), 0x02014b50);
    const checksum = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const dataStart = localOffset + 30 + localNameLength;
    const data = inflateRawSync(buffer.subarray(dataStart, dataStart + compressedSize));
    assert.equal(crc32(data), checksum, `${name} checksum matches`);
    files.set(name, data.toString('utf8'));
    cursor += 46 + nameLength;
  }
  return files;
}

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('createZip round-trips file names and contents without a system zip binary', () => {
  const zip = createZip([
    { name: 'src/popup/popup.js', data: Buffer.from('console.log("popup");\n') },
    { name: 'manifest.json', data: Buffer.from('{"manifest_version":3}') }
  ]);
  const files = readZip(zip);
  assert.deepEqual([...files.keys()], ['manifest.json', 'src/popup/popup.js']);
  assert.equal(files.get('src/popup/popup.js'), 'console.log("popup");\n');
});

test('createZip output is reproducible for identical input', () => {
  const entries = [{ name: 'a.txt', data: Buffer.from('same') }];
  assert.deepEqual(createZip(entries), createZip(entries));
});

test('createZip rejects unsafe archive paths', () => {
  for (const name of ['../escape.js', '/abs.js', 'win\\path.js', '']) {
    assert.throws(() => createZip([{ name, data: Buffer.alloc(0) }]), /Unsafe archive entry name/);
  }
});
