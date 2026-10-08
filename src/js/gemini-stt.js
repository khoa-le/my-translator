/**
 * Gemini Live API Client
 * Connects directly to the BidiGenerateContent WebSocket and uses a Live model
 * (default gemini-3.1-flash-live-preview) as a real-time interpreter:
 *   - Input audio transcription gives the source text (onOriginal / onProvisional).
 *   - A translator system instruction makes the model's TEXT response the
 *     translation (onTranslation).
 *
 * Implements the same surface as SonioxClient so app.js can treat them
 * interchangeably: connect(config) / sendAudio(buffer) / disconnect() plus the
 * onOriginal / onTranslation / onProvisional / onStatusChange / onError /
 * onConfidence callbacks. Gemini provides no per-token confidence, so
 * onConfidence is never fired.
 *
 * Audio input must be raw 16-bit PCM, 16 kHz, mono, little-endian — exactly what
 * the Rust `start_capture` command emits.
 */

const GEMINI_WS_BASE =
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';

// Reconnect settings (fresh session on drop — no context carryover for now)
const MAX_RECONNECT = 3;
const RECONNECT_DELAY_MS = 2000;

// ISO code → human-readable name for the translator prompt. Falls back to the
// raw code for anything not listed.
const LANG_NAMES = {
    auto: 'the spoken language', en: 'English', ja: 'Japanese', ko: 'Korean',
    zh: 'Chinese', vi: 'Vietnamese', fr: 'French', de: 'German', es: 'Spanish',
    th: 'Thai', id: 'Indonesian', it: 'Italian', pt: 'Portuguese', ru: 'Russian',
    ar: 'Arabic', hi: 'Hindi', nl: 'Dutch', pl: 'Polish', tr: 'Turkish',
    uk: 'Ukrainian',
};

function langName(code) {
    if (!code) return 'the target language';
    return LANG_NAMES[code] || code;
}

function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

export class GeminiLiveClient {
    constructor() {
        this.ws = null;
        this._config = null;
        this.isConnected = false;
        this._setupComplete = false;
        this._intentionalDisconnect = false;
        this._reconnectAttempts = 0;

        // Per-turn accumulators
        this._srcBuffer = '';
        this._translationBuffer = '';

        // Callbacks (mirror SonioxClient)
        this.onOriginal = null;       // (text, speaker, language) => {}
        this.onTranslation = null;    // (text) => {}
        this.onProvisional = null;    // (text, speaker, language) => {}
        this.onStatusChange = null;   // (status) => {}
        this.onError = null;          // (error) => {}
        this.onConfidence = null;     // (avgConfidence) => {}  (never fired)
    }

    connect(config) {
        this._config = config;
        this._intentionalDisconnect = false;
        this._reconnectAttempts = 0;

        if (!config?.apiKey) {
            this._setStatus('error');
            this.onError?.('Gemini API key is required. Please add it in Settings.');
            return;
        }
        this._doConnect();
    }

    _doConnect() {
        const { apiKey } = this._config;
        this._setStatus('connecting');
        this._setupComplete = false;
        this._srcBuffer = '';
        this._translationBuffer = '';

        const url = `${GEMINI_WS_BASE}?key=${encodeURIComponent(apiKey)}`;
        let ws;
        try {
            ws = new WebSocket(url);
            ws.binaryType = 'arraybuffer';
        } catch (err) {
            this._setStatus('error');
            this.onError?.(`Failed to create WebSocket: ${err.message}`);
            return;
        }
        this.ws = ws;

        ws.onopen = () => {
            console.log('[Gemini] WebSocket OPEN, sending setup');
            ws.send(JSON.stringify(this._buildSetup()));
        };

        ws.onmessage = (event) => this._handleMessage(event);

        ws.onerror = () => {
            console.error('[Gemini] WebSocket error');
        };

        ws.onclose = (event) => {
            this.isConnected = false;
            this._setupComplete = false;
            if (this.ws === ws) this.ws = null;

            if (this._intentionalDisconnect) {
                this._setStatus('disconnected');
                return;
            }
            const reason = (event.reason || '').trim();
            console.log('[Gemini] WebSocket CLOSED, code:', event.code, 'reason:', reason);

            if (event.code === 1000) {
                this._setStatus('disconnected');
                return;
            }

            // Permanent failures (bad model, malformed setup, auth, policy) — the
            // server reports them in the close reason. Reconnecting won't help, so
            // surface the reason and stop.
            const permanent = event.code === 1007 || event.code === 1008 ||
                event.code === 1011 || event.code === 1003 ||
                /api key|invalid|not found|not supported|permission|unauthorized|quota/i.test(reason);
            if (permanent) {
                this._setStatus('error');
                this.onError?.(`Gemini: ${reason || `connection closed (code ${event.code})`}`);
                return;
            }
            this._tryReconnect(reason || `Connection closed (code: ${event.code})`);
        };
    }

    _buildSetup() {
        const { model, sourceLanguage, targetLanguage, translationType,
                languageA, languageB, customContext } = this._config;

        let instruction;
        if (translationType === 'two_way' && languageA && languageB) {
            const a = langName(languageA), b = langName(languageB);
            instruction =
                `You are a simultaneous interpreter between ${a} and ${b}. ` +
                `For each spoken utterance: if it is in ${a}, output its ${b} translation; ` +
                `if it is in ${b}, output its ${a} translation. ` +
                `Output ONLY the translation — no quotes, no labels, no source text, no commentary.`;
        } else {
            const tgt = langName(targetLanguage);
            const src = sourceLanguage && sourceLanguage !== 'auto'
                ? `The speaker talks in ${langName(sourceLanguage)}. ` : '';
            instruction =
                `You are a simultaneous interpreter. ${src}` +
                `For each spoken utterance, output ONLY its translation into ${tgt} — ` +
                `no quotes, no labels, no source text, no commentary. ` +
                `Preserve proper nouns, numbers, and technical terms.`;
        }

        // Optional domain background + glossary from the shared custom context.
        const extra = [];
        if (customContext?.text) extra.push(`Background: ${customContext.text}`);
        if (Array.isArray(customContext?.translation_terms) && customContext.translation_terms.length) {
            const glossary = customContext.translation_terms
                .map(t => `${t.source} → ${t.target}`).join('; ');
            extra.push(`Preferred translations: ${glossary}.`);
        }
        if (extra.length) instruction += '\n\n' + extra.join('\n');

        // Current Live API models are native-audio only — they reject a TEXT
        // response modality. So we request AUDIO (the model "speaks" the
        // translation) and read the translation from outputAudioTranscription,
        // discarding the audio itself. inputAudioTranscription gives the source.
        return {
            setup: {
                model: `models/${model || DEFAULT_MODEL}`,
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    temperature: 0.2,
                },
                systemInstruction: { parts: [{ text: instruction }] },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
        };
    }

    sendAudio(pcmData) {
        if (!this._setupComplete || this.ws?.readyState !== WebSocket.OPEN) return;
        const bytes = pcmData instanceof Uint8Array ? pcmData : new Uint8Array(pcmData);
        this.ws.send(JSON.stringify({
            realtimeInput: {
                audio: { data: bytesToBase64(bytes), mimeType: 'audio/pcm;rate=16000' },
            },
        }));
    }

    disconnect() {
        this._intentionalDisconnect = true;
        if (this.ws) {
            try { this.ws.close(1000, 'User disconnected'); } catch { /* ignore */ }
            this.ws = null;
        }
        this.isConnected = false;
        this._setupComplete = false;
        this._setStatus('disconnected');
    }

    // ─── Message handling ─────────────────────────────────────

    _handleMessage(event) {
        const data = event.data;
        if (typeof data === 'string') {
            this._processJson(data);
        } else if (data instanceof ArrayBuffer) {
            this._processJson(new TextDecoder().decode(data));
        } else if (data instanceof Blob) {
            data.text().then((t) => this._processJson(t)).catch(() => {});
        }
    }

    _processJson(str) {
        let msg;
        try {
            msg = JSON.parse(str);
        } catch {
            return;
        }

        if (msg.setupComplete !== undefined) {
            this._setupComplete = true;
            this.isConnected = true;
            this._reconnectAttempts = 0;
            this._setStatus('connected');
            return;
        }

        if (msg.goAway) {
            // Server is about to close (session/idle limit). Let onclose reconnect.
            console.log('[Gemini] goAway received:', msg.goAway?.timeLeft);
            return;
        }

        const sc = msg.serverContent;
        if (!sc) return;

        // Source-language transcription of the input audio.
        const srcText = sc.inputTranscription?.text;
        if (srcText) {
            this._srcBuffer += srcText;
            this.onProvisional?.(this._srcBuffer, null, this._config?.sourceLanguage || null);
        }

        // Transcript of the model's spoken response = the translation. The
        // actual audio (modelTurn.parts[].inlineData) is ignored.
        const outText = sc.outputTranscription?.text;
        if (outText) this._translationBuffer += outText;

        // End of utterance: emit the paired original + translation.
        if (sc.turnComplete) {
            this._flushTurn();
        }
    }

    _flushTurn() {
        const original = this._srcBuffer.trim();
        const translation = this._translationBuffer.trim();
        this._srcBuffer = '';
        this._translationBuffer = '';

        if (original) {
            this.onOriginal?.(original, null, this._config?.sourceLanguage || null);
        }
        if (translation) {
            this.onTranslation?.(translation);
        }
        // Clear the dimmed provisional line.
        this.onProvisional?.('');
    }

    // ─── Reconnect ────────────────────────────────────────────

    _tryReconnect(reason) {
        if (this._reconnectAttempts >= MAX_RECONNECT) {
            this._setStatus('error');
            this.onError?.(`${reason}. Reconnect failed after ${MAX_RECONNECT} attempts.`);
            return;
        }
        this._reconnectAttempts++;
        const delay = RECONNECT_DELAY_MS * this._reconnectAttempts;
        this._setStatus('connecting');
        this.onError?.(`${reason}. Reconnecting (${this._reconnectAttempts}/${MAX_RECONNECT})...`);
        setTimeout(() => {
            if (!this._intentionalDisconnect && this._config) this._doConnect();
        }, delay);
    }

    _setStatus(status) {
        this.onStatusChange?.(status);
    }
}

// Singleton
export const geminiLiveClient = new GeminiLiveClient();
