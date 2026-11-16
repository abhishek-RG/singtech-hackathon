import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../../middleware/errorHandler.js';
import { demoAccounts, sharedKnowledgeDocuments } from './demo-data.js';

const localDataDirectory = fileURLToPath(new URL('../../../.local-data/', import.meta.url));
const localInteractionsFile = fileURLToPath(
  new URL('../../../.local-data/interactions.json', import.meta.url),
);
const localUploadsDirectory = fileURLToPath(
  new URL('../../../.local-data/uploads/', import.meta.url),
);
const localOrganizationsFile = fileURLToPath(
  new URL('../../../.local-data/organizations.json', import.meta.url),
);

function loadLocalInteractions() {
  if (!existsSync(localInteractionsFile)) return {};
  try {
    return JSON.parse(readFileSync(localInteractionsFile, 'utf8'));
  } catch {
    return {};
  }
}

const savedInteractions = loadLocalInteractions();
function loadLocalOrganizations() {
  if (!existsSync(localOrganizationsFile)) return [];
  try {
    return JSON.parse(readFileSync(localOrganizationsFile, 'utf8'));
  } catch {
    return [];
  }
}

const savedOrganizations = loadLocalOrganizations();
const accounts = [...demoAccounts, ...savedOrganizations];

export function listAccounts() {
  return accounts.map(({ id, name, industry, segment, location, services, opportunities }) => ({
    id,
    name,
    industry,
    segment,
    location,
    serviceCount: services.length,
    openOpportunityCount: opportunities.filter((opportunity) => opportunity.status === 'Open')
      .length,
  }));
}

export function addOrganization(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const industry = typeof input?.industry === 'string' ? input.industry.trim() : '';
  const location = typeof input?.location === 'string' ? input.location.trim() : '';
  const summary = typeof input?.summary === 'string' ? input.summary.trim() : '';
  if (!name || name.length > 180)
    throw new HttpError(
      400,
      'INVALID_ORGANIZATION_NAME',
      'Enter an organization name (up to 180 characters)',
    );
  if (!industry || industry.length > 120)
    throw new HttpError(400, 'INVALID_INDUSTRY', 'Enter an industry (up to 120 characters)');
  if (!location || location.length > 120)
    throw new HttpError(400, 'INVALID_LOCATION', 'Enter a location (up to 120 characters)');
  if (accounts.some((account) => account.name.toLowerCase() === name.toLowerCase()))
    throw new HttpError(
      409,
      'ORGANIZATION_EXISTS',
      'An organization with this name already exists',
    );
  const today = new Date().toISOString().slice(0, 10);
  const account = {
    id: `org-${randomUUID()}`,
    name,
    segment: 'Enterprise',
    industry,
    location,
    relationshipSince: today,
    owner: 'Enterprise Sales Advisor',
    summary:
      summary ||
      `Enterprise account created on ${today}. Add customer history and documents to build its account context.`,
    services: [],
    opportunities: [],
    interactions: [],
    documents: [],
    intelligence: [],
  };
  accounts.push(account);
  savedOrganizations.push(account);
  mkdirSync(localDataDirectory, { recursive: true });
  writeFileSync(localOrganizationsFile, `${JSON.stringify(savedOrganizations, null, 2)}\n`, 'utf8');
  return account;
}

export function getCustomerWorkspace(accountId) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Customer account not found');
  const interactions = [...account.interactions, ...(savedInteractions[accountId] || [])].sort(
    (left, right) => left.date.localeCompare(right.date),
  );
  const emailDocuments = (savedInteractions[accountId] || [])
    .filter((interaction) => interaction.channel === 'Email')
    .map((interaction) => ({
      id: interaction.id,
      title: interaction.title,
      type: 'Email thread',
      date: interaction.date,
      source: interaction.sourceType,
      tags: interaction.tags,
      content: interaction.details.content,
    }));
  return {
    account,
    interactions,
    documents: [...account.documents, ...sharedKnowledgeDocuments, ...emailDocuments],
    intelligence: account.intelligence,
  };
}

export function addEmailInteraction(accountId, input) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Customer account not found');

  const { subject, sender, date, content, summary } = input ?? {};
  if (typeof subject !== 'string' || !subject.trim() || subject.trim().length > 180) {
    throw new HttpError(400, 'INVALID_SUBJECT', 'Enter an email subject (up to 180 characters)');
  }
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 50000) {
    throw new HttpError(
      400,
      'INVALID_CONTENT',
      'Paste the email conversation (up to 50,000 characters)',
    );
  }
  if (typeof sender !== 'string' || !sender.trim() || sender.trim().length > 180) {
    throw new HttpError(400, 'INVALID_SENDER', 'Enter the sender name or email');
  }
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  ) {
    throw new HttpError(400, 'INVALID_DATE', 'Choose a valid email date');
  }
  if (summary !== undefined && (typeof summary !== 'string' || summary.length > 1000)) {
    throw new HttpError(400, 'INVALID_SUMMARY', 'Summary must be 1,000 characters or fewer');
  }

  const safeSubject = subject.trim();
  const safeSender = sender.trim();
  const safeContent = content.trim();
  const title = safeSubject;
  const shortSummary =
    summary?.trim() ||
    `Email thread from ${safeSender}. Open the source to review the full conversation.`;
  const interaction = {
    id: `email-${randomUUID()}`,
    date,
    channel: 'Email',
    title,
    description: shortSummary,
    opportunityId: null,
    tags: ['email', 'manually added'],
    sourceType: 'Email thread',
    details: {
      summary: shortSummary,
      participants: safeSender,
      content: `From: ${safeSender}\nTo: Singtel Enterprise Sales\nSubject: ${safeSubject}\nDate: ${date}\n\n${safeContent}`,
    },
  };

  savedInteractions[accountId] ||= [];
  savedInteractions[accountId].push(interaction);
  mkdirSync(localDataDirectory, { recursive: true });
  writeFileSync(localInteractionsFile, `${JSON.stringify(savedInteractions, null, 2)}\n`, 'utf8');
  return interaction;
}

export async function addScreenshotInteraction(accountId, input) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Customer account not found');
  const { title, sender, date, imageData } = input ?? {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 180) {
    throw new HttpError(400, 'INVALID_TITLE', 'Enter a short title for this screenshot');
  }
  if (typeof sender !== 'string' || !sender.trim() || sender.trim().length > 180) {
    throw new HttpError(400, 'INVALID_SENDER', 'Enter who supplied this screenshot');
  }
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  ) {
    throw new HttpError(400, 'INVALID_DATE', 'Choose a valid screenshot date');
  }
  const match =
    typeof imageData === 'string' && imageData.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!match) throw new HttpError(400, 'INVALID_IMAGE', 'Upload a PNG, JPEG, or WebP image');
  const imageBuffer = Buffer.from(match[2], 'base64');
  if (!imageBuffer.length || imageBuffer.length > 4 * 1024 * 1024) {
    throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Compress the screenshot to under 4 MB');
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new HttpError(
      503,
      'VISION_NOT_CONFIGURED',
      'Add GROQ_API_KEY to enable screenshot reading',
    );
  }

  const mimeType = match[1] === 'jpg' ? 'image/jpeg' : `image/${match[1]}`;
  const dataUrl = `data:${mimeType};base64,${match[2]}`;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'Read the supplied screenshot for an enterprise account record. Extract visible text and summarize only information clearly present. Separate observed facts from interpretation. Never infer a commitment, date, service capability, or customer intent that is not visible. If text is unclear, mark it unclear. Return concise plain text with headings: Summary, Extracted details, Follow-up questions.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Account: ${account.name}. Screenshot supplied by: ${sender.trim()}.`,
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    console.warn(
      `[accounts] Screenshot analysis failed (${response.status}):`,
      details.error?.message || response.statusText,
    );
    throw new HttpError(
      502,
      'IMAGE_ANALYSIS_FAILED',
      'Could not read this screenshot. Check the vision model configuration.',
    );
  }
  const result = await response.json();
  const extracted = result.choices?.[0]?.message?.content?.trim();
  if (!extracted)
    throw new HttpError(
      502,
      'IMAGE_ANALYSIS_EMPTY',
      'No readable details were found in this screenshot',
    );

  const id = `image-${randomUUID()}`;
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  mkdirSync(localUploadsDirectory, { recursive: true });
  writeFileSync(
    fileURLToPath(new URL(`../../../.local-data/uploads/${id}.${extension}`, import.meta.url)),
    imageBuffer,
  );
  const summary =
    extracted
      .split('\n')
      .find((line) => line.trim())
      ?.replace(/^#+\s*/, '') || 'Screenshot analyzed';
  const interaction = {
    id,
    date,
    channel: 'Screenshot',
    title: title.trim(),
    description: summary,
    opportunityId: null,
    tags: ['screenshot', 'manually added', 'AI extracted'],
    sourceType: 'Screenshot',
    details: {
      summary,
      participants: sender.trim(),
      content: `AI-extracted screenshot notes for ${account.name}.\n\n${extracted}\n\nReview the original screenshot before relying on extracted details.`,
      imagePath: `${id}.${extension}`,
      imageMimeType: mimeType,
    },
  };
  savedInteractions[accountId] ||= [];
  savedInteractions[accountId].push(interaction);
  mkdirSync(localDataDirectory, { recursive: true });
  writeFileSync(localInteractionsFile, `${JSON.stringify(savedInteractions, null, 2)}\n`, 'utf8');
  return interaction;
}

export function getScreenshotFile(accountId, interactionId) {
  if (!accounts.some((account) => account.id === accountId)) {
    throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Customer account not found');
  }
  const interaction = (savedInteractions[accountId] || []).find(
    (item) => item.id === interactionId && item.details?.imagePath,
  );
  if (!interaction) throw new HttpError(404, 'IMAGE_NOT_FOUND', 'Screenshot not found');
  return {
    path: fileURLToPath(
      new URL(`../../../.local-data/uploads/${interaction.details.imagePath}`, import.meta.url),
    ),
    mimeType: interaction.details.imageMimeType,
  };
}

export async function addTranscriptInteraction(accountId, input) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Customer account not found');
  const transcript = typeof input?.transcript === 'string' ? input.transcript.trim() : '';
  const date = input?.date;
  if (!transcript || transcript.length > 50000) {
    throw new HttpError(
      400,
      'INVALID_TRANSCRIPT',
      'Transcript must contain up to 50,000 characters',
    );
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, 'INVALID_DATE', 'Choose a valid conversation date');
  }

  let summary = `Microphone transcript saved. Review the transcript for key needs and follow-ups.`;
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-20b',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content:
                'Summarize this sales conversation using only the transcript. Include customer needs, concerns, decisions explicitly made, and follow-ups with owners or dates only when stated. Mark unknowns. Do not invent commitments or product capabilities.',
            },
            { role: 'user', content: `Account: ${account.name}\n\nTranscript:\n${transcript}` },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) {
        const payload = await response.json();
        summary = payload.choices?.[0]?.message?.content?.trim() || summary;
      }
    } catch (error) {
      console.warn('[accounts] Could not summarize microphone transcript:', error.message);
    }
  }

  const interaction = {
    id: `mic-${randomUUID()}`,
    date,
    channel: 'Microphone',
    title: input.title?.trim().slice(0, 180) || 'Microphone conversation',
    description: summary.slice(0, 500),
    opportunityId: null,
    tags: ['microphone', 'transcript', 'manually recorded'],
    sourceType: 'Microphone transcript',
    details: {
      summary,
      participants: 'Sales advisor and customer; speakers not identified',
      content: `Transcript\n\n${transcript}\n\nAI summary\n\n${summary}`,
    },
  };
  savedInteractions[accountId] ||= [];
  savedInteractions[accountId].push(interaction);
  mkdirSync(localDataDirectory, { recursive: true });
  writeFileSync(localInteractionsFile, `${JSON.stringify(savedInteractions, null, 2)}\n`, 'utf8');
  return interaction;
}

export function addManualInteraction(accountId, input) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Customer account not found');
  const { title, date, sourceType, content, participants } = input ?? {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 180)
    throw new HttpError(400, 'INVALID_TITLE', 'Enter a source title');
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 50000)
    throw new HttpError(400, 'INVALID_CONTENT', 'Paste up to 50,000 characters of source text');
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new HttpError(400, 'INVALID_DATE', 'Choose a valid source date');
  const allowedTypes = [
    'Meeting notes',
    'Call notes',
    'Message thread',
    'Account note',
    'Other document',
  ];
  if (!allowedTypes.includes(sourceType))
    throw new HttpError(400, 'INVALID_SOURCE_TYPE', 'Choose a supported source type');
  const interaction = {
    id: `manual-${randomUUID()}`,
    date,
    channel: 'Manual note',
    title: title.trim(),
    description: content.trim().slice(0, 240),
    opportunityId: null,
    tags: ['manually added', sourceType.toLowerCase()],
    sourceType,
    details: {
      summary: content.trim().slice(0, 500),
      participants: typeof participants === 'string' ? participants.trim().slice(0, 180) : '',
      content: `Manually pasted ${sourceType.toLowerCase()} for ${account.name}.\n\n${content.trim()}`,
    },
  };
  savedInteractions[accountId] ||= [];
  savedInteractions[accountId].push(interaction);
  mkdirSync(localDataDirectory, { recursive: true });
  writeFileSync(localInteractionsFile, `${JSON.stringify(savedInteractions, null, 2)}\n`, 'utf8');
  return interaction;
}
