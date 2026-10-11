"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useMessageTiming,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CopyIcon,
  Database,
  Mic,
  Moon,
  PencilIcon,
  RefreshCwIcon,
  Square,
  Sun,
  ThumbsDown,
  ThumbsUp,
  XIcon,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import { useAttachmentSrc } from "./use-attachment-src";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { CloneThreadShell } from "./clone-thread-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export const Grok: FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const dark = window.localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const dark = !isDark;
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("theme", dark ? "dark" : "light");
    setIsDark(dark);
  };

  return (
    <CloneThreadShell>
      <ThreadPrimitive.Root className="relative flex h-full flex-col items-stretch bg-background text-foreground ">
        <div
          className="absolute top-3 right-4 z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
           <AnimatedThemeToggler />
        </div>

        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 flex items-center gap-3">
              <Database className="size-9 text-foreground" aria-hidden="true" />
              <h1 className="text-2xl font-semibold tracking-tight">SQLGPT</h1>
            </div>
            <Composer />
          </div>
        </AuiIf>

        <AuiIf condition={(s) => s.thread.isEmpty === false}>
          <ThreadPrimitive.Viewport
            className="flex grow flex-col overflow-y-scroll pt-16"
          >
            <ThreadPrimitive.Messages>
              {() => <ChatMessage />}
            </ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>
          <Composer />
        </AuiIf>
      </ThreadPrimitive.Root>
    </CloneThreadShell>
  );
};

const Composer: FC = () => {
  const isEmpty = useAuiState((s) => s.composer.isEmpty);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root
      className="group/composer mx-auto mb-3 w-full max-w-3xl"
      data-empty={isEmpty}
      data-running={isRunning}
    >
      <div className="overflow-hidden rounded-4xl bg-muted/50 ring-1 ring-border transition-shadow ring-inset focus-within:ring-ring">
        <AuiIf condition={(s) => s.composer.attachments.length > 0}>
          <div className="flex flex-row flex-wrap gap-2 px-4 pt-3">
            <ComposerPrimitive.Attachments>
              {() => <GrokAttachment />}
            </ComposerPrimitive.Attachments>
          </div>
        </AuiIf>

        <div className="flex items-end gap-1 p-2 pl-6">
          <ComposerPrimitive.Input
            placeholder="What do you want to know?"
            minRows={1}
            className="my-2 h-6 max-h-100 min-w-0 flex-1 resize-none bg-transparent text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />

          <GrokModelPicker />

          <div className="relative mb-0.5 h-9 w-9 shrink-0 rounded-full bg-foreground text-background">
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[empty=false]/composer:scale-0 group-data-[empty=false]/composer:opacity-0 group-data-[running=true]/composer:scale-0 group-data-[running=true]/composer:opacity-0"
              aria-label="Voice mode"
            >
              <Mic width={18} height={18} />
            </button>

            <ComposerPrimitive.Send className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[empty=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 group-data-[running=true]/composer:scale-0 group-data-[running=true]/composer:opacity-0">
              <ArrowUpIcon width={18} height={18} />
            </ComposerPrimitive.Send>

            <ComposerPrimitive.Cancel className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0">
              <Square width={14} height={14} fill="currentColor" />
            </ComposerPrimitive.Cancel>
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const GrokModelPicker: FC = () => {
  const [text, setText] = useState("Schema");
  const [draft, setDraft] = useState(text);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const submitText = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextText = draft.trim();
    if (!nextText) return;
    setText(nextText);
    setIsOpen(false);
  };

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setDraft(text);
        setIsOpen(open);
      }}
    >
      <DropdownMenuTrigger className="mb-0.5 flex h-9 shrink-0 items-center gap-2 rounded-full px-2.5 text-foreground hover:bg-accent">
        <Zap width={18} height={18} className="shrink-0" />
        <div className="flex items-center gap-1 overflow-hidden transition-[max-width,opacity] duration-300 group-data-[empty=false]/composer:max-w-0 group-data-[empty=false]/composer:opacity-0 group-data-[empty=true]/composer:max-w-32 group-data-[empty=true]/composer:opacity-100">
          <span className="text-sm font-semibold whitespace-nowrap">
            {text}
          </span>
          <ChevronDownIcon width={16} height={16} className="shrink-0" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(32rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-3"
      >
        <form onSubmit={submitText}>
          <label
            htmlFor="grok-text-input"
            className="mb-2 block text-xs font-medium text-muted-foreground"
          >
            Paste DB Schema
          </label>
          <textarea
            ref={inputRef}
            id="grok-text-input"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            rows={8}
            className="min-h-48 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message relative mx-auto mb-2 flex w-full max-w-3xl flex-col pb-0.5">
      <AuiIf condition={(s) => s.message.role === "user"}>
        <div className="flex flex-col items-end">
          <div className="relative max-w-[90%] rounded-3xl rounded-br-lg border border-border bg-muted px-4 py-3 text-foreground">
            <div className="prose prose-sm dark:prose-invert prose-p:my-0 wrap-break-word">
              <MessagePrimitive.Parts>
                {({ part }) => {
                  if (part.type === "text") return <MarkdownText />;
                  return null;
                }}
              </MessagePrimitive.Parts>
            </div>
          </div>
          <div className="mt-1 flex h-8 items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Root className="flex items-center gap-0.5">
              <ActionBarPrimitive.Edit className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <PencilIcon width={16} height={16} />
              </ActionBarPrimitive.Edit>
              <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <CopyIcon width={16} height={16} />
              </ActionBarPrimitive.Copy>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AuiIf>

      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex flex-col items-start">
          <div className="w-full max-w-none">
            <div className="prose prose-sm dark:prose-invert prose-li:my-1 prose-ol:my-1 prose-p:my-2 prose-ul:my-1 wrap-break-word text-foreground">
              <MessagePrimitive.Parts>
                {({ part }) => {
                  if (part.type === "text") return <MarkdownText />;
                  return null;
                }}
              </MessagePrimitive.Parts>
            </div>
          </div>
          <div className="mt-1 flex h-8 w-full items-center justify-start gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Root className="-ml-2 flex items-center gap-0.5">
              <ActionBarPrimitive.Reload className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <RefreshCwIcon width={16} height={16} />
              </ActionBarPrimitive.Reload>
              <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <CopyIcon width={16} height={16} />
              </ActionBarPrimitive.Copy>

              <MessageTimingDisplay />
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AuiIf>
    </MessagePrimitive.Root>
  );
};

const formatTime = (ms: number | undefined) => {
  if (ms === undefined) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatMs = (ms: number | undefined) => {
  if (ms === undefined) return "\u2014";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const MessageTimingDisplay: FC = () => {
  const timing = useMessageTiming();
  if (!timing?.totalStreamTime) return null;

  const totalTimeText = formatTime(timing.totalStreamTime);
  if (!totalTimeText) return null;

  return (
    <div className="group/timing relative">
      <button
        type="button"
        className="ml-1 flex h-auto items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-xs text-muted-foreground tabular-nums transition-colors hover:bg-accent hover:text-foreground"
      >
        {totalTimeText}
      </button>
      <div className="pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 scale-95 rounded-lg border border-border bg-popover px-3 py-2 opacity-0 transition-all group-hover/timing:pointer-events-auto group-hover/timing:scale-100 group-hover/timing:opacity-100 before:absolute before:top-0 before:-left-2 before:h-full before:w-2 before:content-['']">
        <div className="grid min-w-[140px] gap-1.5 text-xs">
          {timing.firstTokenTime !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                First token
              </span>
              <span className="font-mono text-foreground tabular-nums">
                {formatMs(timing.firstTokenTime)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono text-foreground tabular-nums">
              {formatMs(timing.totalStreamTime)}
            </span>
          </div>
          {timing.tokensPerSecond !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Speed</span>
              <span className="font-mono text-foreground tabular-nums">
                {timing.tokensPerSecond.toFixed(1)} tok/s
              </span>
            </div>
          )}
          {timing.totalChunks > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Chunks</span>
              <span className="font-mono text-foreground tabular-nums">
                {timing.totalChunks}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GrokAttachment: FC = () => {
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/attachment relative">
      <div className="flex h-12 items-center gap-2 overflow-hidden rounded-xl border border-border bg-muted p-0.5 transition-colors hover:border-ring">
        <AuiIf condition={(s) => s.attachment.type === "image"}>
          {src ? (
            <img
              className="h-full w-12 rounded-[9px] object-cover"
              alt="Attachment"
              src={src}
            />
          ) : (
            <div className="flex h-full w-12 items-center justify-center rounded-[9px] bg-accent text-muted-foreground">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </AuiIf>
        <AuiIf condition={(s) => s.attachment.type !== "image"}>
          <div className="flex h-full w-12 items-center justify-center rounded-[9px] bg-accent text-muted-foreground">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        </AuiIf>
      </div>
      <AttachmentPrimitive.Remove className="absolute -top-1.5 -right-1.5 flex h-6 w-6 scale-50 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 transition-all group-hover/attachment:scale-100 group-hover/attachment:opacity-100 hover:bg-accent hover:text-foreground">
        <XIcon width={14} height={14} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};
