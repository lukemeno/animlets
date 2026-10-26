"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type AnimatedTab = {
  value: string;
  label: string;
  content: ReactNode;
};

type AnimatedTabsProps = {
  tabs: readonly AnimatedTab[];
  label?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

type IndicatorBox = {
  x: number;
  width: number;
};

function sameBox(left: IndicatorBox, right: IndicatorBox) {
  return Math.abs(left.x - right.x) < 0.5 && Math.abs(left.width - right.width) < 0.5;
}

export function AnimatedTabs({
  tabs,
  label = "Sections",
  className,
  value,
  defaultValue,
  onValueChange,
}: AnimatedTabsProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const first = tabs[0]?.value ?? "";
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? first);
  const selected = value ?? uncontrolled;
  const [box, setBox] = useState<IndicatorBox | null>(null);

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  useLayoutEffect(() => {
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const node: HTMLDivElement = list;

    function measure() {
      const active = node.querySelector<HTMLElement>('[data-state="active"]');
      if (!active) return;
      const listRect = node.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const next = {
        x: activeRect.left - listRect.left,
        width: activeRect.width,
      };
      setBox((prev) => (prev && sameBox(prev, next) ? prev : next));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [selected, tabs, ready]);

  const motionOn = ready && reduce === false;

  function change(next: string) {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  if (tabs.length === 0) return null;

  const indicatorClass =
    "pointer-events-none absolute bottom-1 left-0 top-1 z-0 rounded-md bg-background shadow-sm";

  return (
    <Tabs.Root className={className} value={selected} onValueChange={change}>
      <Tabs.List
        ref={listRef}
        aria-label={label}
        className="relative inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1"
      >
        {box && motionOn ? (
          <motion.span
            data-fade-in=""
            aria-hidden="true"
            className={indicatorClass}
            initial={false}
            animate={{ x: box.x, width: box.width }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.55 }}
          />
        ) : null}
        {box && !motionOn ? (
          <span
            data-fade-in=""
            aria-hidden="true"
            className={indicatorClass}
            style={{ width: box.width, transform: `translateX(${box.x}px)` }}
          />
        ) : null}
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="relative z-10 rounded-md px-3 py-1.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content
          key={tab.value}
          value={tab.value}
          className="mt-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

const DEMO_TABS: AnimatedTab[] = [
  {
    value: "overview",
    label: "Overview",
    content: <p className="text-sm text-foreground">Pipeline is up 12% this week.</p>,
  },
  {
    value: "usage",
    label: "Usage",
    content: <p className="text-sm text-foreground">42,180 events in the last 24 hours.</p>,
  },
  {
    value: "billing",
    label: "Billing",
    content: <p className="text-sm text-foreground">Next invoice is $240 on May 1.</p>,
  },
];

export function Demo() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState(DEMO_TABS[0].value);

  useLayoutEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || reduce !== false) return;
    const id = window.setTimeout(() => setValue(DEMO_TABS[1].value), 400);
    return () => window.clearTimeout(id);
  }, [ready, reduce]);

  return (
    <AnimatedTabs
      tabs={DEMO_TABS}
      label="Reports"
      value={value}
      onValueChange={setValue}
      className="w-80"
    />
  );
}

export type { AnimatedTab, AnimatedTabsProps };
