"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useState } from "react";

type NumberTickerProps = {
  value: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  format?: (value: number) => string;
};

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function NumberTicker({
  value,
  from = 0,
  prefix = "",
  suffix = "",
  className,
  format = formatInteger,
}: NumberTickerProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [display, setDisplay] = useState(value);

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  useLayoutEffect(() => {
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    if (reduce !== false) {
      setDisplay(value);
      return;
    }
    setDisplay(from);
    const controls = animate(from, value, {
      type: "spring",
      bounce: 0,
      duration: 0.9,
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [ready, reduce, from, value]);

  const shown = `${prefix}${format(ready && reduce === false ? display : value)}${suffix}`;
  const finalText = `${prefix}${format(value)}${suffix}`;
  const motionOn = ready && reduce === false;
  const figureClass = `tabular-nums ${className ?? "text-4xl font-semibold tracking-tight text-foreground"}`;

  return (
    <span className="inline-flex">
      {motionOn ? (
        <motion.span
          data-fade-in=""
          className={figureClass}
          aria-hidden="true"
          initial={{ opacity: 0.15, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.55 }}
        >
          {shown}
        </motion.span>
      ) : (
        <span data-fade-in="" className={figureClass} aria-hidden="true">
          {finalText}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {finalText}
      </span>
    </span>
  );
}

export function Demo() {
  return (
    <div className="w-64 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">Revenue</p>
      <NumberTicker value={12840} prefix="$" />
      <p className="mt-1 text-xs text-muted-foreground">This month</p>
    </div>
  );
}

export type { NumberTickerProps };
