import type { Capsule } from '../capsules/types';
import { fuzzyMatch } from './fuzzy';

export interface SearchHit {
  capsule: Capsule;
  score: number;
}

function searchableString(c: Capsule): string {
  const parts: string[] = [c.title, c.description, c.tags.join(' ')];
  for (const it of c.items) {
    switch (it.type) {
      case 'text':
      case 'code':
      case 'voice':
        parts.push(it.text.slice(0, 400));
        break;
      case 'url':
        parts.push(it.title, it.href);
        break;
      case 'image':
      case 'file':
        parts.push(it.label);
        break;
    }
  }
  return parts.join(' \u0001 '); // separator unlikely to appear in content
}

export function search(capsules: Capsule[], query: string): SearchHit[] {
  const q = query.trim();
  if (!q) {
    return capsules.map((c) => ({ capsule: c, score: 1 }));
  }
  const results: SearchHit[] = [];
  for (const c of capsules) {
    // Title hits are strictly ranked above body-only hits.
    const titleMatch = fuzzyMatch(q, c.title);
    if (titleMatch) {
      results.push({ capsule: c, score: 1.0 + titleMatch.score });
      continue;
    }
    const bodyMatch = fuzzyMatch(q, searchableString(c));
    if (bodyMatch && bodyMatch.score > 0.15) {
      results.push({ capsule: c, score: bodyMatch.score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
