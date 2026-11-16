import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_TYPES,
  HEALTH_BANDS,
  MARKETS,
  PRODUCTS,
  PRODUCT_BY_CODE,
  PRODUCT_CODES,
  bandForScore,
} from './account-intelligence.js';

test('the catalog holds exactly the six Singtel enterprise products', () => {
  assert.deepEqual(
    PRODUCTS.map((product) => product.name),
    [
      '5G+',
      'Singtel CUBΣ',
      'Cyber Security',
      'Internet of Things',
      'Mobility',
      'Quantum-Safe Network',
    ],
  );
  assert.equal(new Set(PRODUCT_CODES).size, 6);
  for (const product of PRODUCTS) {
    assert.equal(PRODUCT_BY_CODE[product.code], product);
    assert.ok(product.positioning.length > 20, `${product.code} has a positioning line`);
  }
});

test('health bands are ordered from best to worst and cover 0 to 100', () => {
  assert.deepEqual(
    HEALTH_BANDS.map((band) => [band.code, band.min]),
    [
      ['healthy', 70],
      ['watch', 40],
      ['at_risk', 0],
    ],
  );
  assert.equal(bandForScore(100).code, 'healthy');
  assert.equal(bandForScore(70).code, 'healthy');
  assert.equal(bandForScore(69).code, 'watch');
  assert.equal(bandForScore(40).code, 'watch');
  assert.equal(bandForScore(39).code, 'at_risk');
  assert.equal(bandForScore(0).code, 'at_risk');
  assert.equal(bandForScore(undefined).code, 'at_risk');
});

test('there is no discount action, and every action is a protect or grow play', () => {
  assert.equal(ACTION_TYPES.length, 6);
  for (const action of ACTION_TYPES) {
    assert.doesNotMatch(action.label.toLowerCase(), /discount|price cut/);
    assert.ok(['protect', 'grow'].includes(action.kind), `${action.code} has a kind`);
  }
  assert.ok(ACTION_TYPES.some((action) => action.kind === 'grow'));
});

test('every market has an ISO code and a currency', () => {
  assert.equal(MARKETS.length, 10);
  for (const market of MARKETS) {
    assert.match(market.code, /^[A-Z]{2}$/);
    assert.match(market.currency, /^[A-Z]{3}$/);
  }
  assert.equal(MARKETS[0].code, 'SG');
});
