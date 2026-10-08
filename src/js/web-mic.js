/**
 * WebView microphone capture → PCM s16le 16kHz mono (Android).
 *
 * cpal/oboe can only open Android's VOICE_RECOGNITION input, which on some phones
 * (e.g. Galaxy A12) is ~-60 dBFS and carries almost no voice. getUserMedia uses
 * VOICE_COMMUNICATION with the platform's AGC / noise suppression / echo cancel.
 */

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096; // ~256ms at 16kHz

class WebMic {
    constructor() {
        this._stream = null;
        this._context = null;
    }

    /** @param {(pcm: ArrayBuffer) => void} onPcm */
    async start(onPcm) {
        this._stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });
        this._context = new AudioContext({ sampleRate: SAMPLE_RATE });
        const source = this._context.createMediaStreamSource(this._stream);
        // ScriptProcessor (not AudioWorklet): the CSP blocks blob: worklet modules,
        // and this needs no separate file
        const processor = this._context.createScriptProcessor(BUFFER_SIZE, 1, 1);
        processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                pcm[i] = s * 32767;
            }
            onPcm(pcm.buffer);
        };
        source.connect(processor);
        processor.connect(this._context.destination);
    }

    stop() {
        this._stream?.getTracks().forEach((t) => t.stop());
        this._context?.close();
        this._stream = null;
        this._context = null;
    }
}

export const webMic = new WebMic();
