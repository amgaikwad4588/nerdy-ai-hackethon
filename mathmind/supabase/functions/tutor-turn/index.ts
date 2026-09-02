// Supabase Edge Function (Deno): the Socratic tutor brain.
//
// Receives one student turn, calls the Claude Messages API with FORCED tool use so
// the model must return a structured judgment (not prose we have to parse), and
// relays that judgment to the app. Model-tiered: Haiku for routine turns, Sonnet
// escalation when the answer is wrong (that's where misconception analysis matters).
//
// Deploy:  supabase functions deploy tutor-turn
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// The Anthropic key lives here, never in the client.

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Misconception {
  tag: string;
  description: string;
  remediation: string;
}

interface TurnRequest {
  skill: { title: string; code: string; grade: number };
  task: { prompt: string; correctAnswer: string; difficulty: number };
  studentAnswer: string;
  studentThinking: string;
  misconceptions: Misconception[];
}

// The structured shape Claude must return, enforced via strict tool use.
const TUTOR_TOOL = {
  name: 'record_tutor_turn',
  description:
    'Record your assessment of the student turn and the coaching reply to show the child.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      isCorrect: { type: 'boolean', description: 'Is the final answer correct?' },
      isOnTrack: {
        type: 'boolean',
        description: 'Is the reasoning heading the right way, even if not finished?',
      },
      misconceptionTag: {
        type: ['string', 'null'],
        description:
          'The tag of the matching misconception from the provided bank, or null if none applies.',
      },
      message: {
        type: 'string',
        description:
          'Warm, Socratic reply for a child aged 8-11. One or two short sentences. If wrong, nudge and scaffold — never just give the answer.',
      },
      hint: {
        type: 'string',
        description: 'A concrete next step. Empty string if the answer was correct.',
      },
      difficultyDelta: {
        type: 'integer',
        enum: [-1, 0, 1],
        description: 'Adjust next task difficulty: +1 harder, 0 same, -1 easier.',
      },
      masterySignal: {
        type: 'number',
        description: 'How much this turn demonstrates mastery, from 0.0 to 1.0.',
      },
    },
    required: [
      'isCorrect',
      'isOnTrack',
      'misconceptionTag',
      'message',
      'hint',
      'difficultyDelta',
      'masterySignal',
    ],
  },
} as const;

function buildPrompt(body: TurnRequest): string {
  const bank = body.misconceptions
    .map((m) => `- ${m.tag}: ${m.description} (fix idea: ${m.remediation})`)
    .join('\n');
  return `You are MathMind, a kind, encouraging math tutor for a grade ${body.skill.grade} student.
You coach through their THINKING, never just grade answers. If they are wrong, you name what
might be going on (using the misconception bank when it fits) and nudge them — you do NOT reveal
the answer. Keep replies to one or two short, warm sentences a child aged 8-11 can read.

Skill: ${body.skill.title} (${body.skill.code})
Task shown to student: ${body.task.prompt}
Correct answer: ${body.task.correctAnswer}
Student's answer: ${body.studentAnswer}
Student's explanation of their thinking: ${body.studentThinking || '(none given)'}

Known misconceptions for this skill:
${bank || '(none catalogued)'}

Assess the turn and record it with the record_tutor_turn tool.`;
}

async function callClaude(model: string, prompt: string) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      tools: [TUTOR_TOOL],
      tool_choice: { type: 'tool', name: 'record_tutor_turn' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const toolUse = data.content?.find((b: { type: string }) => b.type === 'tool_use');
  if (!toolUse) throw new Error('No tool_use block in Claude response');
  return toolUse.input;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    const body = (await req.json()) as TurnRequest;

    // Quick local correctness check drives the model tier: correct answers only need
    // fast/cheap Haiku; wrong answers get Sonnet for careful misconception analysis.
    const looksCorrect =
      body.studentAnswer.trim().toLowerCase().replace(/\s+/g, '') ===
      body.task.correctAnswer.trim().toLowerCase().replace(/\s+/g, '');
    const model = looksCorrect ? 'claude-haiku-4-5' : 'claude-sonnet-4-6';

    const result = await callClaude(model, buildPrompt(body));

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
