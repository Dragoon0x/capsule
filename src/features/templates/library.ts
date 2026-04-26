import type {
  Capsule,
  Item,
  TextItem,
  CodeItem,
  UrlItem,
  ImageItem,
  FileItem,
  VoiceItem,
} from '../capsules/types';

/** Distributive Omit: lets us strip fields from a discriminated union without losing branches. */
type ItemDraft =
  | Omit<TextItem, 'createdAt' | 'updatedAt'>
  | Omit<CodeItem, 'createdAt' | 'updatedAt'>
  | Omit<UrlItem, 'createdAt' | 'updatedAt'>
  | Omit<ImageItem, 'createdAt' | 'updatedAt'>
  | Omit<FileItem, 'createdAt' | 'updatedAt'>
  | Omit<VoiceItem, 'createdAt' | 'updatedAt'>;

/**
 * Curated starter capsules. Each is a static template; users fork into their library.
 * IDs are placeholders ('tpl_*') — fork() generates fresh ids before persisting.
 */

export interface TemplateMeta {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Capsule body (without persistence-bound fields like seq/createdAt) */
  capsule: Omit<Capsule, 'createdAt' | 'updatedAt' | 'lastUsedAt' | 'seq'>;
}

const now = 0; // placeholder; fork() sets real timestamps
function it(o: ItemDraft): Item {
  return { ...o, createdAt: now, updatedAt: now } as Item;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'tpl_code_review',
    name: 'Code review',
    emoji: '🔎',
    blurb: 'A consistent rubric for reviewing pull requests.',
    capsule: {
      id: 'tpl_code_review',
      title: 'Code review rubric',
      description: 'Drop a diff into scratch, deploy, get a structured review.',
      tags: ['engineering', 'review'],
      pinned: false,
      vars: { language: 'TypeScript' },
      items: [
        it({
          id: 'tpl_cr_1',
          type: 'text',
          order: 0,
          label: 'Reviewer principles',
          text: '- Correctness over style; flag anything that could ship a bug.\n- Suggest tests for new branching logic.\n- Reject patches that mix unrelated changes.\n- Prefer small, mergeable suggestions over large rewrites.',
        }),
        it({
          id: 'tpl_cr_2',
          type: 'text',
          order: 1,
          label: 'Style rules',
          text: '- {{language}} strict; no `any` without explicit justification.\n- Functions ≤ 40 lines unless tabular.\n- Prefer named exports.\n- One assertion per test; descriptive `it(...)`.',
        }),
        it({
          id: 'tpl_cr_3',
          type: 'text',
          order: 2,
          label: 'What to output',
          text: '1. Summary of intent (1 sentence)\n2. Risks / regressions ordered by severity\n3. Inline suggestions with line numbers\n4. Tests you would add\n5. Final verdict: approve / request changes / block',
        }),
      ],
    },
  },
  {
    id: 'tpl_bug_triage',
    name: 'Bug triage',
    emoji: '🪲',
    blurb: 'Standard structure for diagnosing a customer-reported bug.',
    capsule: {
      id: 'tpl_bug_triage',
      title: 'Bug triage',
      description: 'Paste the ticket and stack trace into scratch; deploy.',
      tags: ['support', 'triage'],
      pinned: false,
      vars: { product: 'our app' },
      items: [
        it({
          id: 'tpl_bt_1',
          type: 'text',
          order: 0,
          label: 'Triage method',
          text: 'Walk through these in order:\n1. Reproduce mentally from the report.\n2. Identify the smallest plausible cause.\n3. Rule it in or out with the available evidence.\n4. Decide: bug / config / user error / known issue.\n5. Recommend next action.',
        }),
        it({
          id: 'tpl_bt_2',
          type: 'text',
          order: 1,
          label: 'Output shape',
          text: '- **Severity**: P0 / P1 / P2 / P3\n- **Likely cause**: …\n- **Confidence**: low / medium / high\n- **Evidence**: bullet list pulled from the report\n- **Next step**: who needs to do what\n- **Customer reply (draft)**: 2–3 sentences',
        }),
        it({
          id: 'tpl_bt_3',
          type: 'text',
          order: 2,
          label: 'Tone',
          text: 'Speak as a calm, senior support engineer for {{product}}. Never blame the customer; never speculate beyond the evidence.',
        }),
      ],
    },
  },
  {
    id: 'tpl_cold_email',
    name: 'Cold email',
    emoji: '✉️',
    blurb: 'Outreach that doesn\u2019t feel like spam — short, specific, kind.',
    capsule: {
      id: 'tpl_cold_email',
      title: 'Cold email',
      description: 'Set vars per prospect and deploy.',
      tags: ['sales', 'outreach'],
      pinned: false,
      vars: { product: '', sender: '', prospect: '', company: '', topic: '' },
      items: [
        it({
          id: 'tpl_ce_1',
          type: 'text',
          order: 0,
          label: 'Constraints',
          text: '- Under 90 words.\n- One specific reason it\u2019s relevant to {{prospect}} at {{company}}.\n- No flattery, no buzzwords, no \u201cquick chat?\u201d\n- One concrete ask. End with a question.',
        }),
        it({
          id: 'tpl_ce_2',
          type: 'text',
          order: 1,
          label: 'About the product',
          text: '{{product}} — what it does in one sentence; the one outcome customers usually care about; one customer quote (don\u2019t fabricate; if blank, omit).',
        }),
        it({
          id: 'tpl_ce_3',
          type: 'text',
          order: 2,
          label: 'About the sender',
          text: 'I\u2019m {{sender}}. Tone: dry, friendly, low-pressure. Sign off with first name.',
        }),
        it({
          id: 'tpl_ce_4',
          type: 'text',
          order: 3,
          label: 'Recent context',
          text: 'Reference {{topic}} — something the prospect or their company has shipped/written/announced recently. If nothing fits, say so and skip the reference.',
        }),
      ],
    },
  },
  {
    id: 'tpl_research_notes',
    name: 'Research notes',
    emoji: '📚',
    blurb: 'Synthesize sources into a draft you can iterate on.',
    capsule: {
      id: 'tpl_research_notes',
      title: 'Research notes',
      description: 'Add URLs, quotes, screenshots, voice notes; deploy as a synthesis.',
      tags: ['research', 'writing'],
      pinned: false,
      vars: { audience: 'engineers' },
      items: [
        it({
          id: 'tpl_rn_1',
          type: 'text',
          order: 0,
          label: 'Synthesis brief',
          text: 'Synthesize the attached sources into a 600-word draft for {{audience}}.\n\nRules:\n- Cite each source by its URL (footnoted or inline).\n- Distinguish facts from opinions.\n- Flag any contradiction between sources explicitly.\n- End with three open questions worth pursuing.',
        }),
        it({
          id: 'tpl_rn_2',
          type: 'text',
          order: 1,
          label: 'Sources',
          text: '(Paste URLs and notes as items below. Each URL becomes its own block — Capsule auto-detects.)',
        }),
      ],
    },
  },
  {
    id: 'tpl_interview_prep',
    name: 'Interview prep',
    emoji: '🎯',
    blurb: 'Generate likely questions and strong answers grounded in your stories.',
    capsule: {
      id: 'tpl_interview_prep',
      title: 'Interview prep',
      description: 'Set role/company; add resume + STAR stories; deploy before the interview.',
      tags: ['career'],
      pinned: false,
      vars: { role: 'Staff Engineer', company: '', interviewer: '' },
      items: [
        it({
          id: 'tpl_ip_1',
          type: 'text',
          order: 0,
          label: 'Goal',
          text: 'Generate 8 likely interview questions for a {{role}} interview at {{company}}{{interviewer}}, then a strong answer for each — no more than 4 sentences per answer — drawing on the resume and stories below. Where a story doesn\u2019t fit, say so.',
        }),
        it({
          id: 'tpl_ip_2',
          type: 'text',
          order: 1,
          label: 'My resume highlights',
          text: '(Paste resume bullets here.)',
        }),
        it({
          id: 'tpl_ip_3',
          type: 'text',
          order: 2,
          label: 'STAR stories',
          text: '(Paste 4-6 STAR stories — Situation/Task/Action/Result.)',
        }),
      ],
    },
  },
  {
    id: 'tpl_retro',
    name: 'Sprint retro',
    emoji: '🔁',
    blurb: 'Turn raw retro notes into a structured set of decisions and follow-ups.',
    capsule: {
      id: 'tpl_retro',
      title: 'Sprint retro',
      description: 'Drop in raw notes from the retro; deploy for a structured summary.',
      tags: ['team', 'retro'],
      pinned: false,
      vars: { team: '', sprint: '' },
      items: [
        it({
          id: 'tpl_re_1',
          type: 'text',
          order: 0,
          label: 'Output structure',
          text: 'Produce 4 sections, each ≤ 150 words:\n1. **Wins** — what to repeat\n2. **Friction** — what to fix; assign each to a person + due date\n3. **Surprises** — interesting unknowns to chase later\n4. **Decisions** — concrete commitments for next sprint\n\nDo NOT moralize. No \u201cwe should consider\u201d — every action item has an owner.',
        }),
        it({
          id: 'tpl_re_2',
          type: 'text',
          order: 1,
          label: 'Context',
          text: 'Team: {{team}}. Sprint: {{sprint}}.',
        }),
      ],
    },
  },
];

export function findTemplate(id: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
