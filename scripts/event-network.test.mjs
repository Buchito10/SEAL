import test from 'node:test';
import assert from 'node:assert/strict';
import { selectNetworkAddress } from './event-network.mjs';
const entry = (address, internal = false) => ({ address, family: 'IPv4', internal });
test('detects campus Wi-Fi with public IPv4 before other private interfaces', () => {
  assert.equal(selectNetworkAddress({ bridge0: [entry('192.168.2.1')], en0: [entry('148.220.198.73')] }), '148.220.198.73');
});
test('continues to support private Wi-Fi addresses', () => {
  assert.equal(selectNetworkAddress({ en0: [entry('192.168.1.68')] }), '192.168.1.68');
});
test('does not advertise loopback or a self-assigned IPv4 as LAN access', () => {
  assert.equal(selectNetworkAddress({ lo0: [entry('127.0.0.1', true)], en0: [entry('169.254.10.10')] }), '127.0.0.1');
});
