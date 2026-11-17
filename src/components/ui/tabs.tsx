import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/** Colour of the sliding active pill. Set per tab via `<TabsTrigger accent="...">` (default: primary). */
export type TabsAccent = "primary" | "blue" | "amber" | "emerald" | "violet" | "rose";

// Literal classes so Tailwind keeps them. Gradient + coloured shadow give the raised (3D) look.
const ACCENT_PILL: Record<TabsAccent, string> = {
  primary: "bg-gradient-to-b from-primary/85 to-primary ring-1 ring-primary/30 shadow-md shadow-primary/30",
  blue: "bg-gradient-to-b from-blue-400 to-blue-500 ring-1 ring-blue-500/30 shadow-md shadow-blue-500/30",
  amber: "bg-gradient-to-b from-amber-400 to-amber-500 ring-1 ring-amber-500/30 shadow-md shadow-amber-500/30",
  emerald: "bg-gradient-to-b from-emerald-400 to-emerald-500 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/30",
  violet: "bg-gradient-to-b from-violet-400 to-violet-500 ring-1 ring-violet-500/30 shadow-md shadow-violet-500/30",
  rose: "bg-gradient-to-b from-rose-400 to-rose-500 ring-1 ring-rose-500/30 shadow-md shadow-rose-500/30",
};

/** Same spring as the selection cards (e.g. Call Sheet department picker). */
const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;
const TAP_EASE = [0.16, 1, 0.3, 1] as const;

interface PillRect {
  x: number;
  y: number;
  width: number;
  height: number;
  accent: TabsAccent;
}

/**
 * Tab track. Renders a single pill behind the active trigger that springs to whichever tab becomes
 * active. It follows the DOM (`data-state="active"`), so it works for controlled and uncontrolled
 * tabs, wrapped (multi-row) lists and RTL without any extra props.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = React.useState<PillRect | null>(null);
  const hasMeasured = React.useRef(false);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  const measure = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (!active || active.offsetWidth === 0) {
      setPill(null);
      return;
    }
    const next: PillRect = {
      x: active.offsetLeft,
      y: active.offsetTop,
      width: active.offsetWidth,
      height: active.offsetHeight,
      accent: (active.dataset.accent as TabsAccent) || "primary",
    };
    setPill((prev) =>
      prev &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.width === next.width &&
      prev.height === next.height &&
      prev.accent === next.accent
        ? prev
        : next,
    );
  }, []);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    measure();
    const mo = new MutationObserver(measure);
    mo.observe(list, { attributes: true, subtree: true, childList: true, attributeFilter: ["data-state", "data-accent"] });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(list);
    window.addEventListener("resize", measure);
    return () => {
      mo.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // First placement should not animate in from 0,0.
  const animateFromPrev = hasMeasured.current;
  if (pill) hasMeasured.current = true;

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        "relative isolate inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground shadow-inner ring-1 ring-inset ring-border/60",
        className,
      )}
      {...props}
    >
      {pill && (
        <motion.span
          aria-hidden
          className={cn("pointer-events-none absolute left-0 top-0 -z-10 rounded-sm", ACCENT_PILL[pill.accent])}
          initial={animateFromPrev ? false : { x: pill.x, y: pill.y, width: pill.width, height: pill.height }}
          animate={{ x: pill.x, y: pill.y, width: pill.width, height: pill.height }}
          transition={PILL_SPRING}
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    /** Colour of the active pill for this tab (default: primary). */
    accent?: TabsAccent;
  }
>(({ className, accent = "primary", children, disabled, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} data-accent={accent} disabled={disabled} asChild {...props}>
    {/* motion.button gives the same press feedback as the selection cards; the pill (in TabsList) is the active background. */}
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.2, ease: TAP_EASE }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors duration-200 hover:text-foreground data-[state=active]:text-white data-[state=active]:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {children}
    </motion.button>
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
