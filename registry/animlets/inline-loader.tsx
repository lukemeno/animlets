"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useState, type ReactNode } from "react";

type InlineLoaderVariant = "dots" | "bar" | "spinner";

type InlineLoaderProps = {
  variant?: InlineLoaderVariant;
  label?: string;
  className?: string;
};

function knownVariant(value: InlineLoaderVariant | undefined): InlineLoaderVariant {
  return value === "bar" || value === "spinner" ? value : "dots";
}

function Dots({ motionOn }: { motionOn: boolean }) {
  if (!motionOn) return <span className="text-base leading-none">…</span>;
  return (
    <span className="inline-flex h-4 items-end gap-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-1.5 rounded-full bg-foreground"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 }}
        />
      ))}
    </span>
  );
}

function Bar({ motionOn }: { motionOn: boolean }) {
  if (!motionOn) return <span className="block h-1.5 w-full rounded-full border border-foreground" />;
  return (
    <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-foreground/20">
      <motion.span
        className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-foreground"
        animate={{ x: ["-120%", "260%"] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
    </span>
  );
}

function Spinner({ motionOn }: { motionOn: boolean }) {
  if (!motionOn) return <span className="block size-2 rounded-full bg-foreground" />;
  return (
    <motion.svg
      viewBox="0 0 16 16"
      className="size-4"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

function Mark({
  motionOn,
  className,
  children,
}: {
  motionOn: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!motionOn) {
    return (
      <span data-fade-in="" aria-hidden="true" className={className}>
        {children}
      </span>
    );
  }
  return (
    <motion.span
      data-fade-in=""
      aria-hidden="true"
      className={className}
      initial={{ opacity: 0.2, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
}

export function InlineLoader({ variant, label = "Loading", className }: InlineLoaderProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const kind = knownVariant(variant);

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  useLayoutEffect(() => {
    setReady(true);
  }, []);

  const motionOn = ready && reduce === false;
  const graphic =
    kind === "bar" ? <Bar motionOn={motionOn} /> : kind === "spinner" ? <Spinner motionOn={motionOn} /> : <Dots motionOn={motionOn} />;
  const rootClass =
    kind === "bar"
      ? "flex w-full flex-col gap-2 text-sm text-foreground"
      : "inline-flex items-center gap-2 text-sm text-foreground";

  return (
    <span
      role="status"
      aria-live="polite"
      data-inline-loader=""
      className={[rootClass, className].filter(Boolean).join(" ")}
    >
      <Mark motionOn={motionOn} className={kind === "bar" ? "block w-full" : undefined}>
        {graphic}
      </Mark>
      <span>{label}</span>
    </span>
  );
}

export function Demo() {
  const [manual, setManual] = useState(false);

  useLayoutEffect(() => {
    if (new URLSearchParams(window.location.search).has("manual")) setManual(true);
  }, []);

  return (
    <div
      data-supports-manual=""
      data-manual={manual ? "" : undefined}
      className="w-72 space-y-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm"
    >
      <InlineLoader variant="dots" label="Saving" />
      <InlineLoader variant="bar" label="Loading report" />
      <InlineLoader variant="spinner" label="Refreshing" />
    </div>
  );
}

export type { InlineLoaderProps, InlineLoaderVariant };
