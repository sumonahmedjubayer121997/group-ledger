import { useMemo, useRef, type PointerEvent } from "react";
import {
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

const SPRING = { stiffness: 150, damping: 20, mass: 0.6 };

/**
 * Tilts a card toward the pointer and moves its light with it.
 *
 * - Mouse: follows the pointer while it's over the card.
 * - Touch: tilts toward the finger only while it's pressed (vertical scrolling still works),
 *   and otherwise the light drifts as the card scrolls past.
 * - "Reduce motion": nothing moves.
 *
 * Everything runs on motion values, so pointer movement never re-renders React.
 * Returns the handlers and style for the card, plus `shadowX` / `shadowY` for its shadow.
 */
export function useTilt(max = 6) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches, []);
  const pressing = useRef(false);

  // Pointer position over the card (0..1) and how "on" the card is (0 at rest, 1 hovered/pressed).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.3);
  const on = useMotionValue(0);
  const x = useSpring(px, SPRING);
  const y = useSpring(py, SPRING);
  const lit = useSpring(on, SPRING);

  const rotateY = useTransform([x, lit], ([vx, a]: number[]) => (vx - 0.5) * 2 * max * a);
  const rotateX = useTransform([y, lit], ([vy, a]: number[]) => -(vy - 0.5) * 2 * max * a);
  const lift = useTransform(lit, (a) => -4 * a);
  const shadowX = useTransform(rotateY, (v) => -v * 1.4);
  const shadowY = useTransform(rotateX, (v) => v * 1.4 + 8);
  const mx = useMotionTemplate`${useTransform(x, (v) => v * 100)}%`;
  const my = useMotionTemplate`${useTransform(y, (v) => v * 100)}%`;

  // Phones: the light drifts down the card as it scrolls through the screen.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (coarse && !reduce && !pressing.current) py.set(0.1 + v * 0.6);
  });

  const place = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const rest = () => {
    pressing.current = false;
    on.set(0);
  };

  const handlers = reduce
    ? {}
    : {
        onPointerEnter: (e: PointerEvent<HTMLElement>) => {
          if (e.pointerType !== "mouse") return;
          place(e);
          on.set(1);
        },
        onPointerMove: (e: PointerEvent<HTMLElement>) => {
          if (e.pointerType === "mouse" || pressing.current) place(e);
        },
        onPointerDown: (e: PointerEvent<HTMLElement>) => {
          if (e.pointerType === "mouse") return;
          pressing.current = true;
          place(e);
          on.set(1);
        },
        onPointerUp: (e: PointerEvent<HTMLElement>) => {
          if (e.pointerType !== "mouse") rest();
        },
        onPointerCancel: rest,
        onPointerLeave: rest,
      };

  return {
    ref,
    handlers,
    style: reduce ? {} : { rotateX, rotateY, y: lift, "--mx": mx, "--my": my, "--lit": lit },
    shadowX,
    shadowY,
    reduce: !!reduce,
  };
}
