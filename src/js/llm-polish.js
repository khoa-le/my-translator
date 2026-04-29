/**
 * LLM Revise — post-process Soniox translation for tone / persona / style.
 *
 * Architecture:
 *   Soniox finalizes a translation → render it immediately for low latency.
 *   In parallel, send {source, draft, instructions, recent examples} to a
 *   light LLM (Gemini Flash, Claude Haiku, or local Ollama) which rewrites
 *   the draft in the requested tone. When the polished version arrives, the
 *   caller swaps it in. If the LLM call fails or times out, the original
 *   Soniox draft remains.
 *
 * The LLM also sees the source text so it can correct meaning errors in the
 * draft, not just restyle.
 */

const MAX_HISTORY_EXAMPLES = 2;
const MAX_INPUT_CHARS = 1200;

export class LlmPolishClient {
    constructor() {
        this._recent = []; // [{ source, polished }]
    }

    /**
     * Polish a single translated line.
     *
     * @param {object} args
     * @param {string} args.source         original (recognized) text
     * @param {string} args.draft          Soniox translation to revise
     * @param {string} args.sourceLang     ISO code or 'auto'
     * @param {string} args.targetLang     ISO code
     * @param {string} args.instructions   user tone/persona system prompt
     * @param {object} args.providerCfg    { provider, model, apiKey, ollamaUrl, timeoutMs }
     * @returns {Promise<string|null>}     polished text, or null on failure / disabled
     */
    async polish({ source, draft, sourceLang, targetLang, instructions, providerCfg }) {
        if (!draft) return null;
        if (!providerCfg?.provider) return null;

        const src = (source || '').slice(0, MAX_INPUT_CHARS);
        const drf = draft.slice(0, MAX_INPUT_CHARS);

        const systemPrompt = this._buildSystemPrompt({
            instructions,
            sourceLang,
            targetLang,
        });
        const userPrompt = this._buildUserPrompt({
            source: src,
            draft: drf,
            recent: this._recent,
        });

        const timeoutMs = providerCfg.timeoutMs ?? 1500;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);

        try {
            let polished;
            switch (providerCfg.provider) {
                case 'gemini':
                    polished = await this._callGemini({ providerCfg, systemPrompt, userPrompt, signal: ctrl.signal });
                    break;
                case 'anthropic':
                    polished = await this._callAnthropic({ providerCfg, systemPrompt, userPrompt, signal: ctrl.signal });
                    break;
                case 'ollama':
                    polished = await this._callOllama({ providerCfg, systemPrompt, userPrompt, signal: ctrl.signal });
                    break;
                default:
                    return null;
            }
            polished = this._sanitize(polished);
            if (!polished) return null;
            this._addExample(src, polished);
            return polished;
        } catch (err) {
            console.warn('[LlmPolish] failed, keeping draft:', err?.message || err);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    reset() {
        this._recent = [];
    }

    // ─── Prompt builders ─────────────────────────────────────

    _buildSystemPrompt({ instructions, sourceLang, targetLang }) {
        const tone = (instructions || '').trim();
        const lines = [
            `You revise machine-translated subtitles. The user gives you a SOURCE line and a DRAFT translation produced by a streaming STT model.`,
            `Your job: rewrite the DRAFT in ${targetLang} so it reads naturally and matches the user's tone/persona instructions. Use the SOURCE (${sourceLang}) as ground truth — if the DRAFT is wrong, fix it.`,
            ``,
            `Rules:`,
            `- Output ONLY the revised translation in ${targetLang}. No quotes, no labels, no explanation, no romanization.`,
            `- Preserve meaning. Do not invent facts not present in the SOURCE.`,
            `- Keep length close to the DRAFT (subtitles, not paraphrases).`,
            `- Keep proper nouns, product names, code, numbers, and English technical terms unchanged unless the tone instructions say otherwise.`,
            `- If the DRAFT is already perfect, return it unchanged.`,
        ];
        if (tone) {
            lines.push(``, `Tone & persona instructions from the user:`, tone);
        }
        return lines.join('\n');
    }

    _buildUserPrompt({ source, draft, recent }) {
        const lines = [];
        if (recent.length > 0) {
            lines.push('Style examples from the same session (already revised):');
            for (const ex of recent) {
                lines.push(`- ${ex.polished}`);
            }
            lines.push('');
        }
        lines.push(`SOURCE: ${source || '(unavailable)'}`);
        lines.push(`DRAFT: ${draft}`);
        lines.push('');
        lines.push('Revised translation:');
        return lines.join('\n');
    }

    // ─── Provider calls ──────────────────────────────────────

    async _callGemini({ providerCfg, systemPrompt, userPrompt, signal }) {
        const { apiKey, model } = providerCfg;
        if (!apiKey) throw new Error('Gemini API key is missing');
        const m = model || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const body = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 256,
                responseMimeType: 'text/plain',
            },
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            signal,
        });
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text().catch(() => '')}`);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
        return text;
    }

    async _callAnthropic({ providerCfg, systemPrompt, userPrompt, signal }) {
        const { apiKey, model } = providerCfg;
        if (!apiKey) throw new Error('Anthropic API key is missing');
        const m = model || 'claude-haiku-4-5';
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: m,
                max_tokens: 256,
                temperature: 0.3,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            }),
            signal,
        });
        if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text().catch(() => '')}`);
        const data = await res.json();
        const text = (data?.content || []).filter(p => p.type === 'text').map(p => p.text).join('');
        return text;
    }

    async _callOllama({ providerCfg, systemPrompt, userPrompt, signal }) {
        const base = (providerCfg.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
        const m = providerCfg.model || 'gemma3:4b';
        const res = await fetch(`${base}/api/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model: m,
                stream: false,
                options: { temperature: 0.3, num_predict: 256 },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
            signal,
        });
        if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text().catch(() => '')}`);
        const data = await res.json();
        return data?.message?.content || '';
    }

    // ─── Helpers ────────────────────────────────────────────

    _sanitize(text) {
        if (!text) return '';
        let out = text.trim();
        // Strip leading labels the model sometimes emits despite instructions
        out = out.replace(/^(revised translation|translation|output)\s*:\s*/i, '');
        // Strip surrounding quotes if the model wrapped the whole line
        if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith('「') && out.endsWith('」'))) {
            out = out.slice(1, -1).trim();
        }
        return out;
    }

    _addExample(source, polished) {
        this._recent.push({ source, polished });
        while (this._recent.length > MAX_HISTORY_EXAMPLES) this._recent.shift();
    }
}

export const llmPolishClient = new LlmPolishClient();
