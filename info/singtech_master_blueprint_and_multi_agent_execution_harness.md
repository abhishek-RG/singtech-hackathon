# STARTHere.md: SingTech Unified Master Blueprint & Multi-Agent Harness

**Project:** SingTech (Proactive B2B Sales Intelligence & Cross-Border Co-Sell Platform for Singtel Enterprise)
**Event:** Singapore-India Hackathon 2026 (Industry Track: Emerging Technologies by Singtel)
**Execution Target:** Local-First macOS (`http://localhost:3000`) with full Desktop, Laptop, and Mobile responsiveness, zero cloud blockers, and stage-safe offline caching.

---

## PART 1: STRICT WRITING, TYPOGRAPHY & AESTHETIC GUARDRAILS (READ FIRST)

Every agent, sub-agent, and developer working on this repository must obey these rules across all UI text, generated sales copy, code comments, and documentation:

1. **ZERO EMOJIS ANYWHERE:** Never render emojis in the UI, buttons, badges, toast notifications, Slack webhook payloads, or AI-generated emails. Use crisp geometric SVG icons (Lucide or Meta Astryx icons) and structured status indicators (for example, a 6px solid `#E60012` or `#10B981` status dot).
2. **ZERO EM DASHES:** Never use the em dash character in any UI label, table cell, tooltip, or AI-generated sales outreach message. Use colons, semicolons, parentheses, commas, or standard hyphens instead.
3. **PROFESSIONAL B2B TELECOM & ENTERPRISE LINGO:** Write like a modern Tier-1 enterprise infrastructure startup built in partnership with Singtel. Use precise commercial and technical terminology:
   * *Use:* Annual Recurring Revenue (ARR), Total Contract Value (TCV), Service Level Agreement (SLA), Multi-Access Edge Computing (MEC), Software-Defined Interconnect, Post-Quantum Cryptography (PQC), Data Residency Posture, Local Breakout, Whitespace Analysis, Warm Intro Path, Co-Sell Swarm, Qualified Pipeline.
   * *Avoid:* Casual filler, marketing fluff, exclamation marks, or consumer-facing language.
4. **SINGTEL ENTERPRISE COLOR PALETTE (RED, CARBON BLACK, HIGH-CONTRAST SLATE):**
   * **Primary Brand Accent (Singtel Red):** `#E60012` (Hover state: `#C8000F`, Subtle badge fill: `rgba(230, 0, 18, 0.10)`, Border accent: `rgba(230, 0, 18, 0.35)`).
   * **Dark Command Surface (Sidebar, Topbar, & Dark Mode Canvas):** Carbon Black `#0A0A0C`, Elevated Panel `#121316`, Card Surface `#18191E`, Hairline Border `#26272F`.
   * **High-Contrast Daylight Workspace (Optional Light Surface for Data Tables/Proposals):** Pure Crisp White `#FFFFFF`, Secondary Surface `#F8F9FA`, Structural Border `#E2E4E9`, Primary Ink `#0A0A0C`, Muted Ink `#525866`.
   * **Semantic Signal Colors:** High-Priority Trigger `#E60012`, Verified/Compliant `#059669`, Warning/Latency Spike `#D97706`, Informational/Corridor `#2563EB`.
5. **TYPOGRAPHY & READABILITY:**
   * **UI & Headers:** `Inter` or `Plus Jakarta Sans` with tight tracking (`-0.02em` on headings) and high contrast.
   * **Telemetry, Scores, Financial ARR, & Regulatory Codes:** `JetBrains Mono` or `Geist Mono` (`tabular-nums` enforced on all numeric columns so numbers align vertically).
6. **RESPONSIVE LAYOUT & ANIMATIONS:**
   * **Desktop/Laptop (`>= 1024px`):** Fixed 240px Left Sidebar + Sticky 56px Topbar + High-density multi-pane workspace (Interactive Map/Table on left, sliding Detail Drawer on right).
   * **Tablet/Mobile (`< 1024px`):** Collapsible slide-over navigation drawer, sticky bottom action bar on Lead Cards, horizontal scroll containers for data tables, and stacked responsive cards so judges can test the live Vercel/Tailscale link on their phones.
   * **Micro-Interactions:** Smooth `180ms cubic-bezier(0.16, 1, 0.3, 1)` transitions on drawer slides, tab switches, filter updates, and live telemetry waveform pulses.

---

## PART 2: MULTI-AGENT WORKFLOW (`everything-claude-code` HARNESS)

This project strictly enforces the **Research-First, Plan-Before-Code, Multi-Agent Orchestration** methodology from `worldflowai/everything-claude-code` (`affaan-m/everything-claude-code`). Do not write production application code until Phase 1 (Research) and Phase 2 (Architecture Plan) are verified.

### 2.1 Context Window & Tool Discipline
* Keep active MCP tools under 10 to preserve the 200k context window for deep code synthesis.
* Delegate isolated tasks (data seeding, Astryx CLI component inspection, PII security testing, UI verification) to scoped sub-agents rather than polluting the primary orchestrator context.
* Perform strategic context compaction after completing each major build checkpoint.

### 2.2 Specialized Sub-Agent Roster (Create in `.claude/agents/`)
When executing tasks in Claude Code, invoke or simulate these five specialized roles in sequence:

1. **`researcher-catalog-agent` (Model: Sonnet / Haiku)**
   * **Scope:** Reads Part 3 and Part 4 of this document, verifies the Singtel B2B product catalog, cross-border compliance rules (India DPDP Act, RBI Localization, SG PDPA, MAS TRM, SG CII), and constructs `src/data/catalog.json` and `src/data/cached_companies.json`.
   * **Rule:** Every company signal must include a real, verifiable `sourceUrl` and `sourceTitle`.
2. **`planner-architect-agent` (Model: Opus / Sonnet - `/plan` Command)**
   * **Scope:** Inspects Meta Astryx component schemas via `@astryxdesign/cli` (`pnpm run astryx -- component --list`), defines TypeScript interfaces in `src/types/singtech.ts`, and locks the file tree before any UI code is written.
3. **`backend-security-agent` (Model: Sonnet - `/tdd` Command)**
   * **Scope:** Builds the deterministic scoring engine, the Local PII-Redaction gateway (`src/lib/pii-redactor.ts`), the offline-safe data controller (`src/lib/data-service.ts`), and the live Slack/CRM webhook dispatchers (`src/app/api/webhook/crm/route.ts`).
   * **Rule:** Write unit tests first (`RED` -> `GREEN` -> `REFACTOR`) to verify zero PII leakage and 100% offline fallback resilience.
4. **`frontend-astryx-agent` (Model: Sonnet)**
   * **Scope:** Builds the responsive Sidebar, Topbar (with the Role-Based Sales Division Switcher), and the 5 core screens using Meta Astryx patterns, Singtel Red/Black styling, Leaflet maps, and smooth drawer animations.
5. **`security-and-code-reviewer` (Model: Opus - `/code-review` & `/security-scan`)**
   * **Scope:** Audits the entire build against OWASP Top 10, checks for hardcoded secrets, verifies mobile viewport responsiveness (`375px` width up to `1920px`), and ensures zero emojis or em dashes exist in the codebase.

### 2.3 Mandatory Execution Loop before Writing Code
Every session must execute this exact 4-step sequence:
1. **`[THINK & RESEARCH]`:** Read this entire file. Inspect installed packages and run `pnpm run astryx -- component --list` to catalog available UI primitives.
2. **`[PLAN]`:** Output a concise file-by-file implementation plan and verify all TypeScript interfaces match the seed data schema.
3. **`[EXECUTE IN SLICES]`:**
   * *Slice 1:* Types + Seed JSONs (`catalog.json`, `cached_companies.json`, `call_transcript.json`) + PII Redactor.
   * *Slice 2:* App Shell (Responsive Sidebar, Topbar with Sales Desk Switcher, Offline/Live Mode Indicator).
   * *Slice 3:* Screen 1 (`Market Explorer` with India/APAC Map + Ranked Lead Table + Regulatory Brief) & Screen 2 (`Lead Card` Slide-Over Drawer).
   * *Slice 4:* Screen 3 (`Account View` Farming Matrix + Live Network Telemetry Trigger Simulator).
   * *Slice 5:* Screen 4 (`Customer ROI Micro-Portal` at `/proposal/[id]`), Screen 5 (`Call Assist` Transcript Player + `Impact Dashboard`), and Live Slack/CRM Webhook route.
4. **`[VERIFY & HARDEN]`:** Run `pnpm run build` and typecheck (`tsc --noEmit`). Fix all compiler or lint warnings before reporting completion.

---

## PART 3: DOMAIN RESEARCH & PRODUCT ARCHITECTURE (WHY WE WIN)

### 3.1 The Business Problem & Our Competitive Edge
Singtel is executing its **Singtel28 (ST28)** strategy to transition from a traditional connectivity provider into an APAC enterprise technology powerhouse across **Connectivity**, **Digital InfraCo (Nxera AI Data Centres & RE:AI GPU Cloud)**, **Cybersecurity (Quantum-Safe Network)**, and **NCS IT Services**.

Enterprise sales reps face two major bottlenecks:
1. **Hunting (New Logos in Growth Corridors like India <-> Singapore):** Reps spend 4+ hours manually checking news, job boards, and regulatory filings to find Indian companies expanding to Southeast Asia or Singaporean MNCs expanding into Bengaluru, Mumbai, Pune, and Chennai.
2. **Farming (Expanding Existing Accounts):** Reps work in divisional silos (Connectivity vs. Cyber vs. Cloud) and only react when a contract is expiring or a customer complains about network congestion.

**How SingTech Beats Generic Tools (Apollo, Clay, ZoomInfo):**
* **Telco Telemetry + Web Signal Fusion:** Apollo and Clay only scrape public web data. SingTech fuses public expansion signals with **Singtel's proprietary network telemetry** (simulated CAMARA API bandwidth throttling, roaming eSIM surges, and SG-HK/India subsea packet jitter).
* **Multi-Division Co-Sell Switcher:** Connects Singtel's specialized sales desks (*Global Connectivity Desk*, *Cyber & Quantum Desk*, *Digital InfraCo / AI Cloud Desk*) into one unified deal room so reps pitch high-margin **bundles** instead of isolated products.
* **Cross-Border Regulatory Guardrail Engine:** Automatically checks **India's DPDP Act (2023)**, **RBI Data Localization**, **Singapore's PDPA**, **MAS TRM**, and the **SG Cybersecurity Act (Critical Information Infrastructure - CII)**, turning compliance friction into larger bundle deals.
* **Dual-Sided Actionability (Sales Team + Customer):** Directly fulfills Singtel's prompt requirement to *"translate insights into meaningful actions for sales teams and customers"* by generating both an internal sales action card and a **Customer-Facing Interactive ROI & Topology Micro-Portal** (`/proposal/[id]`).

### 3.2 Singtel Enterprise Product Catalog (`src/data/catalog.json` Schema)
All product recommendations must map to Singtel's real B2B portfolio:

| Product ID | Product Name | Division / Pillar | Target Buyer | Base ARR (SGD) | Key Technical & Commercial Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SGT-CONN-01` | **Singtel CUBE SD-WAN & International MPLS** | Connectivity | CIO / VP Infra | $85,000 | Software-defined multi-branch networking across SG, India, and APAC with automated path selection via unified portal. |
| `SGT-CONN-02` | **SD-Connect & Optical Gigawave (100Gbps)** | Connectivity | CTO / Head of Infra | $160,000 | Ultra-low-latency programmable data center interconnect across SG, HK, Johor, and Mumbai (SEA-ME-WE 6 subsea route). |
| `SGT-CONN-03` | **Singtel Paragon 5G+ Network Slicing & MEC** | 5G & Edge | COO / Head of Ops | $140,000 | All-in-one orchestration for dedicated 5G slices, autonomous port/factory robotics, and Changi tarmac aircraft offload. |
| `SGT-CONN-04` | **Singtel iSHIP (Starlink LEO + VSAT + 5G Hybrid)** | Maritime & Satellite | Fleet IT Director | $195,000 | Managed maritime satellite orchestration combining Starlink LEO beams with shore 5G and enterprise firewall segmentation. |
| `SGT-IOT-01` | **Global IoT Multi-Domestic eSIM (Bridge Alliance)** | 5G & IoT | VP Supply Chain | $65,000 | Single-SKU compliant eSIM across 34+ operators (including Bharti Airtel in India) for EV fleets and cold-chain reefers. |
| `SGT-INFRA-01` | **Nxera AI Data Centre Colocation (DC Tuas / Johor)** | Digital InfraCo | CTO / VP Cloud | $220,000 | High-density liquid-cooled colocation at 58MW DC Tuas (Singapore) and Johor-Singapore SEZ green data centers. |
| `SGT-INFRA-02` | **RE:AI Sovereign GPU-as-a-Service (GPUaaS)** | Digital InfraCo | Head of AI / R&D | $280,000 | On-demand NVIDIA H100/B200 GPU clusters orchestrated via Singtel Paragon for sovereign LLM training and inference. |
| `SGT-CYBER-01` | **Singtel Quantum-Safe Network (QSN) & Managed SASE** | Cyber & Quantum | CISO / Head of Risk | $175,000 | Post-quantum cryptography (PQC), Quantum Key Distribution (QKD), and zero-trust SASE protecting banking and CII links. |
| `SGT-API-01` | **Aduna & Bridge Alliance Federated Network APIs** | Cyber & Mobility | Head of Fraud / App | $90,000 | CAMARA-standard network APIs for real-time SIM-Swap detection, Scam Sniffing, Roaming Device Status, and QoD. |
| `SGT-NCS-01` | **NCS Enterprise Cloud & AI Transformation** | Managed IT Services | Chief Digital Officer | $150,000 | End-to-end cloud migration, application modernization, and compliant cross-border data engineering across SG and India. |

---

## PART 4: COMPLETE SEED DATASET (`src/data/cached_companies.json`)

To guarantee the application works 100% offline on stage in under 50ms while allowing live API testing when online, embed this exact 10-company dataset (6 Hunting Leads in India/APAC + 4 Farming Accounts with Live Telemetry):

```json
[
  {
    "id": "lead-razorpay-in",
    "mode": "hunting",
    "companyName": "Razorpay Software Pvt Ltd",
    "hqCity": "Bengaluru",
    "corridor": "Bengaluru <-> Singapore",
    "industry": "FinTech & Cross-Border Payments",
    "coordinates": [12.9716, 77.5946],
    "priorityScore": 96,
    "scoreBreakdown": [
      { "label": "SEA Payment Switch Expansion", "points": 38 },
      { "label": "Regulatory Urgency (MAS TRM + RBI)", "points": 32 },
      { "label": "Warm Intro via Singtel FinTech Partner", "points": 26 }
    ],
    "whyNow": "Expanding cross-border payment gateway settlement nodes between Bengaluru, Mumbai, and Singapore; hiring 18 distributed systems and network security engineers.",
    "sourceTitle": "Economic Times Tech: Razorpay scales Southeast Asia payment infrastructure",
    "sourceUrl": "https://economictimes.indiatimes.com/tech/startups",
    "likelyNeeds": ["Ultra-low-latency SG-India optical routing", "Post-quantum encryption for payment rails", "Real-time SIM-swap fraud prevention API"],
    "recommendedBundle": {
      "bundleName": "Sovereign FinTech Corridor Stack",
      "products": ["SGT-CONN-02", "SGT-CYBER-01", "SGT-API-01"],
      "estimatedArrSgd": 425000,
      "starterDownsellBundle": ["SGT-CONN-01", "SGT-API-01"],
      "starterArrSgd": 175000
    },
    "complianceFlags": ["INDIA_DPDP_ACT_2023", "RBI_DATA_LOCALIZATION", "SG_MAS_TRM"],
    "complianceNote": "RBI mandates primary transaction logs remain on Indian soil; architecture keeps raw ledger in Mumbai/Bengaluru while syncing tokenized settlement vectors to Singapore via Quantum-Safe SD-Connect.",
    "decisionMaker": {
      "role": "Chief Information Security Officer & SVP Infrastructure",
      "targetTitle": "CISO / VP Core Engineering",
      "entryRoute": "Warm Intro (Existing Singtel Regional Banking Partner)",
      "localPartnerNote": "Last-mile India redundancy eligible via Bharti Airtel enterprise interconnect"
    },
    "nextAction": "Initiate warm intro via Singtel FinTech desk this week; lead with MAS TRM compliant SG-Bengaluru optical routing and Aduna SIM-swap API pilot.",
    "draftOutreach": "Subject: Supporting Razorpay's Singapore-India payment switch latency and MAS TRM readiness\n\nHi [Name],\n\nNoticed Razorpay's recent engineering expansion connecting Bengaluru and Singapore payment nodes. As cross-border transaction volumes scale between RBI and MAS jurisdictions, several regional payment leaders are pairing Singtel's programmable SD-Connect optical links with our Quantum-Safe Network and federated SIM-Swap APIs.\n\nWe prepared a 1-page interactive topology model showing how this cuts SG-Bengaluru settlement jitter by 38% while keeping primary ledger data localized under India's DPDP Act. Open to a 15-minute architecture review this Thursday?"
  },
  {
    "id": "lead-delhivery-in",
    "mode": "hunting",
    "companyName": "Delhivery Limited",
    "hqCity": "Pune",
    "corridor": "Pune / Mumbai <-> Tuas Port SG",
    "industry": "Logistics & Supply Chain",
    "coordinates": [18.5204, 73.8567],
    "priorityScore": 92,
    "scoreBreakdown": [
      { "label": "Automated Sortation Hub Expansion", "points": 35 },
      { "label": "Cross-Border Air/Sea Freight Telemetry", "points": 32 },
      { "label": "Multi-Pillar IoT + SD-WAN Fit", "points": 25 }
    ],
    "whyNow": "Deploying automated parcel sortation mega-hubs in Pune and expanding cross-border air and ocean container tracking into Singapore and ASEAN.",
    "sourceTitle": "Delhivery Investor Filing: Cross-border logistics & automation capex",
    "sourceUrl": "https://www.delhivery.com/investor-relations",
    "likelyNeeds": ["Single-SKU cross-border IoT eSIMs", "Warehouse Private 5G slicing", "Multi-branch SD-WAN"],
    "recommendedBundle": {
      "bundleName": "Connected Corridor Logistics Suite",
      "products": ["SGT-IOT-01", "SGT-CONN-01", "SGT-CONN-03"],
      "estimatedArrSgd": 290000,
      "starterDownsellBundle": ["SGT-IOT-01", "SGT-CONN-01"],
      "starterArrSgd": 150000
    },
    "complianceFlags": ["INDIA_DPDP_ACT_2023", "SG_PDPA", "TEC_M2M_ESIM_RULES"],
    "complianceNote": "Indian DoT/TEC rules require eSIM bootstrap profiles on cross-border containers to switch automatically to a local Indian operator profile (Airtel) within 90 days.",
    "decisionMaker": {
      "role": "Chief Technology Officer / SVP Supply Chain Systems",
      "targetTitle": "CTO / Head of Connected Fleet",
      "entryRoute": "Partner Intro (Bridge Alliance IoT Desk)",
      "localPartnerNote": "Seamless domestic eSIM profile handoff between Airtel India and Singtel SG"
    },
    "nextAction": "Send Bridge Alliance Single-SKU eSIM compliance brief to CTO office; propose 60-day pilot on Pune-to-Singapore freight corridor.",
    "draftOutreach": "Subject: Eliminating cross-border eSIM roaming blocks on Delhivery's India-ASEAN freight lanes\n\nHi [Name],\n\nFollowing Delhivery's warehouse automation rollout in Pune and growing ASEAN freight volume, our logistics engineering team modeled how Singtel's Bridge Alliance Multi-Domestic eSIM and CUBE SD-WAN streamline container telemetry from Mumbai/Pune straight into Tuas Port.\n\nYou can preview the projected packet loss reduction and DoT M2M compliance architecture in the attached interactive sandbox. Would Tuesday work for a brief walkthrough?"
  },
  {
    "id": "lead-sarvam-in",
    "mode": "hunting",
    "companyName": "Sarvam AI",
    "hqCity": "Bengaluru",
    "corridor": "Bengaluru <-> Singapore DC Tuas",
    "industry": "Sovereign AI & Foundation Models",
    "coordinates": [12.9352, 77.6245],
    "priorityScore": 90,
    "scoreBreakdown": [
      { "label": "High-Density GPU Compute Demand", "points": 40 },
      { "label": "ASEAN Enterprise Model Deployment", "points": 30 },
      { "label": "Nxera + RE:AI Direct Fit", "points": 20 }
    ],
    "whyNow": "Scaling enterprise voice and multilingual LLM inference for Southeast Asian and Indian banking clients; requires low-latency sovereign GPU clusters without hyperscaler egress lock-in.",
    "sourceTitle": "TechCrunch / Public Press: Sarvam AI expands enterprise sovereign AI deployments",
    "sourceUrl": "https://www.sarvam.ai",
    "likelyNeeds": ["Sovereign NVIDIA H100/B200 GPUaaS", "High-density liquid-cooled colocation", "100Gbps burst interconnect"],
    "recommendedBundle": {
      "bundleName": "Sovereign AI Compute & Interconnect Pack",
      "products": ["SGT-INFRA-02", "SGT-INFRA-01", "SGT-CONN-02"],
      "estimatedArrSgd": 660000,
      "starterDownsellBundle": ["SGT-INFRA-02"],
      "starterArrSgd": 280000
    },
    "complianceFlags": ["INDIA_DPDP_ACT_2023", "SG_PDPA", "AI_MODEL_SOVEREIGNTY"],
    "complianceNote": "Model weights and enterprise fine-tuning datasets remain isolated inside Nxera Sovereign AI enclaves with zero public internet traversal.",
    "decisionMaker": {
      "role": "VP Infrastructure & Co-Founder",
      "targetTitle": "Head of AI Infrastructure",
      "entryRoute": "Warm Intro (NVIDIA Applied AI Centre of Excellence)",
      "localPartnerNote": "Direct 100G optical burst between Bengaluru partner nodes and Nxera DC Tuas"
    },
    "nextAction": "Offer 14-day RE:AI H100 cluster benchmark via Singtel Paragon; highlight 55% egress cost savings vs public cloud.",
    "draftOutreach": "Subject: Sovereign H100/B200 capacity on Singtel RE:AI for Sarvam's ASEAN enterprise deployments\n\nHi [Name],\n\nAs Sarvam AI scales enterprise LLM inference across India and Southeast Asia, Singtel Digital InfraCo can provide immediate sovereign GPU capacity at DC Tuas linked to Bengaluru via 100Gbps SD-Connect.\n\nWe put together a custom cost-and-latency comparison showing how RE:AI reduces cloud egress spend by 55% while satisfying enterprise data residency rules."
  },
  {
    "id": "lead-ather-in",
    "mode": "hunting",
    "companyName": "Ather Energy Limited",
    "hqCity": "Bengaluru",
    "corridor": "Bengaluru / Chennai <-> ASEAN",
    "industry": "EV Manufacturing & Connected Mobility",
    "coordinates": [13.0827, 80.2707],
    "priorityScore": 87,
    "scoreBreakdown": [
      { "label": "Connected EV Export Telemetry", "points": 34 },
      { "label": "Smart Factory 5G Automation", "points": 28 },
      { "label": "Bridge Alliance eSIM Synergy", "points": 25 }
    ],
    "whyNow": "Expanding connected two-wheeler EV exports and over-the-air (OTA) battery diagnostics across South and Southeast Asia alongside new factory lines.",
    "sourceTitle": "Autocar Pro: Ather Energy scales manufacturing and international export telemetry",
    "sourceUrl": "https://www.atherenergy.com/newsroom",
    "likelyNeeds": ["Multi-domestic OTA vehicle eSIMs", "Factory 5G network slicing", "Managed SASE security"],
    "recommendedBundle": {
      "bundleName": "Connected EV & Smart Plant Bundle",
      "products": ["SGT-IOT-01", "SGT-CONN-03", "SGT-CYBER-01"],
      "estimatedArrSgd": 380000,
      "starterDownsellBundle": ["SGT-IOT-01"],
      "starterArrSgd": 65000
    },
    "complianceFlags": ["INDIA_DPDP_ACT_2023", "ISO_21434_AUTO_CYBER"],
    "complianceNote": "Secures over-the-air vehicle firmware updates against man-in-the-middle interception across regional cellular networks.",
    "decisionMaker": {
      "role": "Head of Connected Vehicle Platform",
      "targetTitle": "VP Software & IoT Architecture",
      "entryRoute": "Warm Intro (Singtel Regional Automotive IoT Desk)",
      "localPartnerNote": "Single-pane SIM lifecycle management across Airtel, Singtel, AIS, and Telkomsel"
    },
    "nextAction": "Pitch Single-SKU Bridge Alliance eSIM platform to eliminate multi-country telco contract fragmentation.",
    "draftOutreach": "Subject: Single-SKU APAC eSIM orchestration for Ather Energy's connected EV exports\n\nHi [Name],\n\nWith Ather expanding connected vehicle deployments across APAC, managing separate telco integrations per market slows down OTA firmware delivery. Singtel's Global IoT platform unifies India, Singapore, Thailand, and Indonesia under one eSIM SKU and one API."
  },
  {
    "id": "lead-syngene-in",
    "mode": "hunting",
    "companyName": "Syngene International (Biocon Group)",
    "hqCity": "Bengaluru",
    "corridor": "Bengaluru <-> Singapore Biopolis",
    "industry": "Biotech R&D & Life Sciences",
    "coordinates": [12.8399, 77.6770],
    "priorityScore": 84,
    "scoreBreakdown": [
      { "label": "Cross-Border Genomic Data Sync", "points": 32 },
      { "label": "High-Security IP Protection", "points": 30 },
      { "label": "Cloud Egress Cost Optimization", "points": 22 }
    ],
    "whyNow": "Expanding contract biologics and AI drug-discovery collaboration with pharmaceutical research centers in Singapore Biopolis.",
    "sourceTitle": "Syngene Press Release: Global R&D digital infrastructure expansion",
    "sourceUrl": "https://www.syngeneintl.com/media/press-releases",
    "likelyNeeds": ["100Gbps scheduled burst interconnect", "Quantum-Safe clinical data encryption", "RE:AI bio-compute"],
    "recommendedBundle": {
      "bundleName": "Bio-R&D Sovereign Corridor Stack",
      "products": ["SGT-CONN-02", "SGT-CYBER-01", "SGT-INFRA-02"],
      "estimatedArrSgd": 410000,
      "starterDownsellBundle": ["SGT-CONN-02", "SGT-CYBER-01"],
      "starterArrSgd": 215000
    },
    "complianceFlags": ["INDIA_DPDP_ACT_2023", "SG_PDPA_HEALTHCARE", "HIPAA_GXP"],
    "complianceNote": "Genomic and clinical trial datasets are classified as sensitive personal data under India DPDP; requires encrypted point-to-point optical transport.",
    "decisionMaker": {
      "role": "Chief Information Officer",
      "targetTitle": "CIO / Head of Research Computing",
      "entryRoute": "Cold Executive Outreach (Backed by Biopolis Case Study)",
      "localPartnerNote": "Dedicated wavelength from Bengaluru campus to Singapore Biopolis"
    },
    "nextAction": "Share Biopolis-to-Bengaluru 100G SD-Connect ROI calculator showing sync times dropping from 11 hours to 16 minutes.",
    "draftOutreach": "Subject: Accelerating Syngene's Bengaluru-Singapore genomic data transfers with Singtel SD-Connect\n\nHi [Name],\n\nFor life-science teams syncing multi-terabyte cryo-EM and genomic datasets between Bengaluru and Singapore, public cloud egress is both slow and costly. Singtel's programmable SD-Connect lets your labs burst to 100Gbps on demand with Quantum-Safe encryption."
  },
  {
    "id": "lead-tata-elec-in",
    "mode": "hunting",
    "companyName": "Tata Electronics Pvt Ltd",
    "hqCity": "Mumbai",
    "corridor": "Mumbai / Hosur <-> Singapore Semiconductor Hub",
    "industry": "Semiconductor & Precision Manufacturing",
    "coordinates": [19.0760, 72.8777],
    "priorityScore": 89,
    "scoreBreakdown": [
      { "label": "New Outsourced Semiconductor Assembly (OSAT)", "points": 36 },
      { "label": "Zero-Trust IP Protection Requirement", "points": 31 },
      { "label": "NCS + Singtel Co-Sell Fit", "points": 22 }
    ],
    "whyNow": "Scaling semiconductor fabrication and assembly facilities in India with direct supply-chain and wafer-testing links to Singapore semiconductor partners.",
    "sourceTitle": "Tata Group Announcements: Semiconductor manufacturing & global supply chain links",
    "sourceUrl": "https://www.tata.com/newsroom",
    "likelyNeeds": ["Private 5G cleanroom slicing", "Quantum-Safe IP transfer network", "NCS supply chain cloud"],
    "recommendedBundle": {
      "bundleName": "Semiconductor Cleanroom & IP Shield Bundle",
      "products": ["SGT-CONN-03", "SGT-CYBER-01", "SGT-NCS-01"],
      "estimatedArrSgd": 465000,
      "starterDownsellBundle": ["SGT-CYBER-01", "SGT-CONN-01"],
      "starterArrSgd": 260000
    },
    "complianceFlags": ["SG_CII_CYBERSECURITY_ACT", "ISO_27001_SEMICON", "INDIA_CERT_IN"],
    "complianceNote": "Protects lithography mask files and yield telemetry against industrial espionage during cross-border transit.",
    "decisionMaker": {
      "role": "Chief Digital & Information Officer",
      "targetTitle": "CDIO / VP Manufacturing IT",
      "entryRoute": "Warm Intro (NCS Enterprise Manufacturing Practice)",
      "localPartnerNote": "Joint delivery via NCS India and Singtel Global India (Mumbai office)"
    },
    "nextAction": "Coordinate joint NCS + Singtel Cyber briefing on cleanroom Private 5G and Quantum-Safe IP links.",
    "draftOutreach": "Subject: Securing Tata Electronics' India-Singapore wafer telemetry and cleanroom automation\n\nHi [Name],\n\nAs Tata Electronics connects Indian semiconductor facilities with Singapore fabrication and testing partners, protecting CAD/mask IP in transit is mission-critical. Our joint Singtel and NCS team has designed a Quantum-Safe interconnect and Private 5G cleanroom blueprint tailored for your corridor."
  },
  {
    "id": "acct-lionrock-sg",
    "mode": "farming",
    "companyName": "LionRock Quantitative Bank",
    "hqCity": "Singapore",
    "corridor": "Singapore <-> Hong Kong <-> Mumbai",
    "industry": "High-Frequency Banking & Capital Markets",
    "coordinates": [1.2830, 103.8513],
    "priorityScore": 98,
    "currentArrSgd": 240000,
    "contractRenewalDays": 62,
    "ownedProducts": ["SGT-CONN-01"],
    "missingWhitespace": ["SGT-CONN-02", "SGT-CYBER-01", "SGT-API-01"],
    "telemetryAlerts": [
      {
        "id": "tel-01",
        "metric": "SG-HK-Mumbai Subsea Route Jitter",
        "currentValue": "4.2 ms micro-bursts at market open",
        "threshold": "< 1.5 ms SLA",
        "severity": "critical",
        "timestamp": "14 mins ago",
        "salesDivision": "Connectivity & Cyber Co-Sell"
      },
      {
        "id": "tel-02",
        "metric": "Roaming Executive SIM-Swap Attempts",
        "currentValue": "14 blocked anomalies in Mumbai/HK",
        "threshold": "0 tolerance (MAS TRM)",
        "severity": "high",
        "timestamp": "2 hours ago",
        "salesDivision": "Cyber & Quantum Desk"
      }
    ],
    "scoreBreakdown": [
      { "label": "Live Telemetry SLA Breach Risk", "points": 42 },
      { "label": "Contract Renewal in 62 Days", "points": 30 },
      { "label": "MAS Post-Quantum Advisory Mandate", "points": 26 }
    ],
    "whyNow": "Existing MPLS link hit 4.2ms micro-burst jitter during SGX-HKEX-NSE market open, while MAS and HKMA issued updated Post-Quantum Cryptography (PQC) guidelines for financial institutions.",
    "sourceTitle": "Internal CAMARA Telemetry Log #SGT-8821 + MAS Cyber Advisory 2026",
    "sourceUrl": "https://www.mas.gov.sg/regulation/guidelines/technology-risk-management",
    "likelyNeeds": ["100G Optical Gigawave ultra-low latency upgrade", "Quantum-Safe Network (QSN)", "Aduna SIM-Swap Banking API"],
    "recommendedBundle": {
      "bundleName": "Ultra-Low-Latency Quantum Banking Core",
      "products": ["SGT-CONN-02", "SGT-CYBER-01", "SGT-API-01"],
      "estimatedArrSgd": 425000,
      "starterDownsellBundle": ["SGT-CONN-02"],
      "starterArrSgd": 160000
    },
    "complianceFlags": ["SG_MAS_TRM", "HKMA_CYBER_RESILIENCE", "RBI_DATA_LOCALIZATION", "SG_CII_ACT"],
    "complianceNote": "Direct raw customer ledger sync between Mumbai and Singapore violates RBI localization unless routed via local edge breakout with MAS-compliant quantum-resistant encryption.",
    "decisionMaker": {
      "role": "Managing Director, Global Network & Trading Infrastructure",
      "targetTitle": "MD Trading Infrastructure / CISO",
      "entryRoute": "Existing Account Executive (62-Day Renewal Window)",
      "localPartnerNote": "Co-sell swarm triggered across Connectivity Desk and Cyber Quantum Desk"
    },
    "accountPlanSteps": [
      { "phase": "Immediate (Days 1-30)", "title": "Upgrade SG-HK-Mumbai route to Optical Gigawave + QSN Pilot", "arrImpact": "+$335,000 ARR" },
      { "phase": "Mid-Term (Months 2-4)", "title": "Integrate Aduna Federated SIM-Swap API into Mobile Banking App", "arrImpact": "+$90,000 ARR" },
      { "phase": "Long-Term (Months 6-12)", "title": "Deploy Sovereign Quantitative AI Risk Cluster on RE:AI DC Tuas", "arrImpact": "+$280,000 ARR" }
    ],
    "nextAction": "Trigger Co-Sell Deal Room with Cyber Desk; send interactive latency & PQC compliance sandbox ahead of Q3 renewal review.",
    "draftOutreach": "Subject: Proactive SLA review: Eliminating SG-HK-Mumbai market-open jitter + MAS PQC compliance\n\nHi [Name],\n\nOur proactive telemetry monitoring flagged 4.2ms micro-burst utilization peaks on your SG-HK-Mumbai trading link during market open this week. Ahead of your upcoming renewal in 62 days, our Connectivity and Quantum Security teams modeled an upgrade to Singtel Optical Gigawave paired with Quantum-Safe Network encryption.\n\nUse the interactive link below to inspect how this locks route latency under 1.1ms while satisfying both MAS TRM post-quantum guidelines and RBI localization rules."
  },
  {
    "id": "acct-straits-maritime-sg",
    "mode": "farming",
    "companyName": "Straits Vanguard Maritime Lines",
    "hqCity": "Singapore (Tuas Mega Port)",
    "corridor": "Tuas Port <-> Malacca Strait <-> Chennai",
    "industry": "Maritime Trade & Autonomous Shipping",
    "coordinates": [1.2941, 103.6350],
    "priorityScore": 95,
    "currentArrSgd": 180000,
    "contractRenewalDays": 45,
    "ownedProducts": ["SGT-CONN-01"],
    "missingWhitespace": ["SGT-CONN-04", "SGT-CONN-03", "SGT-IOT-01"],
    "telemetryAlerts": [
      {
        "id": "tel-03",
        "metric": "Fleet VSAT Bandwidth Saturation (Indian Ocean)",
        "currentValue": "94.2% sustained saturation (18% packet drop)",
        "threshold": "< 75% utilization",
        "severity": "critical",
        "timestamp": "6 mins ago",
        "salesDivision": "Connectivity & Mobility Desk"
      },
      {
        "id": "tel-04",
        "metric": "Reefer Container IoT Handoff Drops",
        "currentValue": "312 cold-chain alerts between Klang, Tuas, & Chennai",
        "threshold": "99.95% uptime SLA",
        "severity": "high",
        "timestamp": "41 mins ago",
        "salesDivision": "5G & IoT Desk"
      }
    ],
    "scoreBreakdown": [
      { "label": "94% VSAT Saturation on 12 Vessels", "points": 40 },
      { "label": "Tuas Port Autonomous Crane Sync Need", "points": 30 },
      { "label": "Cold-Chain Reefer Expansion", "points": 25 }
    ],
    "whyNow": "12 container vessels crossing the Bay of Bengal to Chennai hit 94% legacy VSAT saturation, causing delayed engine telemetry and reefer container temperature blindspots before docking at Tuas Port.",
    "sourceTitle": "Singtel Maritime Telemetry Stream #VSAT-904 + MPA Tuas Port Digitalization Brief",
    "sourceUrl": "https://www.mpa.gov.sg/maritime-singapore/port-of-the-future",
    "likelyNeeds": ["Singtel iSHIP + Starlink LEO Hybrid Switching", "Paragon 5G Port Slicing at Tuas", "Global IoT Multi-Domestic Reefer eSIM"],
    "recommendedBundle": {
      "bundleName": "Smart Maritime Fleet & Port 5G Suite",
      "products": ["SGT-CONN-04", "SGT-CONN-03", "SGT-IOT-01"],
      "estimatedArrSgd": 400000,
      "starterDownsellBundle": ["SGT-CONN-04"],
      "starterArrSgd": 195000
    },
    "complianceFlags": ["SG_CII_MARITIME_ACT", "IMO_MARITIME_CYBER_2026", "SG_PDPA"],
    "complianceNote": "IMO and Singapore Maritime CII directives require strict firewall air-gapping between crew welfare Wi-Fi and bridge/engine SCADA telemetry.",
    "decisionMaker": {
      "role": "VP Fleet Operations & Maritime IT",
      "targetTitle": "VP Fleet Digitalization",
      "entryRoute": "Existing Account Executive (Proactive Telemetry Alert)",
      "localPartnerNote": "Automatic shore handoff between Singtel 5G (Tuas) and Airtel 5G (Chennai Port)"
    },
    "accountPlanSteps": [
      { "phase": "Immediate (Days 1-30)", "title": "Activate Singtel iSHIP + Starlink LEO Hybrid on 12 Bay of Bengal Vessels", "arrImpact": "+$195,000 ARR" },
      { "phase": "Mid-Term (Months 2-4)", "title": "Enable Singtel Paragon 5G Shore Slicing at Tuas Mega Port", "arrImpact": "+$140,000 ARR" },
      { "phase": "Long-Term (Months 6-12)", "title": "Roll out 5,000 Bridge Alliance Multi-Domestic Reefer eSIMs", "arrImpact": "+$65,000 ARR" }
    ],
    "nextAction": "Send Fleet Director the interactive iSHIP Starlink LEO failover simulation showing 92% packet loss elimination across the Indian Ocean.",
    "draftOutreach": "Subject: Resolving Bay of Bengal VSAT congestion across your 12 Chennai-Tuas vessels\n\nHi [Name],\n\nOur maritime network telemetry shows 12 Straits Vanguard vessels operating between Chennai and Tuas Port hit 94% VSAT saturation this week. By upgrading your existing link to Singtel iSHIP with managed Starlink LEO hybrid switching and Tuas 5G shore slicing, you can increase ship-to-shore throughput by 12x while keeping bridge SCADA traffic air-gapped under IMO cyber rules."
  },
  {
    "id": "acct-aeropulse-sg",
    "mode": "farming",
    "companyName": "AeroPulse Aviation & Cargo Hub",
    "hqCity": "Singapore (Changi Airfreight Centre)",
    "corridor": "Changi SG <-> Johor SEZ <-> Bengaluru",
    "industry": "Aviation MRO & Cross-Border Air Cargo",
    "coordinates": [1.3644, 103.9915],
    "priorityScore": 91,
    "currentArrSgd": 150000,
    "contractRenewalDays": 88,
    "ownedProducts": ["SGT-CONN-01"],
    "missingWhitespace": ["SGT-CONN-03", "SGT-IOT-01", "SGT-INFRA-01"],
    "telemetryAlerts": [
      {
        "id": "tel-05",
        "metric": "Changi Apron Turnaround Data Offload Congestion",
        "currentValue": "89% cellular congestion during 25-min aircraft turnaround",
        "threshold": "Full 1.2 TB engine log offload < 15 mins",
        "severity": "high",
        "timestamp": "28 mins ago",
        "salesDivision": "5G & Edge Desk"
      }
    ],
    "scoreBreakdown": [
      { "label": "Apron Bandwidth Bottleneck at Changi", "points": 38 },
      { "label": "New Johor-Singapore SEZ Cargo Warehouse", "points": 31 },
      { "label": "Multi-Domestic Cold-Chain Pharma Tracking", "points": 22 }
    ],
    "whyNow": "Aircraft maintenance (MRO) sensor offload at Changi is bottlenecked during 25-minute gate turnarounds, while AeroPulse just leased a new bonded logistics facility in the Johor-Singapore Special Economic Zone (JS-SEZ).",
    "sourceTitle": "Internal 5G Cell Telemetry #CHG-441 + JS-SEZ Industrial Lease Registry",
    "sourceUrl": "https://www.edb.gov.sg",
    "likelyNeeds": ["Singtel Paragon Private 5G Apron Slicing", "Johor-SG Cross-Border SD-WAN + Nxera Edge", "Multi-Domestic Cargo Tracker eSIMs"],
    "recommendedBundle": {
      "bundleName": "Aviation 5G Apron & JS-SEZ Corridor Bundle",
      "products": ["SGT-CONN-03", "SGT-IOT-01", "SGT-INFRA-01"],
      "estimatedArrSgd": 425000,
      "starterDownsellBundle": ["SGT-CONN-03", "SGT-IOT-01"],
      "starterArrSgd": 205000
    },
    "complianceFlags": ["CAAS_AVIATION_CII", "SG_PDPA", "MY_PDPA_2024"],
    "complianceNote": "Aircraft flight-recorder and engine diagnostics fall under aviation critical infrastructure protection; requires dedicated 5G slice isolation.",
    "decisionMaker": {
      "role": "Chief Operating Officer & Head of Digital Cargo",
      "targetTitle": "COO / VP Airport Engineering",
      "entryRoute": "Existing Account Executive",
      "localPartnerNote": "Seamless TM-Nxera Johor node and CelcomDigi/Maxis cross-border handoff"
    },
    "accountPlanSteps": [
      { "phase": "Immediate (Days 1-30)", "title": "Deploy Paragon 5G Dedicated Apron Slice at Changi Airfreight Hub", "arrImpact": "+$140,000 ARR" },
      { "phase": "Mid-Term (Months 2-4)", "title": "Connect New Johor SEZ Bonded Warehouse with Multi-Domestic eSIMs", "arrImpact": "+$65,000 ARR" },
      { "phase": "Long-Term (Months 6-12)", "title": "Host Predictive Engine MRO Digital Twin at TM-Nxera Johor Campus", "arrImpact": "+$220,000 ARR" }
    ],
    "nextAction": "Demonstrate Paragon 5G Apron Slice reducing aircraft engine telemetry offload from 28 minutes to 4 minutes.",
    "draftOutreach": "Subject: Cutting Changi aircraft telemetry offload times by 85% + Johor SEZ warehouse connectivity\n\nHi [Name],\n\nWe noticed cellular uplink congestion during AeroPulse's peak aircraft turnaround windows at Changi alongside your new bonded warehouse expansion in Johor. Using Singtel Paragon's dedicated 5G apron slicing, your MRO crews can offload 1.2TB of engine sensor logs in under 4 minutes."
  },
  {
    "id": "acct-helixveda-sg",
    "mode": "farming",
    "companyName": "HelixVeda Bio-AI Labs",
    "hqCity": "Singapore (One-North Biopolis)",
    "corridor": "Singapore Biopolis <-> Bengaluru <-> Johor",
    "industry": "AI Drug Discovery & Clinical Genomics",
    "coordinates": [1.2996, 103.7873],
    "priorityScore": 93,
    "currentArrSgd": 110000,
    "contractRenewalDays": 51,
    "ownedProducts": ["SGT-CONN-01"],
    "missingWhitespace": ["SGT-INFRA-02", "SGT-CONN-02", "SGT-CYBER-01"],
    "telemetryAlerts": [
      {
        "id": "tel-06",
        "metric": "Recurring Friday Night Public Cloud Egress Spike",
        "currentValue": "48 TB/week burst (96% link saturation for 14 hrs)",
        "threshold": "< 2 hrs sync window",
        "severity": "critical",
        "timestamp": "19 mins ago",
        "salesDivision": "Digital InfraCo & AI Cloud Desk"
      }
    ],
    "scoreBreakdown": [
      { "label": "48TB Weekly Cloud Egress Bottleneck", "points": 39 },
      { "label": "15 New ML Researchers Hired in Bengaluru", "points": 31 },
      { "label": "Sovereign Patient Genomic Compliance", "points": 23 }
    ],
    "whyNow": "Every Friday night, HelixVeda saturates its 1Gbps line for 14 hours syncing protein-folding checkpoints between Singapore and Bengaluru while paying exorbitant AWS public internet egress fees.",
    "sourceTitle": "Singtel NetFlow Anomaly #BIO-712 + LinkedIn Hiring Signal (15 ML Roles in Bengaluru)",
    "sourceUrl": "https://www.a-star.edu.sg",
    "likelyNeeds": ["RE:AI Sovereign GPU-as-a-Service", "100Gbps SD-Connect Programmable Interconnect", "Quantum-Safe Genomic Encryption"],
    "recommendedBundle": {
      "bundleName": "Sovereign Bio-AI Compute & 100G Interconnect",
      "products": ["SGT-INFRA-02", "SGT-CONN-02", "SGT-CYBER-01"],
      "estimatedArrSgd": 615000,
      "starterDownsellBundle": ["SGT-CONN-02"],
      "starterArrSgd": 160000
    },
    "complianceFlags": ["SG_PDPA_HEALTHCARE", "INDIA_DPDP_ACT_2023", "MOH_HCSA_SECURITY"],
    "complianceNote": "Eliminates public internet exposure of clinical genomic sequences between Indian trial hospitals and Singapore Biopolis.",
    "decisionMaker": {
      "role": "Chief AI Scientist & VP Platform Engineering",
      "targetTitle": "CTO / Head of Bio-Compute",
      "entryRoute": "Existing Account Executive + Digital InfraCo Specialist",
      "localPartnerNote": "Direct optical path from Biopolis to Nxera DC Tuas and Bengaluru R&D center"
    },
    "accountPlanSteps": [
      { "phase": "Immediate (Days 1-30)", "title": "Replace Public Cloud Egress with 100Gbps Burstable SD-Connect", "arrImpact": "+$160,000 ARR" },
      { "phase": "Mid-Term (Months 2-4)", "title": "Migrate Protein-Folding Training to Singtel RE:AI H100 Cluster", "arrImpact": "+$280,000 ARR" },
      { "phase": "Long-Term (Months 6-12)", "title": "Attach Quantum-Safe Network Encryption for Phase-3 Clinical Trials", "arrImpact": "+$175,000 ARR" }
    ],
    "nextAction": "Share the RE:AI + 100G SD-Connect ROI portal showing Friday model sync times dropping from 14 hours to 18 minutes with 58% lower compute cost.",
    "draftOutreach": "Subject: Cutting HelixVeda's Friday night Bengaluru-Singapore model sync from 14 hours to 18 minutes\n\nHi [Name],\n\nOur network analytics team noticed your Biopolis-to-Bengaluru link hits 96% utilization for 14 hours every Friday night during model checkpoint transfers. By moving those training runs to Singtel RE:AI (GPUaaS at DC Tuas) paired with on-demand 100Gbps SD-Connect bursts, you can cut sync times to 18 minutes and reduce cloud egress costs by 58%."
  }
]
```

---

## PART 5: PRE-RECORDED CALL ASSIST TRANSCRIPT (`src/data/call_transcript.json`)

To make the **Call Assist** screen 100% reliable on stage without live microphone failures, build an interactive transcript playback engine that steps through these 5 realistic conversation turns and pops up real-time SingTech AI Co-Sell cards:

```json
[
  {
    "id": "turn-1",
    "timestamp": "00:12",
    "speaker": "Customer (Vikram Mehta, VP Infrastructure at AeroPulse Cargo)",
    "text": "Thanks for jumping on. Look, our current Singapore domestic fibre and MPLS setup works fine for head office, but our regional footprint is changing fast in Q3.",
    "detectedSignal": null
  },
  {
    "id": "turn-2",
    "timestamp": "00:34",
    "speaker": "Customer (Vikram Mehta, VP Infrastructure at AeroPulse Cargo)",
    "text": "We are opening a 180-person cargo engineering and logistics coordination center in Pune next month, plus a bonded cold-chain warehouse in Johor Bahru, and latency back to our Changi servers is already worrying my team.",
    "detectedSignal": {
      "badge": "CROSS-BORDER EXPANSION DETECTED",
      "trigger": "New Pune (India) office + Johor warehouse expansion with Changi latency sensitivity",
      "recommendedProducts": ["Singtel CUBE SD-WAN (SG-India-Johor)", "Global IoT Multi-Domestic eSIM"],
      "complianceAlert": "Flag India DPDP Act (2023) & Malaysia PDPA (2024) cross-border logistics data rules.",
      "estimatedUplift": "+$150,000 ARR",
      "suggestedTalkTrack": "Ask if their Pune and Johor branches require local internet breakout or centralized inspection at Changi; position Singtel CUBE SD-WAN with Airtel India last-mile redundancy."
    }
  },
  {
    "id": "turn-3",
    "timestamp": "01:08",
    "speaker": "Singtel AE (Sarah Tan)",
    "text": "Congratulations on the Pune and Johor expansion, Vikram. How are you currently handling the aircraft sensor offload at Changi when those regional cargo flights turn around?",
    "detectedSignal": null
  },
  {
    "id": "turn-4",
    "timestamp": "01:29",
    "speaker": "Customer (Vikram Mehta, VP Infrastructure at AeroPulse Cargo)",
    "text": "Honestly, that is our biggest headache right now. We only have 25 minutes on the tarmac, and offloading 1.2 terabytes of engine telemetry over congested airport cellular keeps timing out.",
    "detectedSignal": {
      "badge": "HIGH-MARGIN 5G SLICING TRIGGER",
      "trigger": "1.2 TB tarmac aircraft offload bottleneck during 25-minute turnaround window",
      "recommendedProducts": ["Singtel Paragon Private 5G Apron Slicing", "Nxera Edge Compute Node"],
      "complianceAlert": "Satisfies CAAS Aviation Critical Information Infrastructure (CII) network isolation.",
      "estimatedUplift": "+$275,000 ARR",
      "suggestedTalkTrack": "Pitch Singtel Paragon 5G dedicated apron slice at Changi; lowers 1.2TB offload time from 28 minutes to under 4 minutes with guaranteed SLA."
    }
  },
  {
    "id": "turn-5",
    "timestamp": "02:02",
    "speaker": "Customer (Vikram Mehta, VP Infrastructure at AeroPulse Cargo)",
    "text": "If you can get that tarmac offload under 5 minutes and bundle the Pune and Johor links into one compliant contract, send me the architecture and pricing model today.",
    "detectedSignal": {
      "badge": "BUYING SIGNAL: GENERATE PROPOSAL",
      "trigger": "Customer requested unified architecture and ROI model for Changi 5G + Pune/Johor SD-WAN",
      "recommendedProducts": ["Full Aviation 5G Apron & Corridor Co-Sell Bundle"],
      "complianceAlert": "Attach CAAS CII + India DPDP compliance certificate to Customer Micro-Portal.",
      "estimatedUplift": "+$425,000 Total Bundle ARR",
      "suggestedTalkTrack": "Click [Generate Customer ROI Micro-Portal & Push to CRM] to dispatch the interactive topology sandbox immediately."
    }
  }
]
```

---

## PART 6: FRONTEND ARCHITECTURE & UI SPECIFICATION

### 6.1 Global App Shell (Desktop Sidebar + Topbar + Mobile Drawer)
Build a unified, high-density layout in `src/app/layout.tsx` and `src/components/AppShell.tsx`:

1. **Left Navigation Sidebar (`240px` fixed on Desktop, slide-over drawer on Mobile `< 1024px`):**
   * **Brand Header:** Crisp geometric Singtel-inspired red square mark (`#E60012`) + `SINGTECH` in bold tracking + subtitle `ENTERPRISE REVENUE ENGINE`.
   * **Primary Navigation Links (with active `#E60012` left indicator bar and keyboard shortcut badges):**
     1. `Market Explorer` (Subtitle: `India & APAC Hunting`)
     2. `Account View` (Subtitle: `CRM & Telemetry Farming`)
     3. `Call Assist` (Subtitle: `Live Transcript Co-Pilot`)
     4. `Customer ROI Portal` (Subtitle: `Client-Facing Sandbox`)
     5. `Impact & Pilot Plan` (Subtitle: `Metrics & Rollout`)
   * **Bottom System Status Card (Inside Sidebar):**
     * `PII Redaction Gate: ACTIVE (Local Mac)`
     * `Data Source: Offline-Safe Cache + Live Claude`
     * `Mesh Security: Tailscale WireGuard Verified`

2. **Sticky Topbar (`56px` height):**
   * **Left:** Mobile Hamburger Menu trigger (visible `< 1024px`) + Breadcrumb showing active view and corridor filter (`Corridor: Singapore <-> India / APAC`).
   * **Center (The "One-Singtel" Co-Sell Desk Switcher):** A segmented control allowing the user or judge to filter recommendations dynamically by sales division:
     * `All Desks (Unified Co-Sell)`
     * `Connectivity & 5G`
     * `Digital InfraCo (Nxera & RE:AI)`
     * `Cyber & Quantum`
   * **Right:**
     * `Simulate Live Telemetry Event` button (Singtel Red outline button that injects a live bandwidth/roaming alert with a smooth toast banner and recalculates priority scores).
     * `Privacy Audit Log` button (Opens modal showing raw CRM input vs. PII-redacted payload sent to Claude).

### 6.2 Screen-by-Screen Functional Spec

#### Screen 1: `Market Explorer` (Hunting New Customers in India & Corridors)
* **Top Filter Strip:**
  * Corridor Selector: `All Corridors`, `Bengaluru <-> Singapore`, `Mumbai / Pune <-> Singapore`, `Chennai <-> Tuas Port`.
  * Industry Selector: `All Industries`, `FinTech & Banking`, `Logistics & Maritime`, `Sovereign AI & Biotech`, `Semiconductor & EV Manufacturing`.
  * Search input + `Analyze Live Company URL` input (uses Firecrawl/Claude when online, or falls back smoothly).
* **Main Split Workspace (Responsive 12-column grid):**
  * **Left 7 Columns:**
    * **Interactive Corridor Map (`react-leaflet` dynamically imported with `ssr: false`):** Dark-mode CartoDB Positron/DarkMatter tiles showing glowing `#E60012` markers in Bengaluru, Mumbai, Pune, Chennai, Johor, and Singapore, with dashed corridor lines linking them to Singapore. Clicking any pin opens the Lead Card.
    * **Ranked Leads Data Table (Below Map):** High-density enterprise table sorting leads by `Priority Score (0-100)` with columns for `Company & Corridor`, `Primary Why Now Signal`, `Matched Singtel Bundle`, `Est. ARR (SGD)`, `Warm Entry Route`, and `Action`.
  * **Right 5 Columns:**
    * **Selected Lead Card Drawer** (or **India & Corridor Regulatory Brief Panel** when no lead is selected, detailing **India DPDP Act 2023**, **RBI Data Localization**, **DoT M2M eSIM rules**, and **Bharti Airtel / Bridge Alliance** local delivery context).

#### Screen 2: `Lead Card` Inspection Panel (Actionable Sales Playbook)
When a lead or account is clicked, render a structured, scannable panel containing:
1. **Header:** Company Name, HQ City, Corridor badge, and a large tabular **Priority Score Badge (`96 / 100`)** with a hover/inline breakdown of the score points.
2. **Verified "Why Now" Signal Box:** Displays the exact trigger and a mandatory clickable **Verified Source Link** (`[Source: Economic Times Tech ->]`).
3. **Recommended Singtel Multi-Pillar Bundle:**
   * Displays the bundle title, individual Singtel product tags (`SD-Connect 100G`, `Quantum-Safe Network`, `Aduna SIM-Swap API`), and projected Annual Recurring Revenue (`SGD $425,000 / yr`).
   * **Closed-Loop Feedback & Objection Handler:** Three interactive buttons:
     * `[Mark Qualified]` (Increments pipeline counter)
     * `[Objection: Budget Cap -> Auto-Downsell]` (Dynamically switches the pitch on screen from the full $425k bundle to the $175k Starter Bundle without losing the deal)
     * `[Snooze to Q3 Renewal]`
4. **Regulatory & Data Sovereignty Guardrail Box:** Highlights the exact laws triggered (`INDIA_DPDP_ACT`, `RBI_LOCALIZATION`, `SG_MAS_TRM`) and explains how the Singtel bundle solves the legal bottleneck.
5. **Who to Contact & Entry Route:** Shows target executive role (`CISO / SVP Infrastructure`), warm entry path (`Warm Intro via Existing Singtel Partner`), and local delivery note.
6. **Ready-to-Send Outreach Message & Primary CTAs:**
   * Editable textarea containing the personalized email draft (zero emojis, zero em dashes).
   * Button 1 (Primary Singtel Red `#E60012`): **`Dispatch Deal to Slack & Zoho CRM`** (Calls `/api/webhook/crm` and displays a verified webhook delivery receipt with timestamp).
   * Button 2 (Dark Carbon Outline): **`Open Customer-Facing ROI Portal`** (Switches to `/proposal/[id]` or opens the interactive client sandbox).

#### Screen 3: `Account View` (Farming Existing Customers + Network Telemetry)
* **Portfolio KPI Header:** Total Managed ARR (`SGD $680,000`), Identified Expansion Whitespace (`+SGD $1,865,000 ARR`), Active Telemetry Triggers (`6 Critical`).
* **Owns vs. Missing Whitespace Matrix:**
  * Rows: Flagship existing accounts (*LionRock Quant Bank*, *Straits Vanguard Maritime*, *AeroPulse Cargo*, *HelixVeda Bio-AI*).
  * Columns: The 5 Singtel Pillars (`Core Connectivity`, `5G & Edge Slicing`, `Maritime/IoT`, `Nxera & RE:AI Cloud`, `Cyber & Quantum`).
  * Cells show either `OWNED (Active Contract)` in muted green or `WHITESPACE OPPORTUNITY (+ARR)` in highlighted Singtel Red. Clicking any account loads its **Live Telemetry Stream** and **6-to-12 Month Account Expansion Roadmap**.

#### Screen 4: `Customer ROI Micro-Portal` (Hitting the "Actions for Customers" Constraint)
* Accessible via the sidebar or directly from any Lead/Account card.
* Renders a clean, executive-ready **Client Co-Engineering Sandbox** designed to be shared with the customer's CTO or CISO:
  * **Interactive "Before vs. After" Architecture Comparison:** Compares the customer's current bottleneck (for example, *94% VSAT saturation / 14-hour Friday cloud egress / 4.2ms trading jitter*) against the proposed Singtel target state.
  * **Interactive Capacity & Commitment Slider:** Lets the customer adjust bandwidth/GPU burst capacity (`10 Gbps` to `100 Gbps` or `8x H100` to `64x H100`) and dynamically calculates:
    * Projected Latency / Transfer Time Reduction (`-88%`)
    * Annual Cloud Egress / Downtime Cost Savings (`SGD $310,000 saved/yr`)
    * Compliance Frameworks Cleared (`MAS TRM`, `India DPDP Act`, `SG CII Act`)
  * **Customer Self-Service CTA:** **`Request 14-Day Singtel Paragon Sandbox Pilot`** (Generates an instant pilot provisioning ticket ID).

#### Screen 5: `Call Assist` & `Impact Dashboard`
* **Call Assist Tab:** Interactive playback of `call_transcript.json` with `Play / Next Turn / Reset` controls. As each transcript turn appears on the left, SingTech AI highlights trigger keywords in red and pops up live Co-Sell Battlecards on the right.
* **Impact & Pilot Rollout Tab:**
  * Displays Singtel's 3 core judging metrics: **Qualified Opportunities Generated (+340%)**, **Sales Cycle Conversion Uplift (+28%)**, and **Average Deal Size Expansion (2.4x via Multi-Pillar Bundling)**.
  * Displays the **3-Phase Enterprise Pilot & Scaling Blueprint** (Phase 1: 30-Day Read-Only Shadow Mode in SG -> Phase 2: Human-in-the-Loop Co-Sell on SG-India Corridor -> Phase 3: APAC Federation across Airtel, Optus, AIS, and Telkomsel).

---

## PART 7: BACKEND, SECURITY & LOCAL SETUP COMMANDS

### 7.1 Rapid MacBook Initialization
Run these commands to bootstrap the application cleanly on macOS:

```bash
# 1. Initialize Next.js (TypeScript + Tailwind + App Router)
npx create-next-app@latest singtech --typescript --tailwind --eslint --app --src-dir --use-pnpm
cd singtech

# 2. Install UI Icons, Interactive Maps, Charts, and AI SDKs
pnpm add lucide-react leaflet react-leaflet @anthropic-ai/sdk @supabase/supabase-js
pnpm add -D @types/leaflet

# 3. Optional: Install Meta Astryx packages if Node 22+ is active
pnpm add @astryxdesign/core @astryxdesign/theme-neutral @stylexjs/stylex || true
```

### 7.2 Local Edge PII-Redaction Engine (`src/lib/pii-redactor.ts`)
Every API call to `/api/analyze` or `/api/webhook/crm` must pass through this deterministic privacy gate first, and its output must be viewable inside the Topbar's **Privacy Audit Log Modal**:

```typescript
export interface PiiAuditRecord {
  id: string;
  timestamp: string;
  rawSnippet: string;
  sanitizedSnippet: string;
  redactedEntities: number;
  enforcedPolicies: string[];
}

export function sanitizeEnterprisePayload(rawInput: string): {
  sanitizedText: string;
  redactedCount: number;
  policies: string[];
} {
  let redactedCount = 0;
  const maskMatch = (input: string, pattern: RegExp, replacement: string) =>
    input.replace(pattern, () => {
      redactedCount += 1;
      return replacement;
    });

  let output = rawInput;
  output = maskMatch(output, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL_PDPA]");
  output = maskMatch(output, /(\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g, "[REDACTED_PHONE_DPDP]");
  output = maskMatch(output, /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IPV4_CII]");
  output = maskMatch(output, /SGT-ACC-\d{4,10}/g, "[HASHED_CRM_ID]");

  return {
    sanitizedText: output,
    redactedCount,
    policies: ["SG_PDPA_COMPLIANT", "INDIA_DPDP_2023_SAFE", "ZERO_RAW_PII_EGRESS"],
  };
}
```

### 7.3 API Routes to Implement (`src/app/api/`)
1. **`POST /api/analyze-company/route.ts`:**
   * Accepts `{ companyName, websiteUrl, corridor }`.
   * Runs `sanitizeEnterprisePayload()` on the input.
   * If `ANTHROPIC_API_KEY` is configured in `.env.local`, queries Claude (`claude-sonnet-4-20250514` or `claude-3-5-sonnet-latest`) with the Singtel 10-product catalog to synthesize a structured Lead Card JSON.
   * **Stage-Safe Fallback:** If offline or if no API key is present, deterministically synthesizes a rich, realistic Singtel Lead Card in `< 120ms` using the local signal-to-bundle engine so the demo never errors on stage.
2. **`POST /api/webhook/crm/route.ts`:**
   * Accepts `{ companyName, corridor, bundleName, estimatedArrSgd, nextAction, complianceFlags }`.
   * If `SLACK_WEBHOOK_URL` or `ZOHO_WEBHOOK_URL` is set in `.env.local`, dispatches a formatted payload directly to Slack/Zoho CRM.
   * Always returns a structured receipt `{ status: "DELIVERED", ticketId: "SGT-DEAL-...", timestamp, channel: "#singtel-india-cosell" }` that renders in the UI activity log.

---

## PART 8: IMMEDIATE PROMPT FOR CLAUDE CODE (COPY & RUN)

Once you place this `STARTHere.md` file in your project folder, start Claude Code and give it this single instruction:

> "Read `STARTHere.md` completely. Follow the `everything-claude-code` workflow in Part 2 (`[THINK & RESEARCH]` -> `[PLAN]` -> `[EXECUTE IN SLICES]` -> `[VERIFY & HARDEN]`). Enforce Part 1 strictly: zero emojis, zero em dashes, Singtel Red (`#E60012`) and Carbon Black (`#0A0A0C`) high-contrast enterprise aesthetic, and full mobile + desktop responsiveness. Build the complete SingTech Next.js application with all 10 pre-cached companies, the interactive India-Singapore corridor map, the Role-Based Sales Division Switcher, the Account View Whitespace & Telemetry simulator, the Call Assist transcript player, the Customer ROI Micro-Portal, and the Local PII Redaction audit modal. Verify that `npm run build` succeeds with zero errors."