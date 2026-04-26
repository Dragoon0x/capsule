import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore, HISTORY_MAX } from '../../src/features/history/store';

describe('history store', () => {
  beforeEach(async () => {
    await useHistoryStore.getState().clear();
  });

  it('appends entries to the front', async () => {
    await useHistoryStore.getState().add({
      format: 'xml',
      preview: 'a',
      text: 'a',
      tokenEstimate: 1,
      capsuleIds: ['cap_a'],
      task: 'task1',
    });
    await useHistoryStore.getState().add({
      format: 'markdown',
      preview: 'b',
      text: 'b',
      tokenEstimate: 1,
      capsuleIds: ['cap_b'],
      task: 'task2',
    });
    const entries = useHistoryStore.getState().entries;
    expect(entries[0]?.task).toBe('task2');
    expect(entries[1]?.task).toBe('task1');
  });

  it(`caps at ${HISTORY_MAX} entries`, async () => {
    for (let i = 0; i < HISTORY_MAX + 5; i += 1) {
      await useHistoryStore.getState().add({
        format: 'xml',
        preview: `p${i}`,
        text: `t${i}`,
        tokenEstimate: i,
        capsuleIds: [],
        task: `task${i}`,
      });
    }
    expect(useHistoryStore.getState().entries.length).toBe(HISTORY_MAX);
    // Newest first; first task should be the very last we added.
    expect(useHistoryStore.getState().entries[0]?.task).toBe(`task${HISTORY_MAX + 4}`);
  });

  it('removes by id', async () => {
    const entry = await useHistoryStore.getState().add({
      format: 'xml',
      preview: 'p',
      text: 't',
      tokenEstimate: 1,
      capsuleIds: [],
      task: '',
    });
    await useHistoryStore.getState().remove(entry.id);
    expect(useHistoryStore.getState().entries.find((e) => e.id === entry.id)).toBeUndefined();
  });

  it('clear empties everything', async () => {
    await useHistoryStore.getState().add({
      format: 'xml',
      preview: 'p',
      text: 't',
      tokenEstimate: 1,
      capsuleIds: [],
      task: '',
    });
    await useHistoryStore.getState().clear();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });
});
