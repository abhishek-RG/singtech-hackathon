# Optus Suffers 14-Hour Nationwide Outage: Millions Disconnected, Train Systems Halted, CEO Resigns Amid Mass Churn

**Source:** Australian Financial Review / ABC News Australia / Reuters  
**Date:** 8 November 2023 (Incident) / November 2023 Follow-up  
**Keywords:** Optus, Singtel, Outage, Kelly Bayer Rosmarin, Churn, Australia, BGP, Network Blackout  

---

## Article Summary
On **8 November 2023**, **Optus**, Australia's second-largest telecommunications carrier and wholly owned subsidiary of Singtel, suffered a catastrophic **14-hour nationwide network blackout**. 

Commencing at 4:05 AM AEDT, the outage knocked out mobile, fixed broadband, and enterprise business communications for approximately **10.2 million individuals and over 400,000 corporate enterprises and government agencies** across Australia. Coming just 14 months after a massive cyberattack compromised the personal data of 9.8 million Optus customers, the outage ignited public outrage, severe regulatory scrutiny, and the resignation of Chief Executive Officer **Kelly Bayer Rosmarin**.

---

## The Collapse: Timeline & Societal Disruption

```mermaid
timeline
    title 8 November 2023 Optus Outage Timeline
    04:05 AM : Unfiltered BGP routing changes received from parent Singtel exchange
    04:15 AM : Core Optus routers fail safety checks and disconnect to protect network
    06:00 AM : Morning rush hour: Melbourne Metro train network paralyzed (loss of telemetry)
    08:30 AM : Hospital phone lines down; EFTPOS payment terminals fail nationwide
    11:00 AM : Small businesses lose tens of millions in retail and cafe transactions
    05:30 PM : Services gradually restored after manual on-site physical reboots
    20 Nov 2023 : Under intense public and parliamentary pressure, CEO Kelly Bayer Rosmarin resigns
```

### 1. Societal & Commercial Chaos
* **Public Transport Paralyzed:** The entire Melbourne train communications network collapsed for over an hour during the early morning rush, stranding hundreds of thousands of commuters because trains could not establish safety telemetry with train control centres.
* **Emergency & Healthcare Crisis:** Triple Zero (000) emergency calls from Optus mobile phones failed, and hospital hotlines and blood transfusion centres were unreachable.
* **Small Business & Retail Losses:** Over 400,000 businesses lost payment processing capabilities as EFTPOS terminals went offline, costing the Australian retail and hospitality economy tens of millions of dollars.

---

## Technical Root Cause: Routing Table Overload
Investigations revealed that the collapse was triggered by an automatic software update from an international telecommunications exchange (Singtel Internet Exchange - SingIX):
1. **Unfiltered BGP Routing Prefix Surge:** The international transit exchange transmitted unexpected Border Gateway Protocol (BGP) routing route updates to Optus core routers without adequate route filtering.
2. **Defensive Disconnection:** The influx of unexpected routing instructions caused core Optus IP routers to exceed their preset memory and safety parameters. To protect the integrity of the routing hardware, the routers automatically disconnected themselves from the national routing mesh.
3. **Manual Physical Reboots Required:** Because remote network access tools also ran on the collapsed network, Optus engineers had to physically dispatch personnel to data centers across multiple Australian capital cities to manually power-cycle core routers.

---

## Enterprise Defections & Commercial Damage for Singtel
The twin disasters (2022 cyber breach + 2023 blackout) inflicted severe financial and brand damage on Singtel:
* **Executive Fallout:** Optus CEO **Kelly Bayer Rosmarin** resigned on 20 November 2023 following grueling federal parliamentary hearings.
* **Massive Enterprise Churn to Telstra:** Thousands of enterprise fleets, government procurement contracts, and mid-market accounts abandoned Optus for market leader **Telstra** and **TPG Telecom**, unwilling to tolerate high operational risk.
* **Financial Penalties & Compensation:** Singtel booked substantial direct cash compensation costs, free data compensations, and lost enterprise revenue, highlighting the catastrophic commercial cost of inadequate network resilience.
