// Builds the simulated seed data for the SingTech AI Account Intelligence module.
//
//   node apps/server/src/modules/account-intelligence/data/seed/generate.js
//   npx prettier --write apps/server/src/modules/account-intelligence/data/seed
//
// Output is deterministic: ids are hashed from stable keys and every date is relative to
// SEED_TODAY, so running it twice gives identical files. The test suite checks that the
// committed JSON still matches this script.
//
// All companies and people are fictional. Inside customer text, competitors appear only as
// "Competitor A", "Competitor B" or "Competitor C". Exchange rates are fixed simulated values.

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MARKET_BY_CODE, PRODUCT_BY_CODE } from '@singtech/shared';

export const SEED_TODAY = '2026-11-16';

// SGD per one unit of local currency. Simulated, fixed so the data never drifts.
export const FX_TO_SGD = Object.freeze({
  SGD: 1,
  AUD: 0.87,
  INR: 0.0155,
  IDR: 0.0000825,
  THB: 0.038,
  PHP: 0.023,
  HKD: 0.167,
  JPY: 0.0088,
  USD: 1.3,
  GBP: 1.7,
});

// First bill period; twelve monthly bills run from here to the last full month before today.
const FIRST_BILL_MONTH = '2025-11-01';
const BILL_MONTHS = 12;

const OWNERS = {
  aisha: { owner_name: 'Aisha Rahman', owner_email: 'aisha.rahman@singtech.example' },
  daniel: { owner_name: 'Daniel Koh', owner_email: 'daniel.koh@singtech.example' },
  marcus: { owner_name: 'Marcus Lim', owner_email: 'marcus.lim@singtech.example' },
  priya: { owner_name: 'Priya Nair', owner_email: 'priya.nair@singtech.example' },
};

// ---------------------------------------------------------------------------------------------
// The ten scripted accounts: five at-risk or watch stories and five healthy look-alikes.
// `expected` is what the rules must produce; tests assert it from step 5 onwards.
// Day offsets (`ago`, `closed`) count back from SEED_TODAY.
// ---------------------------------------------------------------------------------------------
export const STORIES = [
  {
    key: 'R1',
    story_code: 'service_issues',
    title: 'Repeated outages at the plants',
    narrative:
      'Four high-severity outages in 90 days at the Tuas and Senoko plants, low satisfaction, and the operations director has asked Competitor A for a secondary link.',
    domain: 'kestrelwick.example',
    account: {
      name: 'Kestrelwick Precision Pte Ltd',
      segment: 'enterprise',
      industry: 'Manufacturing',
      market: 'SG',
      employee_band: '1k-5k',
      annual_revenue_band: 'SGD 500M to 1B',
      owner: 'daniel',
    },
    sites: [
      {
        key: 'tuas',
        name: 'Tuas plant',
        site_type: 'plant',
        city: 'Singapore',
        opened_on: '2012-03-01',
      },
      {
        key: 'amk',
        name: 'Ang Mo Kio head office',
        site_type: 'hq',
        city: 'Singapore',
        opened_on: '2010-06-01',
      },
      {
        key: 'senoko',
        name: 'Senoko plant',
        site_type: 'plant',
        city: 'Singapore',
        opened_on: '2019-01-15',
      },
    ],
    contacts: [
      {
        key: 'coo',
        full_name: 'Tan Wei Ming',
        title: 'Chief Operating Officer',
        role: 'decision_maker',
      },
      { key: 'itdir', full_name: 'Nurul Huda Osman', title: 'IT Director', role: 'champion' },
      {
        key: 'netmgr',
        full_name: 'Rajesh Pillai',
        title: 'Network Manager',
        role: 'technical_buyer',
      },
      { key: 'proc', full_name: 'Lee Mei Ling', title: 'Procurement Lead', role: 'procurement' },
    ],
    assets: [
      { product: 'CUBE', site: 'amk', start: '2016-04-01', monthly_sgd: 18500, quantity: 1 },
      { product: 'MOBILITY', site: 'amk', start: '2016-04-01', monthly_sgd: 6200, quantity: 420 },
      { product: 'IOT', site: 'tuas', start: '2020-02-01', monthly_sgd: 9800, quantity: 1 },
    ],
    contracts: [
      {
        number: 'KPM-2024-0117',
        start: '2024-05-01',
        term_months: 36,
        products: ['CUBE', 'MOBILITY', 'IOT'],
      },
    ],
    cases: [
      {
        site: 'tuas',
        ago: 12,
        severity: 'critical',
        category: 'outage',
        subject: 'Tuas plant network down',
        description:
          'Plant network down for three hours. Two production lines halted until the link was restored.',
      },
      {
        site: 'tuas',
        ago: 34,
        closed: 33,
        severity: 'high',
        category: 'outage',
        subject: 'Tuas plant link outage',
        description:
          'Primary link lost for 90 minutes during the night shift. Machine telemetry gaps reported.',
        csat: 2,
      },
      {
        site: 'senoko',
        ago: 58,
        closed: 56,
        severity: 'high',
        category: 'outage',
        subject: 'Senoko plant outage',
        description:
          'Senoko plant offline for two hours. Our operations director has asked Competitor A for a proposal for a secondary link.',
        competitor: 'Competitor A',
        csat: 2,
      },
      {
        site: 'tuas',
        ago: 81,
        closed: 80,
        severity: 'high',
        category: 'outage',
        subject: 'Tuas plant intermittent outage',
        description: 'Repeated link flaps over four hours affecting the warehouse scanners.',
        csat: 3,
      },
    ],
    activities: [
      {
        contact: 'itdir',
        type: 'call',
        ago: 11,
        subject: 'Escalation call on Tuas outage',
        outcome: 'Customer asked for root cause and a written resilience plan',
        notes: 'Third major outage since August.',
      },
      {
        contact: 'coo',
        type: 'email',
        ago: 20,
        subject: 'Outage summary sent',
        outcome: 'Acknowledged',
        notes: '',
      },
      {
        contact: 'coo',
        type: 'meeting',
        ago: 45,
        subject: 'Service review',
        outcome: 'COO unhappy with incident response times',
        notes: '',
      },
      {
        contact: 'itdir',
        type: 'qbr',
        ago: 150,
        subject: 'Quarterly business review',
        outcome: 'Positive; discussed plant expansion',
        notes: '',
      },
    ],
    opportunities: [],
    expected: {
      band: 'at_risk',
      top_reason: 'service_issues',
      gap_product: '5G_PLUS',
      next_action: 'service_recovery',
    },
  },
  {
    key: 'H1',
    story_code: 'healthy_lookalike',
    title: 'Healthy manufacturer, ready for 5G+',
    narrative:
      'Same industry and size as Kestrelwick. Recent QBR, spend up, no severe cases. The plant floor is a natural fit for 5G+.',
    domain: 'northvane.example',
    account: {
      name: 'Northvane Components Pte Ltd',
      segment: 'enterprise',
      industry: 'Manufacturing',
      market: 'SG',
      employee_band: '1k-5k',
      annual_revenue_band: 'SGD 500M to 1B',
      owner: 'daniel',
    },
    sites: [
      {
        key: 'jurong',
        name: 'Jurong plant',
        site_type: 'plant',
        city: 'Singapore',
        opened_on: '2014-08-01',
      },
      {
        key: 'cbp',
        name: 'Changi Business Park head office',
        site_type: 'hq',
        city: 'Singapore',
        opened_on: '2013-02-01',
      },
      {
        key: 'loyang',
        name: 'Loyang warehouse',
        site_type: 'warehouse',
        city: 'Singapore',
        opened_on: '2018-05-01',
      },
    ],
    contacts: [
      {
        key: 'ops',
        full_name: 'Chua Boon Keat',
        title: 'Operations Director',
        role: 'decision_maker',
      },
      { key: 'it', full_name: 'Farah Aziz', title: 'Head of IT', role: 'champion' },
      {
        key: 'eng',
        full_name: 'Vikram Menon',
        title: 'Infrastructure Engineer',
        role: 'technical_buyer',
      },
    ],
    assets: [
      { product: 'CUBE', site: 'cbp', start: '2017-09-01', monthly_sgd: 16000, quantity: 1 },
      { product: 'MOBILITY', site: 'cbp', start: '2017-09-01', monthly_sgd: 5400, quantity: 380 },
      { product: 'IOT', site: 'jurong', start: '2021-06-01', monthly_sgd: 7200, quantity: 1 },
      { product: 'CYBER', site: 'cbp', start: '2023-03-01', monthly_sgd: 8900, quantity: 1 },
    ],
    contracts: [
      {
        number: 'NVC-2025-0042',
        start: '2025-03-01',
        term_months: 36,
        products: ['CUBE', 'MOBILITY', 'IOT', 'CYBER'],
      },
    ],
    cases: [
      {
        site: 'cbp',
        ago: 40,
        closed: 38,
        severity: 'low',
        category: 'service_request',
        subject: 'Add 20 mobile lines',
        description: 'Add 20 mobile lines for the new shift team.',
        csat: 5,
      },
      {
        site: 'loyang',
        ago: 120,
        closed: 118,
        severity: 'medium',
        category: 'performance',
        subject: 'Latency on Loyang warehouse link',
        description:
          'Intermittent latency on the Loyang warehouse link, resolved by a configuration change.',
        csat: 4,
      },
    ],
    activities: [
      {
        contact: 'it',
        type: 'qbr',
        ago: 27,
        subject: 'Quarterly business review',
        outcome: 'Customer satisfied; asked about private 5G for the Jurong plant floor',
        notes: '',
      },
      {
        contact: 'ops',
        type: 'meeting',
        ago: 70,
        subject: 'Operations planning',
        outcome: 'Plans to automate two more lines in 2027',
        notes: '',
      },
      {
        contact: 'eng',
        type: 'call',
        ago: 12,
        subject: 'Change request follow-up',
        outcome: 'Completed',
        notes: '',
      },
    ],
    opportunities: [],
    spend: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1.06, 1.08, 1.1],
    expected: {
      band: 'healthy',
      top_reason: null,
      gap_product: '5G_PLUS',
      next_action: 'cross_sell',
    },
  },
  {
    key: 'R2',
    story_code: 'price_perception',
    title: 'Renewal in 60 days, Competitor B pricing pressure',
    narrative:
      'Contract ends in 60 days with no renewal opportunity open. Procurement cites a cheaper bundle from Competitor B twice. Spend is flat.',
    domain: 'halvora.example',
    account: {
      name: 'Halvora Wealth Partners Pte Ltd',
      segment: 'enterprise',
      industry: 'Financial services',
      market: 'SG',
      employee_band: '1k-5k',
      annual_revenue_band: 'SGD 250M to 500M',
      owner: 'aisha',
    },
    sites: [
      {
        key: 'mbfc',
        name: 'Marina Bay head office',
        site_type: 'hq',
        city: 'Singapore',
        opened_on: '2015-01-05',
      },
      {
        key: 'raffles',
        name: 'Raffles Place office',
        site_type: 'office',
        city: 'Singapore',
        opened_on: '2017-07-01',
      },
    ],
    contacts: [
      {
        key: 'cfo',
        full_name: 'Jonathan Seah',
        title: 'Chief Financial Officer',
        role: 'decision_maker',
      },
      { key: 'cio', full_name: 'Melissa Goh', title: 'Head of Technology', role: 'champion' },
      { key: 'proc', full_name: 'Arjun Mehta', title: 'Procurement Manager', role: 'procurement' },
      {
        key: 'sec',
        full_name: 'Hannah Lau',
        title: 'Chief Information Security Officer',
        role: 'technical_buyer',
      },
    ],
    assets: [
      { product: 'CUBE', site: 'mbfc', start: '2018-01-15', monthly_sgd: 14500, quantity: 1 },
      { product: 'MOBILITY', site: 'mbfc', start: '2018-01-15', monthly_sgd: 4800, quantity: 310 },
      { product: 'CYBER', site: 'mbfc', start: '2021-01-04', monthly_sgd: 11200, quantity: 1 },
    ],
    contracts: [
      {
        number: 'HWP-2024-0009',
        start: '2024-01-16',
        term_months: 36,
        products: ['CUBE', 'MOBILITY', 'CYBER'],
      },
    ],
    cases: [
      {
        site: 'mbfc',
        ago: 22,
        severity: 'medium',
        category: 'complaint',
        subject: 'Renewal pricing challenge',
        description:
          'Procurement shared that Competitor B has offered a cheaper bundle for connectivity and mobile lines. They want current rates justified before the January renewal.',
        competitor: 'Competitor B',
      },
      {
        site: 'mbfc',
        ago: 49,
        closed: 45,
        severity: 'medium',
        category: 'complaint',
        subject: 'Mobile plan cost comparison',
        description:
          'Finance compared mobile plan costs with a cheaper offer from Competitor B and asked for a review.',
        competitor: 'Competitor B',
        csat: 3,
      },
      {
        site: 'raffles',
        ago: 70,
        closed: 68,
        severity: 'low',
        category: 'billing_query',
        subject: 'Roaming charges query',
        description: 'Query on roaming charges for regional travel. Explained the plan terms.',
        csat: 3,
      },
    ],
    activities: [
      {
        contact: 'cfo',
        type: 'meeting',
        ago: 35,
        subject: 'Renewal kick-off',
        outcome: 'Customer asked for a pricing benchmark before committing',
        notes: '',
      },
      {
        contact: 'proc',
        type: 'email',
        ago: 21,
        subject: 'Benchmark request received',
        outcome: 'Awaiting our response',
        notes: '',
      },
      {
        contact: 'cio',
        type: 'call',
        ago: 50,
        subject: 'Security roadmap check-in',
        outcome: 'Interest in quantum-safe encryption for trading links',
        notes: '',
      },
      {
        contact: 'cio',
        type: 'qbr',
        ago: 200,
        subject: 'Quarterly business review',
        outcome: 'Neutral',
        notes: '',
      },
    ],
    opportunities: [],
    expected: {
      band: 'at_risk',
      top_reason: 'price_perception',
      gap_product: 'QSN',
      next_action: 'renewal_value_case',
    },
  },
  {
    key: 'H2',
    story_code: 'healthy_lookalike',
    title: 'Healthy wealth manager, quantum-safe interest',
    narrative:
      'Same industry and size as Halvora. Renewal is ten months away and on track. Asked about quantum-safe options at the last QBR.',
    domain: 'brightmoor.example',
    account: {
      name: 'Brightmoor Capital Management Pte Ltd',
      segment: 'enterprise',
      industry: 'Financial services',
      market: 'SG',
      employee_band: '1k-5k',
      annual_revenue_band: 'SGD 250M to 500M',
      owner: 'aisha',
    },
    sites: [
      {
        key: 'hq',
        name: 'Shenton Way head office',
        site_type: 'hq',
        city: 'Singapore',
        opened_on: '2016-03-01',
      },
      {
        key: 'one',
        name: 'One-North office',
        site_type: 'office',
        city: 'Singapore',
        opened_on: '2020-09-01',
      },
    ],
    contacts: [
      {
        key: 'cfo',
        full_name: 'Rebecca Ong',
        title: 'Chief Financial Officer',
        role: 'decision_maker',
      },
      { key: 'cto', full_name: 'Samuel Teo', title: 'Chief Technology Officer', role: 'champion' },
      {
        key: 'sec',
        full_name: 'Kavitha Raman',
        title: 'Head of Security',
        role: 'technical_buyer',
      },
    ],
    assets: [
      { product: 'CUBE', site: 'hq', start: '2019-06-03', monthly_sgd: 13800, quantity: 1 },
      { product: 'MOBILITY', site: 'hq', start: '2019-06-03', monthly_sgd: 4600, quantity: 290 },
      { product: 'CYBER', site: 'hq', start: '2021-11-01', monthly_sgd: 10400, quantity: 1 },
    ],
    contracts: [
      {
        number: 'BCM-2024-0215',
        start: '2024-10-01',
        term_months: 36,
        products: ['CUBE', 'MOBILITY', 'CYBER'],
      },
    ],
    cases: [
      {
        site: 'hq',
        ago: 60,
        closed: 59,
        severity: 'low',
        category: 'service_request',
        subject: 'New starter mobile lines',
        description: 'Provision 12 mobile lines for the new graduate intake.',
        csat: 5,
      },
    ],
    activities: [
      {
        contact: 'cto',
        type: 'qbr',
        ago: 41,
        subject: 'Quarterly business review',
        outcome: 'Renewal on track; asked about quantum-safe options for data replication',
        notes: '',
      },
      {
        contact: 'cfo',
        type: 'meeting',
        ago: 15,
        subject: 'Budget planning 2027',
        outcome: 'Technology budget up next year',
        notes: '',
      },
    ],
    opportunities: [],
    expected: { band: 'healthy', top_reason: null, gap_product: 'QSN', next_action: 'cross_sell' },
  },
  {
    key: 'R3',
    story_code: 'relationship',
    title: 'Champion left, relationship gone quiet',
    narrative:
      'The CIO who championed Singtel left in August. No meeting in four months, the CFO has not replied, and IoT was downgraded in September.',
    domain: 'wattlegrove.example',
    account: {
      name: 'Wattlegrove Health Network Pty Ltd',
      segment: 'enterprise',
      industry: 'Healthcare',
      market: 'AU',
      employee_band: '5k-20k',
      annual_revenue_band: 'AUD 1B to 2B',
      owner: 'marcus',
    },
    sites: [
      {
        key: 'mel',
        name: 'Melbourne head office',
        site_type: 'hq',
        city: 'Melbourne',
        opened_on: '2009-04-01',
      },
      {
        key: 'gee',
        name: 'Geelong hospital',
        site_type: 'office',
        city: 'Geelong',
        opened_on: '2011-10-01',
      },
      {
        key: 'bal',
        name: 'Ballarat clinic',
        site_type: 'office',
        city: 'Ballarat',
        opened_on: '2016-02-01',
      },
    ],
    contacts: [
      {
        key: 'cio',
        full_name: 'Dr Helen Fraser',
        title: 'Chief Information Officer',
        role: 'champion',
        left_on: '2026-08-12',
      },
      {
        key: 'cfo',
        full_name: 'Michael Brennan',
        title: 'Chief Financial Officer',
        role: 'decision_maker',
      },
      {
        key: 'infra',
        full_name: 'Tom Nguyen',
        title: 'Infrastructure Manager',
        role: 'technical_buyer',
      },
      {
        key: 'proc',
        full_name: 'Sarah Whitfield',
        title: 'Procurement Manager',
        role: 'procurement',
      },
    ],
    assets: [
      { product: 'MOBILITY', site: 'mel', start: '2015-07-01', monthly_sgd: 21000, quantity: 1450 },
      { product: 'CUBE', site: 'mel', start: '2018-02-01', monthly_sgd: 19500, quantity: 1 },
      {
        product: 'IOT',
        site: 'gee',
        start: '2021-05-03',
        monthly_sgd: 6400,
        quantity: 640,
        status: 'downgraded',
        change: { type: 'downgraded', on: '2026-09-15', previous_sgd: 9600 },
      },
    ],
    contracts: [
      {
        number: 'WHN-2024-0311',
        start: '2024-09-01',
        term_months: 36,
        products: ['MOBILITY', 'CUBE', 'IOT'],
      },
    ],
    cases: [
      {
        site: 'bal',
        ago: 100,
        closed: 98,
        severity: 'low',
        category: 'service_request',
        subject: 'Reduce IoT tracker SIMs',
        description: 'Reduce IoT asset tracker SIMs at the Ballarat clinic by 120.',
        csat: 4,
      },
    ],
    activities: [
      {
        contact: 'cio',
        type: 'meeting',
        ago: 129,
        subject: 'Digital health roadmap',
        outcome: 'Agreed to scope clinic IoT expansion',
        notes: '',
      },
      {
        contact: 'infra',
        type: 'call',
        ago: 95,
        subject: 'IoT device count review',
        outcome: 'Customer plans to reduce asset trackers',
        notes: '',
      },
      {
        contact: 'cfo',
        type: 'email',
        ago: 40,
        subject: 'Introduction request after CIO departure',
        outcome: 'No reply',
        notes: '',
      },
    ],
    opportunities: [],
    expected: {
      band: 'watch',
      top_reason: 'relationship',
      gap_product: 'CYBER',
      next_action: 'stakeholder_remap',
    },
  },
  {
    key: 'H3',
    story_code: 'healthy_lookalike',
    title: 'Healthy health network, growing headcount',
    narrative:
      'Same industry and size as Wattlegrove. Champion in place, recent QBR, IoT upgraded. Two new clinics planned: grow what they already buy.',
    domain: 'coralbay.example',
    account: {
      name: 'Coralbay Medical Group Pty Ltd',
      segment: 'enterprise',
      industry: 'Healthcare',
      market: 'AU',
      employee_band: '5k-20k',
      annual_revenue_band: 'AUD 1B to 2B',
      owner: 'marcus',
    },
    sites: [
      {
        key: 'bne',
        name: 'Brisbane head office',
        site_type: 'hq',
        city: 'Brisbane',
        opened_on: '2010-01-04',
      },
      {
        key: 'gc',
        name: 'Gold Coast hospital',
        site_type: 'office',
        city: 'Gold Coast',
        opened_on: '2013-06-01',
      },
      {
        key: 'sc',
        name: 'Sunshine Coast clinic',
        site_type: 'office',
        city: 'Maroochydore',
        opened_on: '2019-03-01',
      },
    ],
    contacts: [
      {
        key: 'cio',
        full_name: 'Andrew Patel',
        title: 'Chief Information Officer',
        role: 'champion',
      },
      {
        key: 'cfo',
        full_name: 'Lisa Chen',
        title: 'Chief Financial Officer',
        role: 'decision_maker',
      },
      {
        key: 'infra',
        full_name: 'Ben Carter',
        title: 'Infrastructure Lead',
        role: 'technical_buyer',
      },
    ],
    assets: [
      { product: 'MOBILITY', site: 'bne', start: '2016-03-01', monthly_sgd: 18000, quantity: 1200 },
      { product: 'CUBE', site: 'bne', start: '2017-08-01', monthly_sgd: 17000, quantity: 1 },
      {
        product: 'IOT',
        site: 'gc',
        start: '2020-10-01',
        monthly_sgd: 8100,
        quantity: 810,
        change: { type: 'upgraded', on: '2026-08-01', previous_sgd: 6000 },
      },
      { product: 'CYBER', site: 'bne', start: '2022-04-01', monthly_sgd: 12500, quantity: 1 },
    ],
    contracts: [
      {
        number: 'CMG-2025-0120',
        start: '2025-02-01',
        term_months: 36,
        products: ['MOBILITY', 'CUBE', 'IOT', 'CYBER'],
      },
    ],
    cases: [
      {
        site: 'gc',
        ago: 85,
        closed: 84,
        severity: 'low',
        category: 'service_request',
        subject: 'Add IoT sensors in new ward',
        description: 'Add 200 IoT sensors for the new Gold Coast ward.',
        csat: 5,
      },
    ],
    activities: [
      {
        contact: 'cio',
        type: 'qbr',
        ago: 30,
        subject: 'Quarterly business review',
        outcome: 'Two new clinics planned for 2027; more mobile lines needed',
        notes: '',
      },
      {
        contact: 'cfo',
        type: 'meeting',
        ago: 64,
        subject: 'Annual planning',
        outcome: 'Positive',
        notes: '',
      },
    ],
    opportunities: [],
    expected: { band: 'healthy', top_reason: null, gap_product: null, next_action: 'upsell' },
  },
  {
    key: 'R4',
    story_code: 'partial_move',
    title: 'IoT moved to Competitor C, RFP open',
    narrative:
      'IoT shelf sensors were moved to Competitor C in September, spend is down 35% over three months, and a store connectivity RFP is open with Competitor C shortlisted.',
    domain: 'saffronvale.example',
    account: {
      name: 'Saffronvale Retail Pvt Ltd',
      segment: 'enterprise',
      industry: 'Retail',
      market: 'IN',
      employee_band: '5k-20k',
      annual_revenue_band: 'INR 5,000 to 10,000 crore',
      owner: 'priya',
    },
    sites: [
      {
        key: 'mum',
        name: 'Mumbai head office',
        site_type: 'hq',
        city: 'Mumbai',
        opened_on: '2008-05-01',
      },
      {
        key: 'bhi',
        name: 'Bhiwandi warehouse',
        site_type: 'warehouse',
        city: 'Bhiwandi',
        opened_on: '2015-09-01',
      },
      {
        key: 'pune',
        name: 'Pune regional office',
        site_type: 'office',
        city: 'Pune',
        opened_on: '2017-01-09',
      },
    ],
    contacts: [
      {
        key: 'coo',
        full_name: 'Ananya Iyer',
        title: 'Chief Operating Officer',
        role: 'decision_maker',
      },
      {
        key: 'cto',
        full_name: 'Rohan Kapoor',
        title: 'Chief Technology Officer',
        role: 'champion',
      },
      {
        key: 'proc',
        full_name: 'Deepak Sharma',
        title: 'Head of Procurement',
        role: 'procurement',
      },
      { key: 'net', full_name: 'Sneha Kulkarni', title: 'Network Lead', role: 'technical_buyer' },
    ],
    assets: [
      { product: 'MOBILITY', site: 'mum', start: '2017-11-01', monthly_sgd: 7800, quantity: 900 },
      { product: 'CUBE', site: 'mum', start: '2019-04-01', monthly_sgd: 12600, quantity: 1 },
      { product: 'CYBER', site: 'mum', start: '2022-08-01', monthly_sgd: 6900, quantity: 1 },
      {
        product: 'IOT',
        site: 'bhi',
        start: '2020-06-01',
        monthly_sgd: 0,
        quantity: 0,
        status: 'cancelled',
        change: { type: 'removed', on: '2026-09-01', previous_sgd: 9800 },
      },
    ],
    contracts: [
      {
        number: 'SVR-2024-0201',
        start: '2024-04-15',
        term_months: 36,
        products: ['MOBILITY', 'CUBE', 'CYBER', 'IOT'],
      },
    ],
    cases: [
      {
        site: 'mum',
        ago: 18,
        severity: 'high',
        category: 'complaint',
        subject: 'Store connectivity RFP',
        description:
          'Customer confirmed a formal RFP for store connectivity. Competitor C is shortlisted. IoT shelf sensors were moved to Competitor C in September.',
        competitor: 'Competitor C',
      },
      {
        site: 'pune',
        ago: 75,
        closed: 72,
        severity: 'medium',
        category: 'performance',
        subject: 'Slow store links during sale weekend',
        description: 'Store links in the Pune region slowed during the sale weekend.',
        csat: 2,
      },
    ],
    activities: [
      {
        contact: 'cto',
        type: 'call',
        ago: 18,
        subject: 'RFP confirmed',
        outcome: 'RFP responses due in January',
        notes: '',
      },
      {
        contact: 'coo',
        type: 'meeting',
        ago: 60,
        subject: 'Operations review',
        outcome: 'Concerns about store link performance',
        notes: '',
      },
    ],
    opportunities: [],
    spend: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.78, 0.8, 0.78],
    expected: {
      band: 'at_risk',
      top_reason: 'partial_move',
      gap_product: 'IOT',
      next_action: 'renewal_value_case',
    },
  },
  {
    key: 'H4',
    story_code: 'healthy_lookalike',
    title: 'Healthy retailer opening a distribution centre',
    narrative:
      'Same industry and size as Saffronvale. Spend up 10%, recent QBR, and a second distribution centre is planned: a fit for 5G+.',
    domain: 'marigoldine.example',
    account: {
      name: 'Marigoldine Stores Pvt Ltd',
      segment: 'enterprise',
      industry: 'Retail',
      market: 'IN',
      employee_band: '5k-20k',
      annual_revenue_band: 'INR 5,000 to 10,000 crore',
      owner: 'priya',
    },
    sites: [
      {
        key: 'blr',
        name: 'Bengaluru head office',
        site_type: 'hq',
        city: 'Bengaluru',
        opened_on: '2011-02-01',
      },
      {
        key: 'hos',
        name: 'Hosur warehouse',
        site_type: 'warehouse',
        city: 'Hosur',
        opened_on: '2016-07-01',
      },
      {
        key: 'che',
        name: 'Chennai regional office',
        site_type: 'office',
        city: 'Chennai',
        opened_on: '2018-11-01',
      },
    ],
    contacts: [
      {
        key: 'coo',
        full_name: 'Vivek Rao',
        title: 'Chief Operating Officer',
        role: 'decision_maker',
      },
      { key: 'cto', full_name: 'Meera Joshi', title: 'Chief Technology Officer', role: 'champion' },
      {
        key: 'net',
        full_name: 'Karthik Subramanian',
        title: 'Network Manager',
        role: 'technical_buyer',
      },
    ],
    assets: [
      { product: 'MOBILITY', site: 'blr', start: '2018-05-01', monthly_sgd: 7200, quantity: 820 },
      { product: 'CUBE', site: 'blr', start: '2018-05-01', monthly_sgd: 11900, quantity: 1 },
      { product: 'IOT', site: 'hos', start: '2021-09-01', monthly_sgd: 8800, quantity: 1 },
      { product: 'CYBER', site: 'blr', start: '2023-01-02', monthly_sgd: 6500, quantity: 1 },
    ],
    contracts: [
      {
        number: 'MGS-2025-0077',
        start: '2025-06-01',
        term_months: 36,
        products: ['MOBILITY', 'CUBE', 'IOT', 'CYBER'],
      },
    ],
    cases: [
      {
        site: 'blr',
        ago: 33,
        closed: 32,
        severity: 'low',
        category: 'service_request',
        subject: 'Mobile lines for festive staff',
        description: 'Add 60 temporary mobile lines for festive season staff.',
        csat: 5,
      },
    ],
    activities: [
      {
        contact: 'cto',
        type: 'qbr',
        ago: 20,
        subject: 'Quarterly business review',
        outcome: 'Second distribution centre planned; interested in private 5G for automation',
        notes: '',
      },
      {
        contact: 'coo',
        type: 'meeting',
        ago: 55,
        subject: 'Store expansion update',
        outcome: 'Positive',
        notes: '',
      },
    ],
    opportunities: [],
    spend: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1.08, 1.1, 1.12],
    expected: {
      band: 'healthy',
      top_reason: null,
      gap_product: '5G_PLUS',
      next_action: 'cross_sell',
    },
  },
  {
    key: 'H5',
    story_code: 'healthy_lookalike',
    title: 'Healthy logistics group, 5G+ added this year',
    narrative:
      'Group parent of the Indonesia subsidiary. Owns five of six products, added 5G+ in June, recent QBR. Grow what they already buy.',
    domain: 'quayvarra.example',
    account: {
      name: 'Quayvarra Logistics Group Pte Ltd',
      segment: 'mnc',
      industry: 'Logistics',
      market: 'SG',
      employee_band: '5k-20k',
      annual_revenue_band: 'SGD 1B to 2B',
      owner: 'aisha',
    },
    sites: [
      {
        key: 'hq',
        name: 'Singapore head office',
        site_type: 'hq',
        city: 'Singapore',
        opened_on: '2005-03-01',
      },
      {
        key: 'tuas',
        name: 'Tuas logistics hub',
        site_type: 'warehouse',
        city: 'Singapore',
        opened_on: '2012-11-01',
      },
      {
        key: 'changi',
        name: 'Changi air cargo centre',
        site_type: 'warehouse',
        city: 'Singapore',
        opened_on: '2016-04-01',
      },
    ],
    contacts: [
      {
        key: 'coo',
        full_name: 'Gabriel Wong',
        title: 'Group Chief Operating Officer',
        role: 'decision_maker',
      },
      { key: 'cio', full_name: 'Natalie Chua', title: 'Group CIO', role: 'champion' },
      {
        key: 'net',
        full_name: 'Hafiz Rahman',
        title: 'Regional Network Lead',
        role: 'technical_buyer',
      },
    ],
    assets: [
      { product: 'CUBE', site: 'hq', start: '2014-02-03', monthly_sgd: 24000, quantity: 1 },
      { product: 'MOBILITY', site: 'hq', start: '2014-02-03', monthly_sgd: 9500, quantity: 700 },
      { product: 'IOT', site: 'tuas', start: '2019-03-01', monthly_sgd: 14000, quantity: 1 },
      { product: 'CYBER', site: 'hq', start: '2021-07-01', monthly_sgd: 10500, quantity: 1 },
      {
        product: '5G_PLUS',
        site: 'tuas',
        start: '2026-06-01',
        monthly_sgd: 12800,
        quantity: 1,
        change: { type: 'added', on: '2026-06-01' },
      },
    ],
    contracts: [
      {
        number: 'QLG-2024-0005',
        start: '2024-02-01',
        term_months: 48,
        products: ['CUBE', 'MOBILITY', 'IOT', 'CYBER'],
      },
      { number: 'QLG-2026-0031', start: '2026-06-01', term_months: 36, products: ['5G_PLUS'] },
    ],
    cases: [
      {
        site: 'tuas',
        ago: 45,
        closed: 44,
        severity: 'low',
        category: 'service_request',
        subject: '5G+ coverage tuning at Tuas hub',
        description: 'Tune 5G+ coverage for the new automated guided vehicle lanes.',
        csat: 5,
      },
    ],
    activities: [
      {
        contact: 'cio',
        type: 'qbr',
        ago: 25,
        subject: 'Quarterly business review',
        outcome:
          'Indonesia subsidiary expanding warehouses; group wants one network across markets',
        notes: '',
      },
      {
        contact: 'coo',
        type: 'meeting',
        ago: 50,
        subject: 'Regional growth plan',
        outcome: 'Positive',
        notes: '',
      },
    ],
    opportunities: [
      {
        name: '5G+ for Tuas logistics hub',
        type: 'cross_sell',
        stage: 'won',
        amount_sgd: 460800,
        products: ['5G_PLUS'],
        created_ago: 240,
        closed_ago: 180,
        source: 'manual',
      },
    ],
    expected: { band: 'healthy', top_reason: null, gap_product: null, next_action: 'upsell' },
  },
  {
    key: 'R5',
    story_code: 'coverage_gap',
    title: 'New Indonesian warehouses off the Singtel network',
    parent: 'H5',
    narrative:
      'The Indonesia subsidiary opened two warehouses since August on local broadband, off the Singtel network, and both now log performance cases.',
    domain: 'quayvarra-id.example',
    account: {
      name: 'PT Quayvarra Logistik Indonesia',
      segment: 'mnc',
      industry: 'Logistics',
      market: 'ID',
      employee_band: '1k-5k',
      annual_revenue_band: 'IDR 5 to 10 trillion',
      owner: 'aisha',
    },
    sites: [
      {
        key: 'jkt',
        name: 'Jakarta office',
        site_type: 'hq',
        city: 'Jakarta',
        opened_on: '2019-08-01',
      },
      {
        key: 'cik',
        name: 'Cikarang warehouse',
        site_type: 'warehouse',
        city: 'Cikarang',
        opened_on: '2026-08-03',
        on_net: false,
      },
      {
        key: 'sub',
        name: 'Surabaya warehouse',
        site_type: 'warehouse',
        city: 'Surabaya',
        opened_on: '2026-10-05',
        on_net: false,
      },
    ],
    contacts: [
      { key: 'gm', full_name: 'Budi Santoso', title: 'General Manager', role: 'decision_maker' },
      { key: 'it', full_name: 'Dewi Lestari', title: 'IT Manager', role: 'champion' },
      { key: 'ops', full_name: 'Agus Wijaya', title: 'Operations Manager', role: 'influencer' },
    ],
    assets: [
      { product: 'MOBILITY', site: 'jkt', start: '2019-08-01', monthly_sgd: 3900, quantity: 260 },
      { product: 'IOT', site: 'jkt', start: '2022-01-03', monthly_sgd: 5600, quantity: 1 },
    ],
    contracts: [
      {
        number: 'QLI-2025-0007',
        start: '2025-07-01',
        term_months: 24,
        products: ['MOBILITY', 'IOT'],
      },
    ],
    cases: [
      {
        site: 'cik',
        ago: 25,
        closed: 22,
        severity: 'medium',
        category: 'performance',
        subject: 'Slow links at Cikarang warehouse',
        description:
          'The new Cikarang warehouse runs on a local broadband provider. Handheld scanners time out at peak hours.',
        csat: 3,
      },
      {
        site: 'sub',
        ago: 9,
        severity: 'medium',
        category: 'performance',
        subject: 'Surabaya warehouse link drops',
        description:
          'The new Surabaya warehouse is off the Singtel network. Its local link drops several times a day.',
      },
    ],
    activities: [
      {
        contact: 'gm',
        type: 'meeting',
        ago: 33,
        subject: 'Expansion update',
        outcome: 'Two new warehouses opened; connectivity sourced locally for speed',
        notes: '',
      },
      {
        contact: 'it',
        type: 'call',
        ago: 9,
        subject: 'Surabaya link issues',
        outcome: 'Customer asked whether the group network can extend to the new sites',
        notes: '',
      },
    ],
    opportunities: [],
    expected: {
      band: 'watch',
      top_reason: 'coverage_gap',
      gap_product: 'CUBE',
      next_action: 'cross_sell',
    },
  },
];

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** Deterministic UUID-shaped id (version 5 layout) from a stable key. */
export function seedId(key) {
  const h = createHash('sha1').update(`singtech-ai:${key}`).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso, months) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

const daysAgo = (days) => (days === undefined || days === null ? null : addDays(SEED_TODAY, -days));
const round2 = (n) => Math.round(n * 100) / 100;
const toLocal = (sgd, currency) => round2(sgd / FX_TO_SGD[currency]);

/** Small deterministic wobble (plus or minus 1%) so flat spend does not look machine-made. */
function wobble(key, month) {
  const h = createHash('sha1').update(`wobble:${key}:${month}`).digest();
  return 1 + ((h[0] % 21) - 10) / 1000;
}

function maskEmail(fullName, domain) {
  const first = fullName
    .replace(/^Dr\s+/, '')
    .trim()[0]
    .toLowerCase();
  return `${first}***@${domain}`;
}

/** SGD value an asset contributed in a bill period, honouring adds, changes and removals. */
function assetValueInPeriod(asset, periodStart, periodEnd) {
  if (asset.start > periodEnd) return 0;
  const change = asset.change;
  if (change?.type === 'removed') return change.on <= periodStart ? 0 : change.previous_sgd;
  if (
    change &&
    (change.type === 'upgraded' || change.type === 'downgraded') &&
    change.on > periodStart
  ) {
    return change.previous_sgd;
  }
  return asset.monthly_sgd;
}

// ---------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------

export function buildSeed(stories = STORIES) {
  const out = {
    accounts: [],
    sites: [],
    contacts: [],
    assets: [],
    contracts: [],
    cases: [],
    activities: [],
    bills: [],
    opportunities: [],
    stories: [],
  };
  let caseSeq = 400;
  let billSeq = 4800;

  for (const s of stories) {
    const accountId = seedId(`account:${s.key}`);
    const currency = MARKET_BY_CODE[s.account.market].currency;
    const siteId = (key) => (key ? seedId(`site:${s.key}:${key}`) : null);
    const contactId = (key) => (key ? seedId(`contact:${s.key}:${key}`) : null);
    const customerSince = s.assets.map((a) => a.start).sort()[0];

    out.accounts.push({
      id: accountId,
      parent_id: s.parent ? seedId(`account:${s.parent}`) : null,
      name: s.account.name,
      account_type: 'business',
      segment: s.account.segment,
      industry: s.account.industry,
      country: s.account.market,
      market: s.account.market,
      employee_band: s.account.employee_band,
      annual_revenue_band: s.account.annual_revenue_band,
      ...OWNERS[s.account.owner],
      is_customer: true,
      customer_since: customerSince,
    });

    for (const site of s.sites) {
      out.sites.push({
        id: siteId(site.key),
        account_id: accountId,
        name: site.name,
        site_type: site.site_type,
        city: site.city,
        country: s.account.market,
        on_net: site.on_net ?? true,
        opened_on: site.opened_on,
        closed_on: null,
      });
    }

    const activityRows = s.activities.map((a, i) => ({
      id: seedId(`activity:${s.key}:${i}`),
      account_id: accountId,
      contact_id: contactId(a.contact),
      activity_type: a.type,
      occurred_on: daysAgo(a.ago),
      subject: a.subject,
      outcome: a.outcome,
      notes: a.notes,
    }));

    for (const c of s.contacts) {
      const id = contactId(c.key);
      const touched = activityRows
        .filter((a) => a.contact_id === id)
        .map((a) => a.occurred_on)
        .sort();
      out.contacts.push({
        id,
        account_id: accountId,
        full_name: c.full_name,
        title: c.title,
        email_masked: maskEmail(c.full_name, s.domain),
        role: c.role,
        left_company: Boolean(c.left_on),
        left_on: c.left_on ?? null,
        last_contacted_on: touched.at(-1) ?? null,
      });
    }

    for (const a of s.assets) {
      const change = a.change ?? null;
      out.assets.push({
        id: seedId(`asset:${s.key}:${a.product}`),
        account_id: accountId,
        site_id: siteId(a.site),
        product_code: a.product,
        product_name: PRODUCT_BY_CODE[a.product].name,
        status: a.status ?? 'active',
        start_date: a.start,
        end_date: change?.type === 'removed' ? addDays(change.on, -1) : null,
        quantity: a.quantity,
        currency,
        monthly_value: toLocal(a.monthly_sgd, currency),
        monthly_value_sgd: a.monthly_sgd,
        previous_monthly_value_sgd: change?.previous_sgd ?? null,
        changed_on: change?.on ?? null,
        change_type: change?.type ?? null,
      });
    }

    for (const c of s.contracts) {
      const end = addDays(addMonths(c.start, c.term_months), -1);
      const monthlySgd = c.products.reduce((sum, code) => {
        const asset = s.assets.find((a) => a.product === code);
        return (
          sum + (asset.change?.type === 'removed' ? asset.change.previous_sgd : asset.monthly_sgd)
        );
      }, 0);
      const totalSgd = round2(monthlySgd * c.term_months);
      const daysToEnd = (Date.parse(end) - Date.parse(SEED_TODAY)) / 86_400_000;
      out.contracts.push({
        id: seedId(`contract:${c.number}`),
        account_id: accountId,
        contract_number: c.number,
        start_date: c.start,
        end_date: end,
        term_months: c.term_months,
        currency,
        total_value: toLocal(totalSgd, currency),
        total_value_sgd: totalSgd,
        auto_renew: false,
        status: daysToEnd < 0 ? 'expired' : daysToEnd <= 90 ? 'expiring' : 'active',
        product_codes: [...c.products],
      });
    }

    for (const c of s.cases) {
      caseSeq += 1;
      out.cases.push({
        id: seedId(`case:${s.key}:${c.ago}:${c.subject}`),
        account_id: accountId,
        site_id: siteId(c.site),
        case_number: `C-${String(caseSeq).padStart(4, '0')}`,
        opened_on: daysAgo(c.ago),
        closed_on: daysAgo(c.closed),
        severity: c.severity,
        category: c.category,
        subject: c.subject,
        description: c.description,
        mentions_competitor: Boolean(c.competitor),
        competitor_alias: c.competitor ?? null,
        csat: c.csat ?? null,
      });
    }

    out.activities.push(...activityRows);

    s.opportunities.forEach((o, i) => {
      out.opportunities.push({
        id: seedId(`opportunity:${s.key}:${i}`),
        account_id: accountId,
        name: o.name,
        opportunity_type: o.type,
        stage: o.stage,
        currency,
        amount: toLocal(o.amount_sgd, currency),
        amount_sgd: o.amount_sgd,
        product_codes: [...o.products],
        created_on: daysAgo(o.created_ago),
        closed_on: daysAgo(o.closed_ago),
        source: o.source,
        lost_reason: o.lost_reason ?? null,
      });
    });

    for (let m = 0; m < BILL_MONTHS; m += 1) {
      const periodStart = addMonths(FIRST_BILL_MONTH, m);
      const periodEnd = addDays(addMonths(periodStart, 1), -1);
      const factor = s.spend?.[m] ?? wobble(s.key, m);
      const lines = s.assets
        .map((a) => ({
          product_code: a.product,
          description: PRODUCT_BY_CODE[a.product].name,
          amount_sgd: round2(assetValueInPeriod(a, periodStart, periodEnd) * factor),
        }))
        .filter((line) => line.amount_sgd > 0);
      const amountSgd = round2(lines.reduce((sum, line) => sum + line.amount_sgd, 0));
      billSeq += 1;
      out.bills.push({
        id: seedId(`bill:${s.key}:${periodStart}`),
        billing_account_id: accountId,
        bill_number: `INV-${periodStart.slice(0, 4)}-${String(billSeq).padStart(6, '0')}`,
        period_start: periodStart,
        period_end: periodEnd,
        currency,
        amount: toLocal(amountSgd, currency),
        amount_sgd: amountSgd,
        status: m === BILL_MONTHS - 1 ? 'due' : 'paid',
        product_lines: lines,
      });
    }

    out.stories.push({
      account_id: accountId,
      story_key: s.key,
      story_code: s.story_code,
      title: s.title,
      narrative: s.narrative,
      expected: { ...s.expected },
    });
  }

  return out;
}

// Run as a script: write one JSON file per table next to this file.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const dir = dirname(fileURLToPath(import.meta.url));
  const seed = buildSeed();
  for (const [table, rows] of Object.entries(seed)) {
    writeFileSync(join(dir, `${table}.json`), `${JSON.stringify(rows, null, 2)}\n`);
    console.log(`${table}.json: ${rows.length} rows`);
  }
}
