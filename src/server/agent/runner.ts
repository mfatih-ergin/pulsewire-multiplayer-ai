import { createOpenAI } from '@ai-sdk/openai';
import { generateText as aiGenerateText } from 'ai';
import { ObjectId } from 'modelence/server';
import { dbAgentSessions } from './db';

function newStepId() {
  return new ObjectId().toString();
}

async function appendStep(sessionId: string, step: {
  type: 'plan' | 'action' | 'output' | 'redirect' | 'system' | 'summary' | 'error';
  content: string;
  authorId?: string;
  authorHandle?: string;
}) {
  await dbAgentSessions.updateOne(
    sessionId,
    {
      $push: {
        steps: {
          id: newStepId(),
          ...step,
          createdAt: new Date(),
        },
      },
      $set: { updatedAt: new Date() },
    }
  );
}

type SessionStatus = 'planning' | 'running' | 'needs_input' | 'completed' | 'failed';

async function setStatus(sessionId: string, status: SessionStatus) {
  await dbAgentSessions.updateOne(sessionId, { $set: { status, updatedAt: new Date() } });
}

// Pulls any un-consumed redirects left by teammates and marks them consumed,
// so the next LLM call can take the steering into account.
async function consumeRedirects(sessionId: string): Promise<string[]> {
  const session = await dbAgentSessions.findById(sessionId);
  if (!session) return [];

  const redirects = (session.redirects || []) as any[];
  const pending = redirects.filter((r) => !r.consumed);
  if (pending.length === 0) return [];

  const updatedRedirects = redirects.map((r) => (r.consumed ? r : { ...r, consumed: true }));
  await dbAgentSessions.updateOne(sessionId, { $set: { redirects: updatedRedirects } });

  return pending.map((r) => `${r.authorHandle}: ${r.content}`);
}

async function callAgent(prompt: string, system: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // 1. Önce OpenAI (GPT-4o-mini) dene
  if (openaiKey) {
    try {
      const openai = createOpenAI({ apiKey: openaiKey });
      const result = await aiGenerateText({
        model: openai('gpt-4o-mini'),
        temperature: 0.5,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      });
      return result.text.trim();
    } catch (err: any) {
      console.warn('OpenAI API çağrısı başarısız oldu, Groq servisine geçiliyor:', err?.message || err);
      // OpenAI bakiye hatası veya erişim hatası verirse Groq'a otomatik devret
    }
  }

  // 2. OpenAI başarısız olursa veya anahtar yoksa Groq (gpt-oss-20b) dene
  if (groqKey) {
    try {
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqKey,
      });
      const result = await aiGenerateText({
        model: groq('openai/gpt-oss-20b'),
        temperature: 0.5,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      });
      return result.text.trim();
    } catch (err: any) {
      console.error('Groq API çağrısı başarısız oldu:', err?.message || err);
      throw err;
    }
  }

  throw new Error(
    'Geçerli bir Yapay Zeka API Anahtarı bulunamadı! Lütfen .modelence.env dosyasına GROQ_API_KEY="gsk_..." veya OPENAI_API_KEY="sk-..." ekleyin.'
  );
}

const SYSTEM_PROMPT = `Sen ortak bir çalışma alanında görev yapan kıdemli bir yazılım ve yapay zeka mühendisisin.
Tüm adımlarını, analizlerini, bulgularını ve özetlerini HER ZAMAN anlaşılır, detaylı ve net TÜRKÇE olarak yaz.
Plan adımlarını, yaptığın eylemleri ve ulaştığın detaylı sonuçları açık ve bilgilendirici bir dille anlat. Markdown başlıkları kullanma. Ekip üyelerine doğrudan faydalı bilgiler sun.`;

// Runs a session end-to-end in the background. Not awaited by the caller.
export async function runAgentSession(sessionId: string) {
  try {
    await setStatus(sessionId, 'planning');

    const session = await dbAgentSessions.requireById(sessionId);

    const planText = await callAgent(
      `Görev: ${session.task}\n\nBu görevi başarmak için atacağın 3 ila 5 somut adımı planla. Yanıtı her satırda numaralı bir adım olacak şekilde TÜRKÇE olarak yaz.`,
      SYSTEM_PROMPT
    );

    await appendStep(sessionId, { type: 'plan', content: planText });

    const steps = planText
      .split('\n')
      .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 5);

    await setStatus(sessionId, 'running');

    let priorWork = '';
    for (let i = 0; i < steps.length; i++) {
      const redirects = await consumeRedirects(sessionId);
      for (const redirect of redirects) {
        await appendStep(sessionId, { type: 'system', content: `Yönlendirme işleniyor: ${redirect}` });
      }

      const redirectContext = redirects.length
        ? `\n\nEkip üyesinden anlık yönlendirme geldi:\n${redirects.join('\n')}\nYaklaşımını buna göre adapte et.`
        : '';

      const output = await callAgent(
        `Görev: ${session.task}\n\nPlan:\n${planText}\n\nŞu ana kadar yapılanlar:\n${priorWork || '(henüz bir şey yok)'}` +
        `${redirectContext}\n\nŞimdi planın ${i + 1}. adımını gerçekleştir: "${steps[i]}".` +
        ` Bu adımda ne incelediğini, ne bulduğunu ve detaylı bilgileri Türkçe olarak yaz.`,
        SYSTEM_PROMPT
      );

      await appendStep(sessionId, { type: 'action', content: `Adım ${i + 1}: ${steps[i]}` });
      await appendStep(sessionId, { type: 'output', content: output });
      priorWork += `\nAdım ${i + 1} (${steps[i]}): ${output}`;
    }

    const trailingRedirects = await consumeRedirects(sessionId);
    for (const redirect of trailingRedirects) {
      await appendStep(sessionId, { type: 'system', content: `Yönlendirme işleniyor: ${redirect}` });
    }

    const summary = await callAgent(
      `Görev: ${session.task}\n\nYapılan çalışma:\n${priorWork}` +
      (trailingRedirects.length ? `\n\nEkip yönlendirmeleri:\n${trailingRedirects.join('\n')}` : '') +
      `\n\nTüm çalışmanın sonuçlarını içeren detaylı bir özet raporu Türkçe olarak yaz.`,
      SYSTEM_PROMPT
    );

    await appendStep(sessionId, { type: 'summary', content: summary });
    await setStatus(sessionId, 'completed');
  } catch (error) {
    await appendStep(sessionId, {
      type: 'error',
      content: `Ajan çalışması başarısız oldu: ${(error as Error).message}`,
    });
    await setStatus(sessionId, 'failed');
  }
}
