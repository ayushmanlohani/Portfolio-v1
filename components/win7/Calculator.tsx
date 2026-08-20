"use client";

import { useState } from "react";

/**
 * Windows 7 Calculator, Standard view.
 *
 * The arithmetic is real. State is the four values every calculator of this
 * shape keeps: what the display reads, the number waiting on the left of a
 * pending operator, the operator itself, and whether the next digit starts a
 * fresh number or extends the one showing.
 *
 * Above the readout is Windows' expression line — the running record of what
 * you have typed so far ("8 /", then "8 / 4 ="), so the operands that scrolled
 * off the main display are still visible. It records the operands **as typed**
 * rather than the running total: 2 + 3 + reads "2 + 3 +", not "5 +".
 *
 * The menu bar is the one part that's decoration — View/Edit/Help open
 * nothing, the same way the Start menu's placeholder programs don't. The View
 * menu is where Scientific mode would live if it existed.
 */

type Op = "+" | "-" | "*" | "/";

const DIVIDE_BY_ZERO = "Cannot divide by zero";

/**
 * Trims binary-float noise without lying about the value: 0.1 + 0.2 shows as
 * 0.3, but a genuinely long number keeps its digits. Windows caps the display
 * the same way, at rather more precision than a double actually has.
 */
function show(value: number): string {
  if (!Number.isFinite(value)) return DIVIDE_BY_ZERO;
  return String(Number(value.toPrecision(15)));
}

function apply(left: number, op: Op, right: number): number {
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "*") return left * right;
  return right === 0 ? NaN : left / right;
}

/** The face, row by row. `span` marks the two buttons that aren't 1×1. */
type Key = { label: string; kind?: "memory" | "fn" | "op" | "equals"; span?: "wide" | "tall" };

const KEYS: Key[] = [
  { label: "MC", kind: "memory" },
  { label: "MR", kind: "memory" },
  { label: "MS", kind: "memory" },
  { label: "M+", kind: "memory" },
  { label: "M-", kind: "memory" },

  { label: "←", kind: "fn" },
  { label: "CE", kind: "fn" },
  { label: "C", kind: "fn" },
  { label: "±", kind: "fn" },
  { label: "√", kind: "fn" },

  { label: "7" },
  { label: "8" },
  { label: "9" },
  { label: "/", kind: "op" },
  { label: "%", kind: "fn" },

  { label: "4" },
  { label: "5" },
  { label: "6" },
  { label: "*", kind: "op" },
  { label: "1/x", kind: "fn" },

  { label: "1" },
  { label: "2" },
  { label: "3" },
  { label: "-", kind: "op" },
  { label: "=", kind: "equals", span: "tall" },

  { label: "0", span: "wide" },
  { label: ".", kind: "fn" },
  { label: "+", kind: "op" },
];

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [left, setLeft] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [memory, setMemory] = useState(0);
  // The line above the readout. Empty until the first operator.
  const [expr, setExpr] = useState("");
  // True when the display is a result or a fresh operand, so the next digit
  // replaces it instead of being appended.
  const [fresh, setFresh] = useState(true);

  const errored = display === DIVIDE_BY_ZERO;
  const current = errored ? 0 : Number(display);

  const clearAll = () => {
    setDisplay("0");
    setLeft(null);
    setOp(null);
    setFresh(true);
    setExpr("");
  };

  /** A finished sum is cleared off the top line as soon as you start a new one. */
  const startingOver = () => {
    if (expr.endsWith("=")) setExpr("");
  };

  const digit = (d: string) => {
    if (errored) clearAll();
    startingOver();
    if (fresh || display === "0") {
      setDisplay(d);
      setFresh(false);
      return;
    }
    setDisplay(display + d);
  };

  const dot = () => {
    if (errored) return clearAll();
    startingOver();
    if (fresh) {
      setDisplay("0.");
      setFresh(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const chooseOp = (next: Op) => {
    if (errored) return;

    // Two operators in a row is a change of mind, not a new term: Windows
    // swaps the operator rather than repeating the operand.
    if (op && fresh && !expr.endsWith("=")) {
      setExpr(expr.replace(/[-+*/]$/, next));
      setOp(next);
      return;
    }

    const base = expr.endsWith("=") ? "" : expr;
    setExpr(`${base ? `${base} ` : ""}${display} ${next}`);

    // Chaining: 2 + 3 + folds the first sum before taking the second operator,
    // which is what makes a running total work without pressing = each time.
    const folded = left !== null && op && !fresh ? apply(left, op, current) : current;
    setDisplay(show(folded));
    setLeft(Number.isFinite(folded) ? folded : null);
    setOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (errored || left === null || !op) return;
    const result = apply(left, op, current);
    setExpr(`${expr} ${display} =`);
    setDisplay(show(result));
    setLeft(null);
    setOp(null);
    setFresh(true);
  };

  /** Windows' %: a percentage *of the pending left-hand value*, not of 100. */
  const percent = () => {
    if (errored) return;
    const value = left === null ? 0 : (left * current) / 100;
    setDisplay(show(value));
    setFresh(true);
  };

  const unary = (fn: (n: number) => number) => {
    if (errored) return;
    setDisplay(show(fn(current)));
    setFresh(true);
  };

  const backspace = () => {
    if (errored || fresh) return;
    const next = display.slice(0, -1);
    setDisplay(next === "" || next === "-" ? "0" : next);
  };

  const press = (key: Key) => {
    const { label } = key;

    if (/^[0-9]$/.test(label)) return digit(label);
    if (label === ".") return dot();
    if (key.kind === "op") return chooseOp(label as Op);
    if (label === "=") return equals();

    if (label === "C") return clearAll();
    if (label === "CE") {
      setDisplay("0");
      setFresh(true);
      return;
    }
    if (label === "←") return backspace();
    if (label === "±") return unary((n) => -n);
    if (label === "√") return unary(Math.sqrt);
    if (label === "1/x") return unary((n) => (n === 0 ? NaN : 1 / n));
    if (label === "%") return percent();

    if (label === "MC") return setMemory(0);
    if (label === "MS") return setMemory(current);
    if (label === "M+") return setMemory(memory + current);
    if (label === "M-") return setMemory(memory - current);
    if (label === "MR" && !errored) {
      setDisplay(show(memory));
      setFresh(true);
    }
  };

  return (
    <div className="calc">
      <div className="app-menu">
        <button type="button" className="app-menu-item">
          View
        </button>
        <button type="button" className="app-menu-item">
          Edit
        </button>
        <button type="button" className="app-menu-item" data-disabled>
          Help
        </button>
      </div>

      <div className="calc-screen">
        {/* What has been typed so far, above the number being typed now. */}
        <div className="calc-expression">{expr}</div>

        {/* Windows shows a small M box while anything is in memory. */}
        <span className="calc-memory">{memory !== 0 ? "M" : ""}</span>
        <output className="calc-display" data-error={errored || undefined}>
          {display}
        </output>
      </div>

      <div className="calc-keys">
        {KEYS.map((key) => (
          <button
            key={key.label}
            type="button"
            className="calc-key"
            data-kind={key.kind}
            data-span={key.span}
            onClick={() => press(key)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
