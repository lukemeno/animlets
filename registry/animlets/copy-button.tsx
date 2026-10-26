"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type CopyFeedback = "idle" | "copied" | "error";

type CopyButtonProps = {
  value: string;
  idleLabel?: string;
  copiedLabel?: string;
  errorLabel?: string;
  resetMs?: number;
  feedback?: CopyFeedback;
  onFeedbackChange?: (feedback: CopyFeedback) => void;
  onCopy?: (value: string) => void;
  onError?: (error: unknown) => void;
  className?: string;
};

const COPY_BACK = "M4 7h8v8H4z";
const COPY_FRONT = "M7 4h8v8H7z";
const CHECK = "M4.5 8.2 7.2 11 12 5.8";
const ERROR_A = "M5 5l6 6";
const ERROR_B = "M11 5l-6 6";

function positiveReset(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1600;
}

async function writeClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {}
  }
  if (typeof document === "undefined") throw new Error("Clipboard write failed");
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "0";
  area.style.top = "0";
  area.style.opacity = "0";
  document.body.append(area);
  try {
    area.focus();
    area.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard write failed");
  } finally {
    area.remove();
  }
}

function Icon({ feedback }: { feedback: CopyFeedback }) {
  if (feedback === "copied") {
    return (
      <svg viewBox="0 0 16 16" className="size-4">
        <path d={CHECK} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (feedback === "error") {
    return (
      <svg viewBox="0 0 16 16" className="size-4">
        <path d={ERROR_A} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d={ERROR_B} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="size-4">
      <path d={COPY_BACK} fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d={COPY_FRONT} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconSlot({ motionOn, feedback, children }: { motionOn: boolean; feedback: CopyFeedback; children: ReactNode }) {
  const color =
    feedback === "copied" ? "text-emerald-800" : feedback === "error" ? "text-rose-800" : "text-foreground";
  if (!motionOn) {
    return (
      <span data-fade-in="" aria-hidden="true" className={color}>
        {children}
      </span>
    );
  }
  return (
    <motion.span
      key={feedback}
      data-fade-in=""
      aria-hidden="true"
      className={color}
      initial={{ scale: 0.84 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
}

export function CopyButton({
  value,
  idleLabel = "Copy",
  copiedLabel = "Copied",
  errorLabel = "Copy failed",
  resetMs,
  feedback,
  onFeedbackChange,
  onCopy,
  onError,
  className,
}: CopyButtonProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [internal, setInternal] = useState<CopyFeedback>("idle");
  const request = useRef(0);
  const timer = useRef(0);
  const mounted = useRef(true);
  const reset = positiveReset(resetMs);
  const shown = feedback ?? internal;

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  useLayoutEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const motionOn = ready && reduce === false;
  const label = shown === "copied" ? copiedLabel : shown === "error" ? errorLabel : idleLabel;
  const announcement = shown === "copied" ? copiedLabel : shown === "error" ? errorLabel : "";

  function publish(next: CopyFeedback) {
    if (!mounted.current) return;
    onFeedbackChange?.(next);
    if (feedback !== undefined) return;
    setInternal(next);
    window.clearTimeout(timer.current);
    if (next === "idle") return;
    timer.current = window.setTimeout(() => {
      if (mounted.current) setInternal("idle");
    }, reset);
  }

  async function activate() {
    const token = ++request.current;
    try {
      await writeClipboard(value);
      if (!mounted.current || request.current !== token) return;
      publish("copied");
      onCopy?.(value);
    } catch (error) {
      if (!mounted.current || request.current !== token) return;
      publish("error");
      onError?.(error);
    }
  }

  return (
    <span className={["inline-flex items-center", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        data-copy-button=""
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => {
          void activate();
        }}
      >
        <IconSlot motionOn={motionOn} feedback={shown}>
          <Icon feedback={shown} />
        </IconSlot>
        {label}
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </span>
  );
}

const DEMO_VALUE = "demo-token-123";

function Playback() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState<CopyFeedback>("idle");

  useLayoutEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (reduce !== false) {
      setFeedback("copied");
      return;
    }
    const toCopied = window.setTimeout(() => setFeedback("copied"), 400);
    const toIdle = window.setTimeout(() => setFeedback("idle"), 1800);
    return () => {
      window.clearTimeout(toCopied);
      window.clearTimeout(toIdle);
    };
  }, [ready, reduce]);

  return (
    <CopyButton value={DEMO_VALUE} feedback={feedback} onFeedbackChange={setFeedback} />
  );
}

function Manual() {
  return <CopyButton value={DEMO_VALUE} />;
}

export function Demo() {
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("manual")) setManual(true);
  }, []);

  return (
    <div
      data-supports-manual=""
      data-manual={manual ? "" : undefined}
      className="flex w-80 items-center justify-between gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
    >
      <code className="text-sm text-foreground">{DEMO_VALUE}</code>
      {manual ? <Manual /> : <Playback />}
    </div>
  );
}

export type { CopyButtonProps, CopyFeedback };
