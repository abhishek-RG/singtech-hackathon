import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../../middleware/errorHandler.js';
import { getCustomerWorkspace } from '../accounts/accounts.service.js';

const modelId = process.env.EMBEDDING_MODEL || 'onnx-community/all-MiniLM-L6-v2-ONNX';
const localDataDirectory = fileURLToPath(new URL('../../../.local-data/', import.meta.url));
const localIndexFile = fileURLToPath(
  new URL('../../../.local-data/rag-index.json', import.meta.url),
);
const indexCache = new Map();
let extractorPromise;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers')
      .then(({ pipeline }) =>
        pipeline('feature-extraction', modelId, { device: 'cpu', dtype: 'q4' }),
      )
      .catch((error) => {
        extractorPromise = undefined;
        throw error;
      });
  }
  return extractorPromise;
}

async function embed(text) {
  const extractor = await getExtractor();
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

function splitIntoChunks(text, maxLength = 850, overlap = 120) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxLength, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(' ', end);
      if (boundary > start + Math.floor(maxLength * 0.65)) end = boundary;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

function createCorpus(workspace) {
  const interactionRecords = workspace.interactions.map((interaction) => ({
    id: interaction.id,
    title: interaction.title,
    type: interaction.sourceType,
    date: interaction.date,
    opportunityId: interaction.opportunityId,
    content: [interaction.details?.summary, interaction.details?.content || interaction.description]
      .filter(Boolean)
      .join('\n'),
  }));
  const documentRecords = workspace.documents.map((document) => ({
    id: document.id,
    title: document.title,
    type: document.type,
    date: document.date,
    opportunityId: null,
    content: document.content,
  }));

  return [...interactionRecords, ...documentRecords].flatMap((record) =>
    splitIntoChunks(record.content).map((text, index) => ({
      id: `${record.id}-${index + 1}`,
      sourceId: record.id,
      title: record.title,
      type: record.type,
      date: record.date,
      opportunityId: record.opportunityId,
      text,
    })),
  );
}

function readPersistedIndexes() {
  if (!existsSync(localIndexFile)) return {};
  try {
    return JSON.parse(readFileSync(localIndexFile, 'utf8'));
  } catch {
    return {};
  }
}

function writePersistedIndex(accountId, index) {
  const allIndexes = readPersistedIndexes();
  allIndexes[accountId] = index;
  mkdirSync(localDataDirectory, { recursive: true });
  writeFileSync(localIndexFile, `${JSON.stringify(allIndexes)}\n`, 'utf8');
}

async function getVectorIndex(accountId, corpus) {
  const corpusHash = createHash('sha256')
    .update(JSON.stringify(corpus.map(({ id, text }) => [id, text])))
    .digest('hex');
  const cached = indexCache.get(accountId);
  if (cached?.corpusHash === corpusHash) return cached;

  const persisted = readPersistedIndexes()[accountId];
  if (persisted?.corpusHash === corpusHash && persisted?.modelId === modelId) {
    indexCache.set(accountId, persisted);
    return persisted;
  }

  const chunks = [];
  for (const chunk of corpus) {
    chunks.push({ ...chunk, embedding: await embed(chunk.text) });
  }
  const index = { corpusHash, modelId, chunks };
  indexCache.set(accountId, index);
  writePersistedIndex(accountId, index);
  return index;
}

function lexicalRank(query, corpus) {
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])];
  return corpus
    .map((chunk) => {
      const text = `${chunk.title} ${chunk.type} ${chunk.text}`.toLowerCase();
      const matched = terms.filter((term) => text.includes(term));
      return { ...chunk, score: terms.length ? matched.length / terms.length : 0 };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function isSimpleGreeting(query) {
  return /^(?:(?:hi|hello|hey)(?: there)?|good morning|good afternoon|good evening|how are you)[!.,?\s]*$/i.test(
    query.trim(),
  );
}

function wantsLatestContext(query) {
  return /\b(latest|newest|most recent|current(?:ly)?|right now|as of now|today|what(?:'s| is) next|next steps?|follow[ -]?up|stalled|what should i (?:ask|say|do)|since (?:the )?last (?:meeting|call|interaction))\b/i.test(
    query,
  );
}

function getSingaporeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getRecencyBoost(date, today) {
  const eventTime = Date.parse(`${date}T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(eventTime) || !Number.isFinite(todayTime)) return 0;
  const ageInDays = Math.max(0, (todayTime - eventTime) / 86_400_000);
  return Math.max(0, 1 - ageInDays / 365) * 0.2;
}

function vectorRank(queryVector, chunks, { preferRecent = false, today } = {}) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      score:
        chunk.embedding.reduce((sum, value, index) => sum + value * queryVector[index], 0) +
        (preferRecent ? getRecencyBoost(chunk.date, today) : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function ensureLatestInteraction(ranked, corpus, interactions, currentDate) {
  const latestInteraction = [...interactions].sort((left, right) =>
    right.date.localeCompare(left.date),
  )[0];
  if (!latestInteraction) return ranked;

  const latestChunk = corpus.find((chunk) => chunk.sourceId === latestInteraction.id);
  if (!latestChunk) return ranked;

  const selectedLatestChunk = ranked.find((chunk) => chunk.id === latestChunk.id) || {
    ...latestChunk,
    score: getRecencyBoost(latestChunk.date, currentDate),
  };
  return [selectedLatestChunk, ...ranked.filter((chunk) => chunk.id !== latestChunk.id)].slice(
    0,
    5,
  );
}

async function generateAnswer(query, sources, currentDate) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      answer:
        'Relevant customer and Singtel records were retrieved. Add GROQ_API_KEY to enable generated answers.',
      generated: false,
    };
  }

  const retrievalOnly = {
    answer:
      'I found relevant customer and Singtel records, but could not generate an answer. Check the server log for the Groq API error and confirm the API key and model configuration.',
    generated: false,
  };

  const evidence = sources
    .map(
      (source, index) =>
        `[S${index + 1}] ${source.title} (${source.type}, ${source.date})\n${source.text}`,
    )
    .join('\n\n');
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-20b',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are a sales research assistant. Today is ${currentDate} in Singapore. Answer only from the supplied evidence and cite claims using [S1] style references. Treat each source date as the date that information was recorded. Interpret relative dates such as "next Thursday" from that source date, not from today. Never describe a past date as upcoming. Distinguish a proposal from a confirmed booking: saying an invite will be sent does not prove it was sent or that a meeting happened. For questions about current status, latest needs, follow-up, or next steps, prioritize the newest relevant customer interaction; explain when the record does not confirm an action's completion. A newer source supersedes an older one only when it addresses the same fact. If evidence is insufficient or contradictory, say so. Do not invent product capabilities, customer intent, commitments, or pricing. Keep the answer concise and suggest a salesperson verify uncertain points.`,
          },
          { role: 'user', content: `Question: ${query}\n\nEvidence:\n${evidence}` },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      let providerMessage = response.statusText || 'No error detail returned';
      try {
        const payload = await response.json();
        providerMessage = payload?.error?.message || payload?.error?.code || providerMessage;
      } catch {
        // Keep the HTTP status if Groq returned a non-JSON error body.
      }
      console.warn(
        `[rag] Groq API request failed (${response.status}): ${String(providerMessage).replaceAll(apiKey, '[redacted]')}`,
      );
      return retrievalOnly;
    }

    const result = await response.json();
    return {
      answer: result.choices?.[0]?.message?.content?.trim() || 'No answer was returned.',
      generated: true,
    };
  } catch (error) {
    console.warn(
      `[rag] Groq API request failed: ${String(error.message || error).replaceAll(apiKey, '[redacted]')}`,
    );
    return retrievalOnly;
  }
}

export async function askCustomer(accountId, input) {
  const query = typeof input?.query === 'string' ? input.query.trim() : '';
  if (!query || query.length > 1000) {
    throw new HttpError(400, 'INVALID_QUERY', 'Enter a question of up to 1,000 characters');
  }

  const workspace = getCustomerWorkspace(accountId);
  if (isSimpleGreeting(query)) {
    return {
      query,
      answer: `Hi! What would you like to know about ${workspace.account.name}? I can help with the latest customer needs, open follow-ups, existing services, or relevant Singtel offerings.`,
      generated: false,
      responseType: 'greeting',
      retrievalMode: 'not needed',
      sources: [],
    };
  }

  const corpus = createCorpus(workspace);
  if (!corpus.length)
    throw new HttpError(404, 'NO_ACCOUNT_CONTENT', 'There is no customer content to search yet');

  let ranked;
  let retrievalMode = 'semantic';
  const currentDate = getSingaporeDate();
  const preferRecent = wantsLatestContext(query);
  try {
    const index = await getVectorIndex(accountId, corpus);
    ranked = vectorRank(await embed(query), index.chunks, {
      preferRecent,
      today: currentDate,
    });
  } catch (error) {
    console.warn('[rag] Embedding model unavailable; using lexical retrieval:', error.message);
    ranked = lexicalRank(query, corpus);
    if (preferRecent) {
      ranked = ranked
        .map((chunk) => ({
          ...chunk,
          score: chunk.score + getRecencyBoost(chunk.date, currentDate),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 5);
      ranked = ensureLatestInteraction(ranked, corpus, workspace.interactions, currentDate);
    }
    retrievalMode = 'keyword fallback';
  }
  if (preferRecent && retrievalMode === 'semantic') {
    ranked = ensureLatestInteraction(ranked, corpus, workspace.interactions, currentDate);
  }

  const sources = ranked.map((item, index) => ({
    citation: `S${index + 1}`,
    sourceId: item.sourceId,
    title: item.title,
    type: item.type,
    date: item.date,
    text: item.text,
    score: Number(item.score.toFixed(3)),
  }));
  const response = await generateAnswer(query, sources, currentDate);
  return { query, ...response, retrievalMode, sources };
}
