import { useMemo, useState } from 'react';
import { Copy, Download, Rocket, Share2, Sparkles, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { useCapsulesStore, selectAllOrdered } from '../../features/capsules/store';
import { useDeployStore } from '../../features/deploy/store';
import { useCompiled } from '../../features/deploy/useCompiled';
import { estimateTokens } from '../../features/compile/tokenCount';
import { writeClipboard, downloadFile } from '../../lib/clipboard';
import { scanForSecrets, redactText, type SecretFinding } from '../../lib/secrets';
import { useHistoryStore } from '../../features/history/store';
import { toast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';
import { Switch } from '../ui/Switch';
import { Tip, TooltipProvider } from '../ui/Tooltip';
import { Textarea, Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Separator } from '../ui/Separator';
import { EmptyDeploy } from '../EmptyStates/EmptyDeploy';
import { SensitiveWarning } from '../SensitiveWarning';
import { toUserMessage } from '../../lib/errors';
import { cn } from '../../lib/cn';

interface Props {
  onShare: () => void;
}

export function DeployPanel({ onShare }: Props) {
  const capsules = useCapsulesStore(selectAllOrdered);
  const selected = useDeployStore((s) => s.selectedCapsuleIds);
  const toggle = useDeployStore((s) => s.toggleCapsule);
  const clearSel = useDeployStore((s) => s.clearSelection);
  const task = useDeployStore((s) => s.task);
  const setTask = useDeployStore((s) => s.setTask);
  const format = useDeployStore((s) => s.format);
  const setFormat = useDeployStore((s) => s.setFormat);
  const includeImages = useDeployStore((s) => s.includeImages);
  const setIncludeImages = useDeployStore((s) => s.setIncludeImages);
  const vars = useDeployStore((s) => s.vars);
  const setVar = useDeployStore((s) => s.setVar);
  const touchUsed = useCapsulesStore((s) => s.touchUsed);
  const addHistory = useHistoryStore((s) => s.add);

  const compiled = useCompiled();
  const tokenCount = useMemo(() => estimateTokens(compiled.text), [compiled.text]);
  const findings = useMemo(() => scanForSecrets(compiled.text), [compiled.text]);
  const highSeverity = useMemo(() => findings.some((f) => f.severity === 'high'), [findings]);

  const [warnOpen, setWarnOpen] = useState<SecretFinding[] | null>(null);

  const selectedCapsules = useMemo(
    () => selected.map((id) => capsules.find((c) => c.id === id)).filter(Boolean),
    [selected, capsules],
  );

  const persistHistory = (text: string): void => {
    void addHistory({
      format,
      preview: text.slice(0, 280),
      text: text.slice(0, 64 * 1024),
      tokenEstimate: estimateTokens(text),
      capsuleIds: selected,
      task,
    });
  };

  const doCopy = async (text: string): Promise<void> => {
    try {
      await writeClipboard(text);
      toast('Prompt copied to clipboard.', 'success');
      for (const id of selected) void touchUsed(id);
      persistHistory(text);
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  const onCopyClick = async (): Promise<void> => {
    if (highSeverity) {
      setWarnOpen(findings);
      return;
    }
    await doCopy(compiled.text);
  };

  const onDownload = (): void => {
    const ext = format === 'xml' ? 'xml' : 'md';
    downloadFile(`prompt.${ext}`, compiled.text, format === 'xml' ? 'application/xml' : 'text/markdown');
    persistHistory(compiled.text);
    toast('Prompt downloaded.', 'success');
  };

  const neededVars = compiled.referencedVars;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex-shrink-0 border-b border-border bg-card/40 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Deploy</h2>
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                onClick={clearSel}
              >
                Clear ({selected.length})
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-4 py-4">
            <section>
              <Label className="mb-1.5 block">Capsules</Label>
              {selectedCapsules.length === 0 ? (
                <EmptyDeploy />
              ) : (
                <div className="rounded-md border border-border bg-card">
                  {selectedCapsules.map((c, i) =>
                    c ? (
                      <div
                        key={c.id}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 text-sm',
                          i !== selectedCapsules.length - 1 && 'border-b border-border',
                        )}
                      >
                        <span className="flex-1 truncate">{c.title}</span>
                        <span className="tabular text-[11px] text-muted-foreground">{c.items.length}</span>
                        <Tip content={`Remove ${c.title}`}>
                          <button
                            type="button"
                            onClick={() => toggle(c.id)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                            aria-label={`Remove ${c.title} from deploy`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Tip>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </section>

            <section>
              <Label htmlFor="deploy-task" className="mb-1.5 block">
                Task
              </Label>
              <Textarea
                id="deploy-task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="What do you want the model to do?"
                rows={2}
                className="resize-none"
              />
            </section>

            {neededVars.length > 0 && (
              <section>
                <Label className="mb-1.5 block">Variables</Label>
                <div className="space-y-1.5 rounded-md border border-border bg-card p-2">
                  {neededVars.map((name) => (
                    <div key={name} className="flex items-center gap-2">
                      <code className="w-24 flex-shrink-0 truncate text-[11px] text-muted-foreground">
                        {`{{${name}}}`}
                      </code>
                      <Input
                        value={vars[name] ?? ''}
                        onChange={(e) => setVar(name, e.target.value)}
                        className="h-7 text-[12px]"
                        placeholder="value"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Format</Label>
                <Tabs value={format} onValueChange={(v) => setFormat(v as 'xml' | 'markdown')}>
                  <TabsList>
                    <TabsTrigger value="xml">XML</TabsTrigger>
                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="inline-images">Inline images</Label>
                <Switch
                  id="inline-images"
                  checked={includeImages}
                  onCheckedChange={setIncludeImages}
                />
              </div>
            </section>

            {compiled.unresolvedVars.length > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2.5 text-xs text-warning"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <div>
                  Unresolved variables: <code className="font-mono">{compiled.unresolvedVars.join(', ')}</code>
                </div>
              </div>
            )}

            {findings.length > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2.5 text-xs"
              >
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warning" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {findings.length} possible secret{findings.length === 1 ? '' : 's'} found
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    Review before copying. Click &lsquo;Copy&rsquo; to see redact options.
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Preview</Label>
                <span className="tabular text-[11px] text-muted-foreground">
                  ~{tokenCount.toLocaleString()} tokens
                </span>
              </div>
              <pre
                className={cn(
                  'max-h-72 min-h-[6rem] overflow-auto rounded-md border border-border bg-muted/40 p-2.5',
                  'font-mono text-[10.5px] leading-relaxed text-foreground',
                )}
                aria-label="Compiled prompt preview"
              >
                {compiled.text || (
                  <span className="text-muted-foreground">Compiled output will appear here.</span>
                )}
              </pre>
            </section>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-border bg-card/40 p-3">
          <div className="flex gap-1.5">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => void onCopyClick()}
              disabled={compiled.text.length === 0}
            >
              <Copy /> Copy
            </Button>
            <Tip content="Download as file">
              <Button variant="outline" size="icon" onClick={onDownload} aria-label="Download prompt" disabled={compiled.text.length === 0}>
                <Download />
              </Button>
            </Tip>
            <Tip content="Share">
              <Button variant="outline" size="icon" onClick={onShare} aria-label="Share">
                <Share2 />
              </Button>
            </Tip>
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[10.5px] text-muted-foreground">
            <Sparkles className="h-2.5 w-2.5" /> mechanical — no data leaves your device
          </div>
        </div>

        {warnOpen && (
          <SensitiveWarning
            open
            findings={warnOpen}
            onCancel={() => setWarnOpen(null)}
            onContinue={() => {
              setWarnOpen(null);
              void doCopy(compiled.text);
            }}
            onRedact={() => {
              setWarnOpen(null);
              const redacted = redactText(compiled.text, findings);
              void doCopy(redacted);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
