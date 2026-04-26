import { EmptyDeployArt } from './illustrations';

export function EmptyDeploy() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-6 text-center">
      <EmptyDeployArt className="h-20 w-44 text-muted-foreground/40" />
      <div className="text-xs text-muted-foreground">
        Pick capsules from the library to assemble a prompt.
      </div>
    </div>
  );
}
