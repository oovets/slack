"use client";

import * as React from "react";
import {
  useSpring,
  useTransform,
  motion,
  useInView,
  type MotionValue,
  type SpringOptions,
  type UseInViewOptions,
} from "motion/react";
import useMeasure from "react-use-measure";

import { cn } from "@/lib/utils";

type SlidingNumberRollerProps = {
  prevValue: number;
  value: number;
  place: number;
  transition: SpringOptions;
};

function SlidingNumberRoller({
  prevValue,
  value,
  place,
  transition,
}: SlidingNumberRollerProps) {
  const startNumber = Math.floor(prevValue / place) % 10;
  const targetNumber = Math.floor(value / place) % 10;
  const animatedValue = useSpring(startNumber, transition);

  React.useEffect(() => {
    animatedValue.set(targetNumber);
  }, [targetNumber, animatedValue]);

  const [measureRef, { height }] = useMeasure();
// w-[1ch]
  return (
    <span
      ref={measureRef}
      data-slot="sliding-number-roller"
      className="relative inline-block overflow-x-visible overflow-y-clip leading-none tabular-nums"
    >
      <span className="invisible">0</span>
      {Array.from({ length: 10 }, (_, i) => (
        <SlidingNumberDisplay
          key={i}
          motionValue={animatedValue}
          number={i}
          height={height}
          transition={transition}
        />
      ))}
    </span>
  );
}

type SlidingNumberDisplayProps = {
  motionValue: MotionValue<number>;
  number: number;
  height: number;
  transition: SpringOptions;
};

function SlidingNumberDisplay({
  motionValue,
  number,
  height,
  transition,
}: SlidingNumberDisplayProps) {
  const y = useTransform(motionValue, (latest) => {
    if (!height) return 0;
    const currentNumber = latest % 10;
    const offset = (10 + number - currentNumber) % 10;
    let translateY = offset * height;
    if (offset > 5) translateY -= 10 * height;
    return translateY;
  });

  if (!height) {
    return <span className="invisible absolute">{number}</span>;
  }

  return (
    <motion.span
      data-slot="sliding-number-display"
      style={{ y }}
      className="absolute inset-0 flex items-center justify-center"
      transition={{ ...transition, type: "spring", duration: 0.4 }}
      initial={{ opacity: 0, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {number}
    </motion.span>
  );
}

type SlidingNumberProps = React.ComponentProps<"span"> & {
  number: number | string;
  inView?: boolean;
  inViewMargin?: UseInViewOptions["margin"];
  inViewOnce?: boolean;
  padStart?: boolean;
  decimalSeparator?: string;
  decimalPlaces?: number;
  transition?: SpringOptions;
  animate?: boolean;
  animateOnLoad?: boolean;
  prefix?: string;
  postfix?: string;
  thousandsSeparator?: string | null;
  delay?: number;
};

function SlidingNumber({
  ref,
  number,
  className,
  inView = false,
  inViewMargin = "0px",
  inViewOnce = true,
  padStart = false,
  decimalSeparator = ".",
  decimalPlaces = 0,
  transition = {
    stiffness: 100,
    damping: 15,
    mass: 0.4,
  },
  animate = true,
  animateOnLoad = true,
  prefix,
  postfix,
  thousandsSeparator = ",",
  delay = 3000,
  ...props
}: SlidingNumberProps) {
  const localRef = React.useRef<HTMLSpanElement>(null);
  React.useImperativeHandle(ref, () => localRef.current!);

  const [delayPassed, setDelayPassed] = React.useState(false);

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setDelayPassed(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setDelayPassed(true);
    }
  }, [delay]);

  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;

  const effectiveNumber = React.useMemo(
    () => (!isInView || !delayPassed ? 0 : Math.abs(Number(number))),
    [number, isInView, delayPassed],
  );

  const prevNumberRef = React.useRef<number>(0);

  const formatNumber = React.useCallback(
    (num: number) =>
      decimalPlaces != null ? num.toFixed(decimalPlaces) : num.toString(),
    [decimalPlaces],
  );

  const numberStr = formatNumber(effectiveNumber);
  const [newIntStrRaw, newDecStrRaw = ""] = numberStr.split(".");
  const newIntStr =
    padStart && newIntStrRaw?.length === 1 ? "0" + newIntStrRaw : newIntStrRaw;

  const prevFormatted = formatNumber(prevNumberRef.current);
  const [prevIntStrRaw = "", prevDecStrRaw = ""] = prevFormatted.split(".");
  const prevIntStr =
    padStart && prevIntStrRaw.length === 1
      ? "0" + prevIntStrRaw
      : prevIntStrRaw;
  const adjustedPrevInt = React.useMemo(() => {
    return prevIntStr.length > (newIntStr?.length ?? 0)
      ? prevIntStr.slice(-(newIntStr?.length ?? 0))
      : prevIntStr.padStart(newIntStr?.length ?? 0, "0");
  }, [prevIntStr, newIntStr]);

  const adjustedPrevDec = React.useMemo(() => {
    if (!newDecStrRaw) return "";
    return prevDecStrRaw.length > newDecStrRaw.length
      ? prevDecStrRaw.slice(0, newDecStrRaw.length)
      : prevDecStrRaw.padEnd(newDecStrRaw.length, "0");
  }, [prevDecStrRaw, newDecStrRaw]);

  // When animateOnLoad is false, set previous number to current number immediately to skip initial animation
  React.useEffect(() => {
    if (!animateOnLoad) {
      prevNumberRef.current = Math.abs(Number(number));
    }
  }, [animateOnLoad, number]);

  React.useEffect(() => {
    if (isInView && animateOnLoad && animate) {
      prevNumberRef.current = effectiveNumber;
    }
  }, [effectiveNumber, isInView, animateOnLoad, animate]);

  const intDigitCount = newIntStr?.length ?? 0;
  const intPlaces = React.useMemo(
    () =>
      Array.from({ length: intDigitCount }, (_, i) =>
        Math.pow(10, intDigitCount - i - 1),
      ),
    [intDigitCount],
  );

  const shouldShowComma = React.useCallback(
    (index: number) => {
      if (!thousandsSeparator) return false
      const positionFromRight = intDigitCount - index - 1
      return positionFromRight > 0 && positionFromRight % 3 === 0
    },
    [thousandsSeparator, intDigitCount],
  )
  const decPlaces = React.useMemo(
    () =>
      newDecStrRaw
        ? Array.from({ length: newDecStrRaw.length }, (_, i) =>
            Math.pow(10, newDecStrRaw.length - i - 1),
          )
        : [],
    [newDecStrRaw],
  );

  const newDecValue = newDecStrRaw ? parseInt(newDecStrRaw, 10) : 0;
  const prevDecValue = adjustedPrevDec ? parseInt(adjustedPrevDec, 10) : 0;

  return (
    <span
      ref={localRef}
      data-slot="sliding-number"
      className={cn("flex items-center tracking-[-0.05em]", className)}
      {...props}
    >
      {isInView && Number(number) < 0 && <span className="mr-1">-</span>}

      {prefix && (
        <motion.span
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: "tween" }}
          // className="mr-1"
        >
          {prefix}
        </motion.span>
      )}

      {intPlaces.map((place, index) => (
        <React.Fragment key={`int-${place}`}>
          <SlidingNumberRoller
            prevValue={
              animateOnLoad && animate
                ? parseInt(adjustedPrevInt, 10)
                : parseInt(newIntStr ?? "0", 10)
            }
            value={parseInt(newIntStr ?? "0", 10)}
            place={place}
            transition={transition}
          />
          {shouldShowComma(index) && (
            <motion.span
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: "tween" }}
              className="overflow-x-visible overflow-y-clip leading-none"
            >
              {thousandsSeparator}
            </motion.span>
          )}
        </React.Fragment>
      ))}

      {newDecStrRaw && (
        <>
          <motion.span
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "tween" }}
          >{decimalSeparator}</motion.span>
          {/* <span>{decimalSeparator}</span> */}
          {decPlaces.map((place) => (
            <SlidingNumberRoller
              key={`dec-${place}`}
              prevValue={animateOnLoad && animate ? prevDecValue : newDecValue}
              value={newDecValue}
              place={place}
              transition={transition}
            />
          ))}
        </>
      )}

      {postfix && (
        <motion.span
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: "tween" }}
          className="ml-1"
        >
          {postfix}
        </motion.span>
      )}
    </span>
  );
}

export { SlidingNumber, type SlidingNumberProps };
