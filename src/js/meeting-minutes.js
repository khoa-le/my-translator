/**
 * Meeting minutes via Gemini — same outline as the Claude Code
 * `meeting-minutes` skill, so both engines produce comparable emails.
 */

import { llmPolishClient } from './llm-polish.js';

const OUTLINE = `# Meeting Minutes Report

## 1. General Information
* **Meeting Name/Title:**
* **Date:**
* **Time:** [Start] - [End]
* **Location:**

## 2. Attendees
* **Chairperson:**
* **Secretary/Minute Taker:** AI-generated
* **Present:**
* **Absent:**
* **Guests:**

## 3. Meeting Objectives & Agenda
* **Objective:**
* **Agenda Items:**

## 4. Meeting Discussions
* **[Topic]**
    * *Discussion:*

## 5. Decisions Made
* [Decision]
* *Pending Issues:*

## 6. Action Items
| Task / Action | Person in Charge (PIC) | Deadline | Status |
| :--- | :--- | :--- | :--- |

## 7. Closing & Signatures
* **Adjournment Time:**
* **Next Meeting:**`;

export async function generateMinutesGemini({ transcript, apiKey, model, targetLang }) {
    const systemPrompt = [
        `You write meeting minutes from a live-translated meeting transcript (original lines plus translations).`,
        `Write the minutes in ${targetLang}. Follow this Markdown outline exactly:`,
        ``,
        OUTLINE,
        ``,
        `Rules:`,
        `- Only include information present in or clearly inferable from the transcript. Use [N/A] when unknown, [TBD] for missing deadlines.`,
        `- Summarize, do not transcribe. Attribute points to speakers when identifiable.`,
        `- Separate what was discussed from what was decided.`,
        `- Output only the minutes Markdown, no preamble.`,
    ].join('\n');

    const text = await llmPolishClient._callGemini({
        providerCfg: { apiKey, model },
        systemPrompt,
        userPrompt: transcript,
        maxTokens: 16384,
    });
    if (!text?.trim()) throw new Error('Gemini returned empty minutes');
    return text.trim();
}
