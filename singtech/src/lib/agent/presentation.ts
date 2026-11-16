import { agentTarget, planCommand, type AgentPlan, type AgentStep, type Directory, type Target } from "./plan";

// The 5-minute judge walkthrough: six steps, each with a page, a spotlight callout and, from step 4, live work by the agent.
export interface PresentationStep {
  title: string;
  seconds: number;
  href?: string;
  target?: Target;
  callout: string;
  plan?: AgentPlan;
  // Opens outside the workspace (the public deal room) at the end of the step.
  link?: { href: string; label: string };
}

export const PRESENTATION_SECONDS = 300;

export function presentationSteps(dir: Directory): PresentationStep[] {
  const askSteps: AgentStep[] = [
    { kind: "type", target: { css: '[data-agent="ask-panel"] input' }, text: "Why is SGT-INV-2026-8841 disputed and what is the next step?", label: "Ask about the disputed bill" },
    { kind: "click", target: { css: '[data-agent="ask-panel"] button', text: "Ask" }, label: "Run the GPU search" },
    { kind: "waitIdle", target: agentTarget("ask-panel"), label: "Streaming the cited answer" },
    { kind: "highlight", target: agentTarget("ask-panel"), label: "Root cause, next actions, sources" },
  ];
  return [
    {
      title: "The problem",
      seconds: 45,
      href: "/dashboard",
      target: agentTarget("retention"),
      callout:
        "Singtel Enterprise reps juggle Salesforce, SAP and Oracle billing exports and scattered news. A billing dispute missed today becomes a lost renewal next year. SingTech starts with retention: every customer scored for health, with the revenue at stake and one next best action.",
    },
    {
      title: "Live triggers, routed right",
      seconds: 45,
      href: "/accounts/prospects",
      target: agentTarget("news-ticker"),
      callout:
        "Live APAC and India triggers, such as Bengaluru logistics and manufacturing firms moving into Singapore, are matched to the catalogue. MNCs present in both markets route to Singtel Enterprise or NCS multi-LOB.",
    },
    {
      title: "One account, the whole picture",
      seconds: 50,
      href: "/accounts/acct-meridian-sg",
      target: agentTarget("account-health"),
      callout:
        "Meridian Arcwell scores 27 of 100: a P1 outage, a bill disputed after the SAP-to-Oracle move, StarHub undercutting and an NTT tender. Every reason links to its record, and the next best action is a service recovery plan, not a discount.",
    },
    {
      title: "Cited answers in seconds",
      seconds: 45,
      href: "/accounts/acct-meridian-sg",
      target: agentTarget("ask-panel"),
      callout: "Answers stream from Singtel's own GPU in one to three seconds, cited to the invoice, the meeting minutes and the playbook. Personal data is redacted first.",
      plan: { title: "Ask about the disputed bill", intent: "workflow", steps: askSteps, accounts: [{ id: "acct-meridian-sg", name: "Meridian Arcwell Group" }] },
    },
    {
      title: "Agentic workflow",
      seconds: 60,
      callout: "One instruction: open LionRock, check its MEDDPICC gaps and draft the proposal. The cursor shows every step it takes.",
      plan: planCommand("Open LionRock Quantitative Bank, check its MEDDPICC gaps, and draft a proposal", dir),
    },
    {
      title: "Approve, then sync to Salesforce",
      seconds: 55,
      callout:
        "Nothing leaves without approval. Approve, and SingTech AI updates the Account and the Opportunity next step and posts to the Chatter deal room under its own Salesforce user. Judges can ask it questions there too.",
      plan: planCommand("Check SGT-INV-2026-8841 and push an update to Salesforce", dir),
      link: { href: "/deal-room", label: "Open Live Deal Room" },
    },
  ];
}
