"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

type HoldPhase = "idle" | "holding" | "done";

type HoldToConfirmProps = {
  label?: string;
  holdingLabel?: string;
  successLabel?: string;
  durationMs?: number;
  onConfirm?: () => void;
  className?: string;
};

const CHECK = "M5 12.5 9.5 17 19 7.5";

function positiveDuration(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1200;
}

export const HoldToConfirm = forwardRef<HTMLButtonElement, HoldToConfirmProps>(function HoldToConfirm(
  {
    label = "Delete",
    holdingLabel = "Keep holding",
    successLabel = "Deleted",
    durationMs,
    onConfirm,
    className,
  },
  ref,
) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<HoldPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const phaseRef = useRef<HoldPhase>("idle");
  const onConfirmRef = useRef(onConfirm);
  const innerRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const duration = positiveDuration(durationMs);

  onConfirmRef.current = onConfirm;

  function setButton(node: HTMLButtonElement | null) {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  useLayoutEffect(() => {
    setReady(true);
  }, []);

  const motionOn = ready && reduce === false;

  function confirmNow() {
    if (phaseRef.current === "done") return;
    phaseRef.current = "done";
    setPhase("done");
    setProgress(1);
    setAnnouncement("Confirmed.");
    onConfirmRef.current?.();
  }

  const confirmRef = useRef(confirmNow);
  confirmRef.current = confirmNow;

  function startHold() {
    if (phaseRef.current === "done" || phaseRef.current === "holding") return;
    phaseRef.current = "holding";
    setPhase("holding");
    setProgress(0);
    setRemainingSeconds(Math.ceil(duration / 1000));
    setAnnouncement("Holding. Release to cancel.");
  }

  function endHold() {
    if (phaseRef.current !== "holding") return;
    phaseRef.current = "idle";
    setPhase("idle");
    setProgress(0);
    setAnnouncement("Cancelled.");
  }

  useEffect(() => {
    if (phase !== "holding") return;
    let alive = true;
    const safety = window.setTimeout(() => {
      if (alive && phaseRef.current === "holding") confirmRef.current();
    }, duration + 80);

    if (!motionOn) {
      const started = performance.now();
      const interval = window.setInterval(() => {
        if (!alive || phaseRef.current !== "holding") return;
        const left = duration - (performance.now() - started);
        if (left <= 0) {
          confirmRef.current();
          return;
        }
        setRemainingSeconds(Math.ceil(left / 1000));
      }, 100);
      return () => {
        alive = false;
        window.clearTimeout(safety);
        window.clearInterval(interval);
      };
    }

    const controls = animate(0, 1, {
      duration: duration / 1000,
      ease: "linear",
      onUpdate: (latest) => {
        if (!alive || phaseRef.current !== "holding") return;
        setProgress(latest);
        if (latest >= 1) confirmRef.current();
      },
    });
    return () => {
      alive = false;
      window.clearTimeout(safety);
      controls.stop();
    };
  }, [phase, motionOn, duration]);

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    const onPlay = () => {
      if (phaseRef.current === "idle") startHold();
    };
    node.addEventListener("animlets-hold", onPlay);
    return () => node.removeEventListener("animlets-hold", onPlay);
  }, [ready]);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || phaseRef.current === "done") return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    startHold();
  }

  function onPointerUp() {
    endHold();
  }

  function onPointerLeave(event: PointerEvent<HTMLButtonElement>) {
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) return;
    } catch {
      return;
    }
    endHold();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return;
    if (event.repeat || phaseRef.current === "done") return;
    event.preventDefault();
    startHold();
  }

  function onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    endHold();
  }

  const buttonText = phase === "done" ? successLabel : phase === "holding" ? holdingLabel : label;
  const buttonClass = [
    "relative inline-flex min-h-11 min-w-44 touch-none select-none items-center justify-center gap-2 overflow-hidden rounded-md px-4 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    phase === "done" ? "bg-emerald-800" : "bg-rose-800",
  ].join(" ");

  return (
    <div className={["flex flex-col items-start gap-3", className].filter(Boolean).join(" ")}>
      <button
        ref={setButton}
        type="button"
        data-hold-button=""
        className={buttonClass}
        aria-describedby={hintId}
        aria-disabled={phase === "done" || undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={endHold}
        onPointerLeave={onPointerLeave}
      >
        {motionOn ? (
          <span
            data-fade-in=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 origin-left bg-white/35"
            style={{ transform: `scaleX(${progress})` }}
          />
        ) : (
          <span data-fade-in="" aria-hidden="true" className="sr-only" />
        )}
        <span className="relative">{buttonText}</span>
        {phase === "holding" && !motionOn ? (
          <span className="relative tabular-nums" aria-hidden="true">
            {remainingSeconds}s
          </span>
        ) : null}
        {phase === "done" && motionOn ? (
          <motion.svg
            viewBox="0 0 24 24"
            className="relative size-4"
            aria-hidden="true"
            initial={{ scale: 0.84, opacity: 0.2 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
          >
            <path
              d={CHECK}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        ) : null}
        {phase === "done" && !motionOn ? (
          <svg viewBox="0 0 24 24" className="relative size-4" aria-hidden="true">
            <path
              d={CHECK}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>
      <p id={hintId} className="max-w-xs text-sm text-foreground">
        Press and hold {label}. If you cannot hold, use Confirm without holding.
      </p>
      <button
        type="button"
        data-confirm-now=""
        className="min-h-11 rounded-md px-1 text-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-disabled={phase === "done" || undefined}
        onClick={confirmNow}
      >
        Confirm without holding
      </button>
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((phase === "done" ? 1 : progress) * 100)}
        aria-label={`${label} progress`}
        className="sr-only"
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
});

function Playback() {
  const ref = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    ref.current.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        button: 0,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
    ref.current.dispatchEvent(new Event("animlets-hold"));
  }, [ready]);

  return <HoldToConfirm ref={ref} label="Delete project" />;
}

function Manual() {
  return <HoldToConfirm label="Delete project" />;
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
      className="w-80 rounded-xl border bg-card p-5 text-card-foreground shadow-sm"
    >
      <p className="text-sm font-medium">Project Atlas</p>
      <p className="mt-1 text-sm">Delete this project and its data.</p>
      <div className="mt-4">{manual ? <Manual /> : <Playback />}</div>
    </div>
  );
}

export type { HoldToConfirmProps };
