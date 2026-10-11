import { DemoRuntimeProvider } from "@/components/runtime/demo-runtime-provider";
import { Grok } from "@/components/examples/grok";

export default function Page() {
  return (
    <main className="h-dvh overflow-hidden">
      <DemoRuntimeProvider>
        <Grok />
      </DemoRuntimeProvider>
    </main>
  );
}
