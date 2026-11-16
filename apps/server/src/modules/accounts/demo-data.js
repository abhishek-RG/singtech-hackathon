// Fictional enterprise accounts and synthetic internal guidance for the prototype.
// Only the six short Singtel service descriptions below came from user-supplied material.

const participants = (customer, contacts) => `${contacts} · ${customer}; Enterprise Sales Advisor`;

function interaction({
  id,
  date,
  channel,
  title,
  opportunityId = null,
  summary,
  content,
  contacts,
  tags = [],
}) {
  return {
    id,
    date,
    channel,
    title,
    description: summary,
    opportunityId,
    tags,
    sourceType:
      channel === 'Email'
        ? 'Email thread'
        : channel === 'Online meeting'
          ? 'Meeting transcript'
          : channel === 'Phone call'
            ? 'Call summary'
            : 'Account record',
    details: {
      summary,
      participants: contacts,
      content,
    },
  };
}

export const demoAccounts = [
  {
    id: 'acct-asteron-demo',
    name: 'Asteron Components Pte. Ltd.',
    segment: 'Enterprise',
    industry: 'Electronics manufacturing',
    location: 'Singapore',
    relationshipSince: '2026-08-12',
    owner: 'Enterprise Sales Advisor',
    summary:
      'Fictional enterprise lead evaluating connectivity across manufacturing and distribution sites. The opportunity has been active for about three months and remains undecided.',
    services: [],
    opportunities: [
      {
        id: 'opp-asteron-connectivity',
        name: 'Multi-site connectivity review',
        status: 'Open',
        stage: 'Solution validation',
        updatedAt: '2026-11-04',
        targetClose: '2027-01-30',
        health: 'On track',
      },
    ],
    interactions: [
      interaction({
        id: 'asteron-email-1',
        date: '2026-08-12',
        channel: 'Email',
        title: 'Initial enterprise enquiry',
        opportunityId: 'opp-asteron-connectivity',
        contacts: 'R. Menon, IT Director',
        tags: ['lead', 'connectivity', 'multiple sites'],
        summary:
          'Asteron asked to review connectivity options for its Singapore headquarters and regional operating sites. No solution or commercial terms have been proposed.',
        content:
          'From: R. Menon, IT Director, Asteron Components\nSubject: Enterprise connectivity across operating sites\nDate: 12 Aug 2026\n\nWe are reviewing our connectivity arrangements across the Singapore office, two production facilities, and several distribution locations. We would like to understand what information you need to assess options.\n\nAdvisor reply: We can start with a discovery discussion. Please bring the site list, current connectivity overview, business-critical applications, and the teams involved in the review. No product fit or pricing has been confirmed.',
      }),
      interaction({
        id: 'asteron-meeting-1',
        date: '2026-09-03',
        channel: 'Online meeting',
        title: 'Discovery: site and application requirements',
        opportunityId: 'opp-asteron-connectivity',
        contacts: 'R. Menon, IT Director · S. Koh, Operations Manager',
        tags: ['discovery', 'requirements'],
        summary:
          'The customer is consolidating site requirements. Production uptime and consistent connectivity across locations are priorities; site-level technical details remain incomplete.',
        content:
          '09:05 · Advisor: Which business processes are most affected by the current setup?\n09:09 · S. Koh: Production planning and inventory updates rely on systems used by multiple locations. We need to document where delays occur.\n09:14 · R. Menon: We have not completed the site inventory or application map yet.\n09:22 · Advisor: We should capture the current environment before discussing possible designs.\n\nActions: Asteron to provide a site inventory and application list. Singtel advisor to review the requirements before suggesting any product. No commitment or solution fit confirmed.',
      }),
      interaction({
        id: 'asteron-call-1',
        date: '2026-10-02',
        channel: 'Phone call',
        title: 'Stakeholder and procurement update',
        opportunityId: 'opp-asteron-connectivity',
        contacts: 'R. Menon, IT Director',
        tags: ['procurement', 'stakeholders', 'follow-up'],
        summary:
          'Finance and procurement need to join before a recommendation is considered. The customer has not approved a budget or selected a preferred option.',
        content:
          'Advisor: Has the site inventory been completed?\nR. Menon: We have a first draft. I need operations to verify two locations. Procurement and finance will also review any proposal.\nAdvisor: Is there a budget range or target decision date?\nR. Menon: Not yet. We are comparing the current situation and gathering internal requirements.\n\nNext step: Validate the site inventory, identify procurement and finance contacts, and confirm the decision process. Do not describe the opportunity as committed.',
      }),
      interaction({
        id: 'asteron-meeting-2',
        date: '2026-11-04',
        channel: 'Online meeting',
        title: 'Solution validation remains open',
        opportunityId: 'opp-asteron-connectivity',
        contacts: 'R. Menon, IT Director · S. Koh, Operations Manager · P. Lee, Procurement',
        tags: ['solution validation', 'open questions'],
        summary:
          'The opportunity is active after three months, but the full site inventory and decision criteria are still being validated. No final proposal has been accepted.',
        content:
          '10:02 · R. Menon: We have the first site list. Two distribution locations still need local confirmation.\n10:08 · P. Lee: Procurement will need comparable scope and clear assumptions before we can review a proposal.\n10:16 · S. Koh: We should include operational impact and service dependencies in the requirements.\n10:24 · Advisor: Agreed. We will validate the information before preparing a recommendation.\n\nOpen items: confirm all sites; document business-critical applications and availability expectations; identify decision criteria and approval steps; confirm target timeline. Status: open, solution validation. No price, technical design, or service commitment recorded.',
      }),
    ],
    documents: [
      {
        id: 'asteron-brief',
        title: 'Asteron account brief',
        type: 'Account brief',
        date: '2026-11-04',
        source: 'Synthetic account summary',
        tags: ['enterprise', 'open opportunity'],
        content:
          'Fictional enterprise prospect in electronics manufacturing. Opportunity: Multi-site connectivity review. Stage: Solution validation. Active for about three months as of November 2026. No existing Singtel service is recorded. Outstanding: complete site inventory, application dependencies, decision criteria, procurement process, and target decision date. No accepted proposal or commercial commitment.',
      },
    ],
    intelligence: [],
  },
  {
    id: 'acct-harbourlight-demo',
    name: 'Harbourlight Health Network Ltd.',
    segment: 'Enterprise',
    industry: 'Healthcare',
    location: 'Singapore',
    relationshipSince: '2023-08-07',
    owner: 'Enterprise Sales Advisor',
    summary:
      'Fictional long-standing enterprise customer. A completed connectivity engagement remains part of the relationship history; the team continues account reviews and is exploring a separate equipment-visibility need.',
    services: [
      {
        id: 'svc-harbourlight-cubz',
        name: 'Singtel CUBZ',
        status: 'Active',
        since: '2024-02-15',
        source: 'Fictional account record; product scope not represented',
      },
    ],
    opportunities: [
      {
        id: 'opp-harbourlight-connectivity',
        name: 'Enterprise connectivity programme',
        status: 'Won',
        stage: 'Customer',
        closedAt: '2024-02-15',
      },
      {
        id: 'opp-harbourlight-visibility',
        name: 'Equipment visibility discovery',
        status: 'Open',
        stage: 'Discovery',
        updatedAt: '2026-10-28',
        health: 'Explore',
      },
    ],
    interactions: [
      interaction({
        id: 'harbourlight-email-1',
        date: '2023-08-07',
        channel: 'Email',
        title: 'Enterprise account introduction',
        opportunityId: 'opp-harbourlight-connectivity',
        contacts: 'D. Wong, Group IT Lead',
        tags: ['enterprise', 'initial enquiry'],
        summary:
          'Harbourlight requested an enterprise discussion about coordinating connectivity requirements across its facilities.',
        content:
          'From: D. Wong, Group IT Lead\nSubject: Enterprise account discussion\nDate: 7 Aug 2023\n\nWe are reviewing the connectivity arrangements used across our care and administration locations. We would like to understand the discovery process and the information needed for an account-level review.\n\nAdvisor reply: We will first document locations, users, existing services, operational requirements, and stakeholders. This thread records an initial enquiry only.',
      }),
      interaction({
        id: 'harbourlight-meeting-1',
        date: '2023-10-19',
        channel: 'Face-to-face',
        title: 'Multi-site discovery workshop',
        opportunityId: 'opp-harbourlight-connectivity',
        contacts: 'D. Wong, Group IT Lead · L. Tan, Operations Director',
        tags: ['discovery', 'multi-site'],
        summary:
          'The customer mapped its stakeholders and facility requirements for an enterprise connectivity programme.',
        content:
          'Workshop notes\n• Harbourlight operates several care facilities and administrative offices.\n• The customer will verify the location inventory and document service dependencies.\n• IT and operations will jointly review requirements.\n• The parties agreed to continue discovery before agreeing scope.\n\nNo technical architecture or service-level commitment was recorded.',
      }),
      interaction({
        id: 'harbourlight-account-record',
        date: '2024-02-15',
        channel: 'Purchase',
        title: 'Connectivity programme recorded as won',
        opportunityId: 'opp-harbourlight-connectivity',
        contacts: 'Account owner: Enterprise Sales Advisor',
        tags: ['won', 'existing customer'],
        summary:
          'The fictional account record marks the enterprise connectivity programme as won and records Singtel CUBZ as an existing service. Commercial details are intentionally not modeled.',
        content:
          'ACCOUNT EVENT · 15 Feb 2024\nOpportunity: Enterprise connectivity programme\nOutcome: Won\nService recorded: Singtel CUBZ\n\nSynthetic demo record only. No contract value, service scope, technical configuration, or performance claim is represented.',
      }),
      interaction({
        id: 'harbourlight-review-1',
        date: '2025-06-12',
        channel: 'Online meeting',
        title: 'Post-sale account review',
        contacts: 'D. Wong, Group IT Lead · L. Tan, Operations Director',
        tags: ['customer success', 'account review'],
        summary:
          'The parties reviewed the relationship after the completed engagement. Harbourlight asked to keep a shared list of operational changes and future requirements.',
        content:
          '14:03 · Advisor: What has changed across the facilities since the programme began?\n14:10 · L. Tan: We are updating how equipment is tracked between departments. We do not yet have a complete requirements list.\n14:18 · D. Wong: Please keep the account review focused on current operations and agreed service records.\n\nActions: maintain the account history; customer to confirm process owners and any new requirements. No additional product was selected.',
      }),
      interaction({
        id: 'harbourlight-review-2',
        date: '2026-10-28',
        channel: 'Online meeting',
        title: 'New equipment-visibility discussion',
        opportunityId: 'opp-harbourlight-visibility',
        contacts: 'D. Wong, Group IT Lead · L. Tan, Operations Director · M. Chia, Facilities',
        tags: ['new need', 'equipment visibility', 'upsell discovery'],
        summary:
          'Harbourlight is exploring better visibility of shared equipment across facilities. The need is early-stage; operational, privacy, and technical requirements must be gathered before any fit is suggested.',
        content:
          '09:31 · L. Tan: Teams have asked for a clearer view of where shared equipment is between facilities.\n09:38 · M. Chia: We first need to agree which equipment is in scope and who maintains the records.\n09:46 · D. Wong: Any approach must go through our IT and privacy review.\n09:54 · Advisor: We can document the use case and review relevant approved service information after the requirements are clear.\n\nOpen questions: equipment categories; sites and movement patterns; who needs access; current systems; data and privacy requirements; technical review owner.\nPotential discussion lead: Singtel Internet of Things overview. This is a discovery signal only, not a confirmed product fit or proposal.',
      }),
    ],
    documents: [
      {
        id: 'harbourlight-brief',
        title: 'Harbourlight account brief',
        type: 'Account brief',
        date: '2026-10-28',
        source: 'Synthetic account summary',
        tags: ['enterprise', 'existing customer', 'upsell discovery'],
        content:
          'Fictional enterprise customer since August 2023. Completed opportunity: Enterprise connectivity programme, recorded won on 15 Feb 2024. Existing service record: Singtel CUBZ. Current open opportunity: equipment visibility discovery, updated 28 Oct 2026. Customer is still defining scope, stakeholders, current systems, and privacy review requirements. Potential discussion lead: supplied Singtel Internet of Things overview; do not claim technical fit until validated.',
      },
    ],
    intelligence: [],
  },
  {
    id: 'acct-eastbridge-demo',
    name: 'Eastbridge Freight & Warehousing Pte. Ltd.',
    segment: 'Enterprise',
    industry: 'Freight and warehousing',
    location: 'Singapore',
    relationshipSince: '2026-02-16',
    owner: 'Enterprise Sales Advisor',
    summary:
      'Fictional enterprise prospect with a nine-month open opportunity. The deal is at risk after delays and unresolved scope concerns, but the customer has re-engaged and agreed to a narrower requirements reset.',
    services: [],
    opportunities: [
      {
        id: 'opp-eastbridge-modernisation',
        name: 'Warehouse connectivity and operations review',
        status: 'Open',
        stage: 'Requalification',
        updatedAt: '2026-11-10',
        targetClose: null,
        health: 'At risk',
      },
    ],
    interactions: [
      interaction({
        id: 'eastbridge-email-1',
        date: '2026-02-16',
        channel: 'Email',
        title: 'Warehouse technology review enquiry',
        opportunityId: 'opp-eastbridge-modernisation',
        contacts: 'K. Rahman, Head of Infrastructure',
        tags: ['lead', 'warehouse', 'connectivity'],
        summary:
          'Eastbridge opened a discussion about reviewing technology needs at its warehouse locations. Scope, budget, and decision process were not known.',
        content:
          'From: K. Rahman, Head of Infrastructure\nSubject: Warehouse site review\nDate: 16 Feb 2026\n\nWe are reviewing the setup at several warehouse locations and may need to improve how the sites support day-to-day operations. We are at an early stage and do not yet have a detailed scope.\n\nAdvisor reply: Let us start with business outcomes, site requirements, current environment, stakeholders, and decision process before discussing possible options.',
      }),
      interaction({
        id: 'eastbridge-meeting-1',
        date: '2026-03-20',
        channel: 'Online meeting',
        title: 'Initial requirements workshop',
        opportunityId: 'opp-eastbridge-modernisation',
        contacts: 'K. Rahman, Head of Infrastructure · P. Yeo, Warehouse Operations',
        tags: ['discovery', 'requirements'],
        summary:
          'Operations identified inconsistent site documentation and asked for an assessment. The customer has not confirmed which locations are in scope.',
        content:
          '10:02 · P. Yeo: The biggest difficulty is that each warehouse has a different record of its current setup.\n10:11 · K. Rahman: We need an assessment that does not assume every site needs the same change.\n10:19 · Advisor: Please identify the first locations and the operational impact to investigate.\n\nAction: Eastbridge to nominate pilot sites and provide a current-state summary. No technical proposal or commercial commitment made.',
      }),
      interaction({
        id: 'eastbridge-call-1',
        date: '2026-05-29',
        channel: 'Phone call',
        title: 'Budget review delayed',
        opportunityId: 'opp-eastbridge-modernisation',
        contacts: 'K. Rahman, Head of Infrastructure',
        tags: ['budget', 'delay', 'risk'],
        summary:
          'Finance deferred budget consideration until the customer can compare a defined scope. The opportunity remains open but has no confirmed decision date.',
        content:
          'K. Rahman: Finance asked us to return with a clearer scope and expected outcomes. We should pause a broad proposal until operations agrees on the pilot sites.\nAdvisor: Understood. We will hold the proposal and help clarify what information is missing.\n\nRisk: no approved budget, no confirmed scope, no decision date. Next step: narrow the problem statement with operations.',
      }),
      interaction({
        id: 'eastbridge-email-2',
        date: '2026-08-18',
        channel: 'Email',
        title: 'Sponsor change and review pause',
        opportunityId: 'opp-eastbridge-modernisation',
        contacts: 'K. Rahman, Head of Infrastructure',
        tags: ['sponsor change', 'stalled', 'risk'],
        summary:
          'A change in the customer sponsor paused the review. Eastbridge asked to resume after the new operations lead had reviewed the requirements.',
        content:
          'From: K. Rahman\nDate: 18 Aug 2026\n\nOur previous operations sponsor has moved roles. The new lead needs time to review the site notes. Please do not prepare a full proposal until we confirm what remains in scope.\n\nAdvisor reply: We will keep the opportunity open and schedule a short requalification discussion when the new lead is ready. No decision or purchase commitment has been made.',
      }),
      interaction({
        id: 'eastbridge-meeting-2',
        date: '2026-11-10',
        channel: 'Online meeting',
        title: 'Requalification: smaller pilot agreed for review',
        opportunityId: 'opp-eastbridge-modernisation',
        contacts:
          'K. Rahman, Head of Infrastructure · P. Yeo, Warehouse Operations · T. Ng, Finance',
        tags: ['requalification', 'at risk', 're-engaged'],
        summary:
          'Eastbridge re-engaged and agreed to review a smaller pilot scope. The deal remains at risk: budget and technical requirements are not approved, but the customer assigned owners to clarify them.',
        content:
          '15:02 · K. Rahman: We can restart with two sites, if we agree on what we are assessing.\n15:10 · P. Yeo: I can provide the operational requirements for those two sites by the end of the month.\n15:18 · T. Ng: Finance will review once there is a bounded scope and comparison criteria.\n15:25 · Advisor: We will document the pilot assumptions and open questions, then validate them before preparing any recommendation.\n\nRecovery indicators: sponsor and operations have re-engaged; two-site pilot is under consideration; owners assigned for requirements.\nRemaining risks: no budget approval, no final technical fit, no agreed commercial terms, and no decision date.\nNext action: obtain the two-site requirements and confirm the criteria finance will use. Status remains open and at risk.',
      }),
    ],
    documents: [
      {
        id: 'eastbridge-brief',
        title: 'Eastbridge opportunity brief',
        type: 'Account brief',
        date: '2026-11-10',
        source: 'Synthetic account summary',
        tags: ['enterprise', 'at risk', 'requalification'],
        content:
          'Fictional enterprise prospect. Opportunity: Warehouse connectivity and operations review. Open for about nine months as of 16 Nov 2026. Stage: Requalification. Health: At risk. Earlier delays involved an undefined scope, deferred budget review, and a sponsor change. Latest update: customer re-engaged and is considering a two-site pilot; operations requirements and finance criteria are due for clarification. Budget, technical fit, commercial terms, and decision date remain unconfirmed.',
      },
    ],
    intelligence: [],
  },
];

export const sharedKnowledgeDocuments = [
  {
    id: 'singtel-service-5g',
    title: '5G+',
    type: 'Singtel service overview',
    date: '2026-11-16',
    source: 'User-supplied Singtel enterprise services screenshot',
    tags: ['Singtel', '5G+', 'enterprise'],
    content:
      'Singtel 5G+. Supplied description: “Harness the power of 5G+ with Singtel.” This short description does not specify coverage, performance, availability, pricing, or technical fit. Verify those details from current approved product material.',
  },
  {
    id: 'singtel-service-cubz',
    title: 'Singtel CUBZ',
    type: 'Singtel service overview',
    date: '2026-11-16',
    source: 'User-supplied Singtel enterprise services screenshot',
    tags: ['Singtel', 'CUBZ', 'connectivity'],
    content:
      'Singtel CUBZ. Supplied description: “Embrace the full power of connectivity for your business.” This short description does not specify technical scope, performance, pricing, or eligibility. Verify details from current approved product material.',
  },
  {
    id: 'singtel-service-cyber',
    title: 'Cyber Security',
    type: 'Singtel service overview',
    date: '2026-11-16',
    source: 'User-supplied Singtel enterprise services screenshot',
    tags: ['Singtel', 'Cyber Security'],
    content:
      'Singtel Cyber Security. Supplied description: “World-class cybersecurity to help protect your business.” The screenshot does not specify products, controls, certifications, response times, pricing, or technical fit. Verify details from current approved product material.',
  },
  {
    id: 'singtel-service-iot',
    title: 'Internet of Things',
    type: 'Singtel service overview',
    date: '2026-11-16',
    source: 'User-supplied Singtel enterprise services screenshot',
    tags: ['Singtel', 'Internet of Things', 'IoT'],
    content:
      'Singtel Internet of Things. Supplied description: “We enable smart cities and enterprises, and help your ambitions thrive in this new digital environment.” The screenshot does not specify devices, platform capabilities, integrations, pricing, or technical fit. Verify details from current approved product material.',
  },
  {
    id: 'singtel-service-mobility',
    title: 'Mobility',
    type: 'Singtel service overview',
    date: '2026-11-16',
    source: 'User-supplied Singtel enterprise services screenshot',
    tags: ['Singtel', 'Mobility'],
    content:
      'Singtel Mobility. Supplied description: “Mobility schemes and solutions for businesses of all sizes.” The screenshot does not specify plans, devices, coverage, pricing, or technical fit. Verify details from current approved product material.',
  },
  {
    id: 'singtel-service-quantum-safe',
    title: 'Quantum-Safe Network',
    type: 'Singtel service overview',
    date: '2026-11-16',
    source: 'User-supplied Singtel enterprise services screenshot',
    tags: ['Singtel', 'Quantum-Safe Network'],
    content:
      'Singtel Quantum-Safe Network. Supplied description: “Securing our digital economy with quantum-safe technologies for businesses.” The screenshot does not specify architecture, guarantees, availability, pricing, or technical fit. Verify details from current approved product material.',
  },
  {
    id: 'mock-sales-discovery-guide',
    title: 'Enterprise discovery guide (mock internal document)',
    type: 'Mock sales playbook',
    date: '2026-11-16',
    source: 'Synthetic demo content; not official Singtel policy',
    tags: ['sales', 'discovery', 'mock'],
    content:
      'DEMO DOCUMENT — FICTIONAL INTERNAL GUIDANCE, NOT OFFICIAL SINGTEL POLICY.\n\nFor an enterprise discovery meeting, establish the customer’s business outcome before discussing a product. Capture locations, user groups, current environment, critical workflows, constraints, stakeholders, procurement steps, decision criteria, and timing. Separate customer-stated facts from advisor hypotheses. Record unknowns explicitly. Do not promise technical capabilities, pricing, availability, service levels, or outcomes unless current approved material confirms them. Agree an owner and date for each follow-up.',
  },
  {
    id: 'mock-technical-validation-guide',
    title: 'Technical solution validation checklist (mock internal document)',
    type: 'Mock technical guide',
    date: '2026-11-16',
    source: 'Synthetic demo content; not official Singtel architecture guidance',
    tags: ['technical', 'solution validation', 'mock'],
    content:
      'DEMO DOCUMENT — FICTIONAL TECHNICAL CHECKLIST, NOT OFFICIAL SINGTEL ARCHITECTURE GUIDANCE.\n\nBefore recommending an enterprise solution, ask the customer’s technical owner to validate: current architecture and dependencies; locations and users in scope; integration and identity requirements; data classification and privacy constraints; resilience and operational ownership; migration or rollout boundaries; acceptance criteria; and any required security review. Maintain a question log and identify the approved Singtel product specialist who can confirm fit. This checklist does not assert that any named service supports a particular feature.',
  },
  {
    id: 'mock-account-review-guide',
    title: 'Account review and opportunity handoff (mock internal document)',
    type: 'Mock customer-success guide',
    date: '2026-11-16',
    source: 'Synthetic demo content; not official Singtel policy',
    tags: ['account review', 'customer success', 'mock'],
    content:
      'DEMO DOCUMENT — FICTIONAL INTERNAL GUIDANCE, NOT OFFICIAL SINGTEL POLICY.\n\nKeep the customer relationship history after a deal is won. At an account review, confirm active services from account records, ask what has changed, capture service concerns and new requirements, and distinguish support issues from new sales opportunities. For a possible cross-sell, record the customer need and evidence, link only relevant approved service information, and state what technical or commercial validation remains. Do not imply that a discussion lead is a confirmed opportunity or product fit.',
  },
];
