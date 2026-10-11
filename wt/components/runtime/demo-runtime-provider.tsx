"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  createLocalStorageAdapter,
  createSimpleTitleAdapter,
  useRemoteThreadListRuntime,
  type AsyncStorageLike,
} from "@assistant-ui/core/react";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

const browserStorage: AsyncStorageLike = {
  async getItem(key) {
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    window.localStorage.removeItem(key);
  },
};

const localThreadAdapter = createLocalStorageAdapter({
  storage: browserStorage,
  titleGenerator: createSimpleTitleAdapter(),
});

const SYSTEM_PROMPT =
  "You are a SQL assistant. Use the provided database schema to answer the question with a valid SQL query. Return only the SQL query.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readTextParts = (message: unknown) => {
  if (!isRecord(message) || !Array.isArray(message.parts)) return "";

  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        isRecord(part) && part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("\n");
};

const createTextResponse = (text: string) => {
  const messageId = `msg-${crypto.randomUUID()}`;
  const textId = `text-${crypto.randomUUID()}`;
  const chunks = [
    { type: "start", messageId },
    { type: "start-step" },
    { type: "text-start", id: textId },
    { type: "text-delta", id: textId, delta: text },
    { type: "text-end", id: textId },
    { type: "finish-step" },
    { type: "finish" },
  ];
  const body =
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
    "data: [DONE]\n\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
};

const waitForNextPoll = (signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, 2000);
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(signal?.reason);
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const makeBackendRequest = async (
  _input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const backendUrl = window.localStorage.getItem("backend-url")?.trim();
  if (!backendUrl) return createTextResponse("Backend URL is not configured.");

  let parsedBackendUrl: URL;
  try {
    parsedBackendUrl = new URL(backendUrl);
  } catch {
    return createTextResponse("Inference failed: Backend URL is invalid.");
  }
  if (
    parsedBackendUrl.protocol !== "http:" &&
    parsedBackendUrl.protocol !== "https:"
  ) {
    return createTextResponse("Inference failed: Backend URL must use HTTP or HTTPS.");
  }

  const requestBody =
    typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
  if (!isRecord(requestBody) || !Array.isArray(requestBody.messages)) {
    return createTextResponse("Inference failed: Chat messages are missing.");
  }

  const schema = window.localStorage.getItem("db-schema") ?? "";
  const latestUserMessage = [...requestBody.messages]
    .reverse()
    .find((message) => isRecord(message) && message.role === "user");
  const question = readTextParts(latestUserMessage);

  if (!question) {
    return createTextResponse("Inference failed: No question was provided.");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Database Schema:\n${schema}\n\nQuestion:\n${question}\n\nSQL:`,
    },
  ];

  const signal = init?.signal ?? undefined;

  try {
    const generateResponse = await globalThis.fetch(
      new URL("/generate", parsedBackendUrl),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, max_new_tokens: 128 }),
        signal,
      },
    );
    if (!generateResponse.ok) {
      throw new Error(
        (await generateResponse.text()) ||
          `Backend returned HTTP ${generateResponse.status}.`,
      );
    }

    const jobResponse: unknown = await generateResponse.json();
    if (
      !isRecord(jobResponse) ||
      typeof jobResponse.job_id !== "string" ||
      !jobResponse.job_id
    ) {
      throw new Error("Backend response did not include a job ID.");
    }

    const resultUrl = new URL(
      `/result/${encodeURIComponent(jobResponse.job_id)}`,
      parsedBackendUrl,
    );

    while (true) {
      await waitForNextPoll(signal);
      const resultResponse = await globalThis.fetch(resultUrl, { signal });
      if (!resultResponse.ok) {
        throw new Error(
          (await resultResponse.text()) ||
            `Backend returned HTTP ${resultResponse.status}.`,
        );
      }

      const result: unknown = await resultResponse.json();
      if (!isRecord(result) || typeof result.status !== "string") {
        throw new Error("Backend returned an invalid job status.");
      }

      if (result.status === "queued" || result.status === "running") continue;
      if (result.status === "failed") {
        const detail =
          typeof result.error === "string" ? `: ${result.error}` : "";
        return createTextResponse(`Inference failed${detail}`);
      }
      if (
        result.status === "complete" &&
        typeof result.generated_text === "string"
      ) {
        return createTextResponse(result.generated_text);
      }
      throw new Error("Backend returned an invalid or incomplete job result.");
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof TypeError) {
      return createTextResponse(
        `Inference failed: Could not connect to ${parsedBackendUrl.origin}. ` +
          `Check that the backend is reachable and allows requests from ${window.location.origin} (CORS).`,
      );
    }
    return createTextResponse(`Inference failed: ${getErrorMessage(error)}`);
  }
};

export function DemoRuntimeProvider({ children }: { children: React.ReactNode }) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatRuntime({
        transport: new AssistantChatTransport({
          api: "/api/chat",
          fetch: makeBackendRequest,
        }),
      });
    },
    adapter: localThreadAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
