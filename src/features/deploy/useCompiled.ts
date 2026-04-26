import { useMemo } from 'react';
import { useCapsulesStore } from '../capsules/store';
import { useDeployStore } from './store';
import { toIR, extractVarNames } from '../compile/serialize';
import { toXml } from '../compile/toXml';
import { toMarkdown } from '../compile/toMarkdown';
import { mergeVars } from '../compile/variables';

export interface CompiledResult {
  text: string;
  unresolvedVars: string[];
  referencedVars: string[];
  format: 'xml' | 'markdown';
}

export function useCompiled(): CompiledResult {
  const capsulesById = useCapsulesStore((s) => s.byId);
  const selectedIds = useDeployStore((s) => s.selectedCapsuleIds);
  const scratch = useDeployStore((s) => s.scratchItems);
  const task = useDeployStore((s) => s.task);
  const vars = useDeployStore((s) => s.vars);
  const globalVars = useDeployStore((s) => s.globalVars);
  const format = useDeployStore((s) => s.format);
  const includeImages = useDeployStore((s) => s.includeImages);

  return useMemo<CompiledResult>(() => {
    const capsules = selectedIds
      .map((id) => capsulesById[id])
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    const mergedVars = mergeVars(vars, capsules, globalVars);
    const input = { capsules, scratch, task, vars: mergedVars, includeImages };
    const ir = toIR(input);
    const text = format === 'xml' ? toXml(ir) : toMarkdown(ir);
    const referenced = extractVarNames(input);
    return {
      text,
      unresolvedVars: ir.unresolvedVars,
      referencedVars: referenced,
      format,
    };
  }, [capsulesById, selectedIds, scratch, task, vars, globalVars, format, includeImages]);
}
