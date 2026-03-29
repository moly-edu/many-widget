import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import type {
  EvenOddWidgetAnswer,
  EvenOddWidgetParams,
} from "../definition_even_odd";

export function WidgetComponentEvenOdd() {
  const params = useWidgetParams<EvenOddWidgetParams>();

  const range = useMemo(
    () => normalizeRange(params.numberMin, params.numberMax),
    [params.numberMax, params.numberMin],
  );

  const pickData = useMemo(
    () =>
      buildPickParityBoard({
        range,
        targetParity: params.targetParity,
        totalNumbers: params.pickSettings.totalNumbers,
        minTargetCount: params.pickSettings.minTargetCount,
        maxTargetCount: params.pickSettings.maxTargetCount,
      }),
    [
      params.targetParity,
      params.pickSettings.totalNumbers,
      params.pickSettings.minTargetCount,
      params.pickSettings.maxTargetCount,
      range,
    ],
  );

  const sortData = useMemo(
    () =>
      buildSortParityBoard({
        range,
        totalNumbers: params.sortSettings.totalNumbers,
        uniqueNumbers: params.sortSettings.uniqueNumbers,
      }),
    [
      params.sortSettings.totalNumbers,
      params.sortSettings.uniqueNumbers,
      range,
    ],
  );

  const judgeData = useMemo(
    () =>
      buildJudgeParityData({
        range,
      }),
    [range],
  );

  const questionText = getQuestionText(
    params.mode,
    params.customPrompt,
    params.targetParity,
    judgeData.number,
    judgeData.claimedParity,
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<EvenOddWidgetAnswer>({
    evaluate: (ans) => {
      const value = ans.value?.trim() ?? "";

      let isCorrect = false;

      if (params.mode === "pick-parity") {
        const selectedIndices = parseIndexSet(value);
        isCorrect = areSetsEqual(selectedIndices, pickData.targetIndices);
      }

      if (params.mode === "sort-baskets") {
        const assignments = parseAssignments(value);
        isCorrect = isSortAnswerCorrect(assignments, sortData.numbers);
      }

      if (params.mode === "judge-parity") {
        const userChoice = value === "true";
        isCorrect = userChoice === judgeData.claimIsTrue;
      }

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  if (params.mode === "pick-parity") {
    const selectedIndices = parseIndexSet(answer?.value ?? "");

    return (
      <PickParityMode
        params={params}
        questionText={questionText}
        items={pickData.items}
        targetIndices={pickData.targetIndices}
        selectedIndices={selectedIndices}
        setAnswer={setAnswer}
        result={result}
        submit={submit}
        isLocked={isLocked}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (params.mode === "sort-baskets") {
    const assignments = parseAssignments(answer?.value ?? "");

    return (
      <SortBasketsMode
        params={params}
        questionText={questionText}
        numbers={sortData.numbers}
        assignments={assignments}
        setAnswer={setAnswer}
        result={result}
        submit={submit}
        isLocked={isLocked}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <JudgeParityMode
      params={params}
      questionText={questionText}
      number={judgeData.number}
      claimedParity={judgeData.claimedParity}
      claimIsTrue={judgeData.claimIsTrue}
      answerValue={answer?.value ?? ""}
      setAnswer={setAnswer}
      result={result}
      submit={submit}
      isLocked={isLocked}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type Parity = "even" | "odd";
type AssignmentMap = Record<number, Parity>;

interface SharedModeProps {
  params: EvenOddWidgetParams;
  questionText: string;
  setAnswer: (answer: EvenOddWidgetAnswer) => void;
  result: SubmissionResult;
  submit: () => Promise<void>;
  isLocked: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
}

interface ScatterNumberItem {
  id: string;
  value: number;
  style: CSSProperties;
  toneClass: string;
}

interface PickParityProps extends SharedModeProps {
  items: ScatterNumberItem[];
  targetIndices: Set<number>;
  selectedIndices: Set<number>;
}

function PickParityMode({
  params,
  questionText,
  items,
  targetIndices,
  selectedIndices,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: PickParityProps) {
  const targetLabel = parityLabel(params.targetParity);
  const correctDetail = `Các ô đúng là các số ${targetLabel}.`;

  const toggleSelect = (index: number) => {
    if (isLocked) return;

    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }

    setAnswer({ value: encodeIndexSet(next) });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-sky-50 via-cyan-50 to-teal-50">
      <div className="w-full max-w-lg">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium mb-3">
              🔍 Dạng 1: Chọn số {targetLabel}
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="text-xs text-slate-500 text-center mb-3">
            Đã chọn {selectedIndices.size} ô
          </div>

          <ScatterPickBoard
            items={items}
            selectedIndices={selectedIndices}
            onToggle={toggleSelect}
            disabled={isLocked}
          />

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed 
                text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            params={params}
            correctDetail={correctDetail}
            helpfulHint={`Mẹo: số chẵn chia hết cho 2, số lẻ thì không.`}
          />

          {isLocked && !result?.isCorrect && (
            <RevealCorrectIndices items={items} targetIndices={targetIndices} />
          )}
        </div>
      </div>
    </div>
  );
}

interface SortParityProps extends SharedModeProps {
  numbers: number[];
  assignments: AssignmentMap;
}

function SortBasketsMode({
  params,
  questionText,
  numbers,
  assignments,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: SortParityProps) {
  const [activeBasket, setActiveBasket] = useState<Parity>("even");
  const unassigned = numbers
    .map((value, index) => ({ index, value }))
    .filter(({ index }) => assignments[index] === undefined);
  const appleSpots = useMemo(
    () => buildTreeAppleSpots(numbers.length),
    [numbers],
  );

  const evenAssigned = numbers
    .map((value, index) => ({ index, value }))
    .filter(({ index }) => assignments[index] === "even");

  const oddAssigned = numbers
    .map((value, index) => ({ index, value }))
    .filter(({ index }) => assignments[index] === "odd");

  const assignedCount = Object.keys(assignments).length;

  const updateAssignment = (index: number, nextBucket: Parity | null) => {
    if (isLocked) return;

    const nextMap: AssignmentMap = { ...assignments };

    if (nextBucket === null) {
      delete nextMap[index];
    } else {
      nextMap[index] = nextBucket;
    }

    setAnswer({ value: encodeAssignments(nextMap) });
  };

  const assignToActiveBasket = (index: number) => {
    updateAssignment(index, activeBasket);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-lime-50 via-emerald-50 to-sky-50">
      <div className="w-full max-w-3xl">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mb-3">
              🍎 Dạng 2: Vườn táo chẵn lẻ
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-100 bg-emerald-50/70 p-3 sm:p-4">
            <OrchardScene />

            <div className="relative h-96 sm:h-92">
              <div className="text-xs text-emerald-700 font-semibold relative z-10">
                Trên cây còn {unassigned.length} quả ({assignedCount}/
                {numbers.length} quả đã xếp vào giỏ)
              </div>

              <div className="absolute inset-x-0 top-8 bottom-28 sm:bottom-30">
                {unassigned.map((item) => {
                  const position = appleSpots[item.index] ?? {
                    x: 50,
                    y: 50,
                    rotate: 0,
                    scale: 1,
                  };

                  return (
                    <div
                      key={`orchard-${item.index}-${item.value}`}
                      className="absolute"
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: `translate(-50%, -50%) rotate(${position.rotate}deg) scale(${position.scale})`,
                      }}
                    >
                      <AppleNumberToken
                        value={item.value}
                        size="md"
                        variant="tree"
                        onClick={() => assignToActiveBasket(item.index)}
                        disabled={isLocked}
                        title={`Cho số ${item.value} vào giỏ ${parityLabel(activeBasket)}`}
                      />
                    </div>
                  );
                })}
              </div>

              {unassigned.length === 0 && (
                <div className="absolute inset-x-0 bottom-4 text-center text-sm font-semibold text-emerald-700">
                  Cây đã hái hết táo. Kiểm tra lại giỏ rồi nộp bài nhé!
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-2 sm:gap-3 px-1">
                <ParityBasket
                  title="Giỏ Số Chẵn"
                  parity="even"
                  isActive={activeBasket === "even"}
                  onActivate={() => setActiveBasket("even")}
                  items={evenAssigned}
                  onRemove={(index) => updateAssignment(index, null)}
                  disabled={isLocked}
                />

                <ParityBasket
                  title="Giỏ Số Lẻ"
                  parity="odd"
                  isActive={activeBasket === "odd"}
                  onActivate={() => setActiveBasket("odd")}
                  items={oddAssigned}
                  onRemove={(index) => updateAssignment(index, null)}
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 bg-fuchsia-500 hover:bg-fuchsia-600 disabled:bg-slate-300 disabled:cursor-not-allowed
                text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          {!isLocked && (
            <div className="mt-3 text-center text-xs text-slate-500">
              Muốn lấy số ra khỏi giỏ: chạm vào số trong giỏ đó.
            </div>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            params={params}
            correctDetail="Mỗi số cần vào đúng giỏ chẵn/lẻ tương ứng."
            helpfulHint="Mẹo nhanh: nhìn chữ số cuối, số chẵn kết thúc bằng 0, 2, 4, 6, 8."
          />
        </div>
      </div>
    </div>
  );
}

interface JudgeParityProps extends SharedModeProps {
  number: number;
  claimedParity: Parity;
  claimIsTrue: boolean;
  answerValue: string;
}

function JudgeParityMode({
  params,
  questionText,
  number,
  claimedParity,
  claimIsTrue,
  answerValue,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: JudgeParityProps) {
  const correctLabel = claimIsTrue ? "Đúng" : "Sai";
  const correctDetail = `Số ${number} là số ${parityLabel(parityOf(number))}. Đáp án đúng: ${correctLabel}.`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-amber-50 via-orange-50 to-yellow-50">
      <div className="w-full max-w-md">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-3">
              ⚡ Dạng 3: Đúng/Sai nhanh (bonus)
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center mb-4">
            <div className="text-6xl font-black text-amber-700">{number}</div>
            <div className="text-sm text-amber-700 mt-2">
              Mệnh đề: Số này là số {parityLabel(claimedParity)}.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (isLocked) return;
                setAnswer({ value: "true" });
              }}
              disabled={isLocked}
              className={`py-3 rounded-xl font-bold border-2 transition-all ${
                answerValue === "true"
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
              } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
            >
              Đúng
            </button>
            <button
              onClick={() => {
                if (isLocked) return;
                setAnswer({ value: "false" });
              }}
              disabled={isLocked}
              className={`py-3 rounded-xl font-bold border-2 transition-all ${
                answerValue === "false"
                  ? "bg-rose-500 text-white border-rose-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-rose-300"
              } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
            >
              Sai
            </button>
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed
                text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            params={params}
            correctDetail={correctDetail}
            helpfulHint="Dạng này luyện phản xạ cực nhanh khi nhìn số chẵn/lẻ."
          />
        </div>
      </div>
    </div>
  );
}

function ParityBasket({
  title,
  parity,
  isActive,
  onActivate,
  items,
  onRemove,
  disabled,
}: {
  title: string;
  parity: Parity;
  isActive: boolean;
  onActivate: () => void;
  items: Array<{ index: number; value: number }>;
  onRemove: (index: number) => void;
  disabled: boolean;
}) {
  const isEven = parity === "even";
  const frameColor = isEven ? "#0284c7" : "#be123c";
  const bodyColor = isEven ? "#e0f2fe" : "#ffe4e6";
  const weaveColor = isEven ? "#7dd3fc" : "#fda4af";
  const labelColor = isEven ? "text-sky-800" : "text-rose-800";

  const activeClass = isActive ? "scale-[1.02] drop-shadow-md" : "opacity-95";

  return (
    <div
      onClick={() => {
        if (disabled) return;
        onActivate();
      }}
      className={`relative min-h-48 transition-all ${activeClass} ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <svg viewBox="0 0 220 150" className="w-full h-44" aria-hidden="true">
        <ellipse
          cx="110"
          cy="136"
          rx="82"
          ry="10"
          fill="#0f172a"
          opacity="0.12"
        />
        <path
          d="M30 62 Q110 8 190 62"
          fill="none"
          stroke={frameColor}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M22 66 H198 L182 126 H38 Z"
          fill={bodyColor}
          stroke={frameColor}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M48 72 L43 121 M70 72 L66 122 M92 72 L90 123 M110 72 L110 123 M128 72 L130 123 M150 72 L154 122 M172 72 L177 121"
          stroke={weaveColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>

      <div
        className={`absolute -inset-1 rounded-2xl border-4 pointer-events-none transition-colors ${
          isActive ? "border-amber-300" : "border-transparent"
        }`}
      />

      <div className="absolute inset-x-2 bottom-20 text-center leading-tight">
        <div className={`text-sm font-bold ${labelColor}`}>{title}</div>
      </div>

      <div className="absolute inset-x-6 bottom-8 flex flex-wrap justify-center gap-1.5">
        {items.map((item) => (
          <AppleNumberToken
            key={item.index}
            value={item.value}
            size="sm"
            variant={isEven ? "even" : "odd"}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(item.index);
            }}
            disabled={disabled}
            title={`Lấy số ${item.value} ra khỏi giỏ`}
          />
        ))}

        {items.length === 0 && (
          <div className="text-[11px] text-slate-400">Giỏ đang trống</div>
        )}
      </div>
    </div>
  );
}

function OrchardScene() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 520"
      className="absolute inset-0 h-full w-full opacity-40"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="grassGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="trunkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
      </defs>

      <rect x="0" y="390" width="800" height="130" fill="url(#grassGrad)" />

      <rect
        x="355"
        y="170"
        width="90"
        height="255"
        rx="26"
        fill="url(#trunkGrad)"
      />

      <circle cx="250" cy="220" r="120" fill="#22c55e" />
      <circle cx="380" cy="140" r="148" fill="#16a34a" />
      <circle cx="540" cy="230" r="118" fill="#22c55e" />

      <circle cx="280" cy="208" r="18" fill="#ef4444" />
      <circle cx="338" cy="130" r="16" fill="#f97316" />
      <circle cx="430" cy="165" r="16" fill="#ef4444" />
      <circle cx="505" cy="250" r="15" fill="#f97316" />
      <circle cx="330" cy="275" r="14" fill="#ef4444" />
      <circle cx="455" cy="92" r="13" fill="#f97316" />
      <circle cx="560" cy="192" r="14" fill="#ef4444" />

      <ellipse
        cx="250"
        cy="430"
        rx="140"
        ry="34"
        fill="#059669"
        opacity="0.25"
      />
      <ellipse
        cx="540"
        cy="430"
        rx="140"
        ry="34"
        fill="#059669"
        opacity="0.25"
      />
    </svg>
  );
}

function AppleNumberToken({
  value,
  variant,
  size,
  onClick,
  disabled,
  title,
}: {
  value: number;
  variant: "tree" | "even" | "odd";
  size: "sm" | "md";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled: boolean;
  title: string;
}) {
  const palette =
    variant === "even"
      ? { main: "#38bdf8", shadow: "#0284c7", text: "#082f49" }
      : variant === "odd"
        ? { main: "#fb7185", shadow: "#e11d48", text: "#4c0519" }
        : { main: "#f87171", shadow: "#dc2626", text: "#ffffff" };

  const sizeClass = size === "md" ? "h-14 w-14" : "h-11 w-11";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${sizeClass} transition-transform ${
        disabled
          ? "cursor-default"
          : "cursor-pointer hover:scale-105 active:scale-95"
      }`}
    >
      <svg
        viewBox="0 0 100 110"
        className="h-full w-full drop-shadow-sm"
        aria-hidden="true"
      >
        <ellipse
          cx="50"
          cy="64"
          rx="35"
          ry="34"
          fill={palette.shadow}
          opacity="0.35"
        />
        <path
          d="M50 14 C57 6, 72 7, 76 18 C66 20, 59 25, 54 33"
          fill="#16a34a"
        />
        <path
          d="M50 26 C68 24, 83 38, 83 60 C83 80, 70 98, 50 100 C30 98, 17 80, 17 60 C17 38, 32 24, 50 26 Z"
          fill={palette.main}
          stroke={palette.shadow}
          strokeWidth="4"
        />
        <circle cx="38" cy="45" r="8" fill="#ffffff" opacity="0.35" />
        <text
          x="50"
          y="69"
          textAnchor="middle"
          fontSize="34"
          fontWeight="800"
          fill={palette.text}
        >
          {value}
        </text>
      </svg>
    </button>
  );
}

function buildTreeAppleSpots(count: number): TreeAppleSpot[] {
  const spots: TreeAppleSpot[] = [];

  for (let index = 0; index < count; index++) {
    let x = randomInt(22, 78);
    let y = randomInt(20, 58);

    let attempts = 0;
    while (
      spots.some((spot) => {
        const dx = spot.x - x;
        const dy = spot.y - y;
        return dx * dx + dy * dy < 72;
      }) &&
      attempts < 18
    ) {
      x = randomInt(22, 78);
      y = randomInt(20, 58);
      attempts++;
    }

    spots.push({
      x,
      y,
      rotate: randomInt(-18, 18),
      scale: 0.9 + randomInt(0, 14) / 100,
    });
  }

  return spots;
}

function ScatterPickBoard({
  items,
  selectedIndices,
  onToggle,
  disabled,
}: {
  items: ScatterNumberItem[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  disabled: boolean;
}) {
  const columnCount = Math.min(
    6,
    Math.max(3, Math.ceil(Math.sqrt(items.length))),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item, index) => {
          const isSelected = selectedIndices.has(index);

          return (
            <button
              key={item.id}
              style={item.style}
              onClick={() => onToggle(index)}
              disabled={disabled}
              className={`h-14 rounded-xl border-2 text-2xl font-black transition-all ${
                isSelected
                  ? "border-cyan-600 bg-cyan-500 text-white scale-105 shadow"
                  : `${item.toneClass} border-white/70`
              } ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              {item.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RevealCorrectIndices({
  items,
  targetIndices,
}: {
  items: ScatterNumberItem[];
  targetIndices: Set<number>;
}) {
  const correctValues = Array.from(targetIndices)
    .sort((a, b) => a - b)
    .map((index) => items[index]?.value)
    .filter((value): value is number => typeof value === "number");

  if (correctValues.length === 0) return null;

  return (
    <div className="mt-3 text-xs text-slate-500">
      Ô đúng gồm: {correctValues.join(", ")}
    </div>
  );
}

function ReviewBadge() {
  return (
    <div className="mb-4 text-center">
      <span className="inline-block px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
        📋 Chế độ xem lại
      </span>
    </div>
  );
}

function Feedback({
  result,
  isLocked,
  params,
  correctDetail,
  helpfulHint,
}: {
  result: { isCorrect: boolean } | null;
  isLocked: boolean;
  params: EvenOddWidgetParams;
  correctDetail: string;
  helpfulHint: string;
}) {
  if (!result || !isLocked) return null;
  if (!params.feedback.showFeedback) return null;

  return (
    <div
      className={`p-4 rounded-xl mt-4 border-2 text-center ${
        result.isCorrect
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="text-3xl mb-1">{result.isCorrect ? "🎉" : "💪"}</div>
      <div
        className={`text-lg font-bold ${
          result.isCorrect ? "text-green-700" : "text-red-700"
        }`}
      >
        <Speak>
          {result.isCorrect
            ? params.feedback.feedbackCorrect
            : params.feedback.feedbackIncorrect}
        </Speak>
      </div>
      {!result.isCorrect && (
        <div className="text-sm text-slate-500 mt-1">{correctDetail}</div>
      )}
      <div className="text-xs text-slate-500 mt-2">{helpfulHint}</div>
    </div>
  );
}

function getQuestionText(
  mode: EvenOddWidgetParams["mode"],
  customPrompt: string,
  targetParity: Parity,
  judgeNumber: number,
  judgeClaim: Parity,
): string {
  const prompt = customPrompt.trim();
  if (prompt) return prompt;

  if (mode === "pick-parity") {
    return `Trong đây có những số nào là số ${parityLabel(targetParity)}?`;
  }

  if (mode === "sort-baskets") {
    return "Xếp số chẵn và số lẻ vào từng giỏ tương ứng.";
  }

  return `Số ${judgeNumber} là số ${parityLabel(judgeClaim)}. Đúng hay sai?`;
}

function buildPickParityBoard({
  range,
  targetParity,
  totalNumbers,
  minTargetCount,
  maxTargetCount,
}: {
  range: NumberRange;
  targetParity: Parity;
  totalNumbers: number;
  minTargetCount: number;
  maxTargetCount: number;
}) {
  const total = clamp(totalNumbers, 6, 24);
  const normalizedMinTarget = clamp(
    Math.min(minTargetCount, maxTargetCount),
    1,
    total,
  );
  const normalizedMaxTarget = clamp(
    Math.max(minTargetCount, maxTargetCount),
    normalizedMinTarget,
    total,
  );
  const targetCount = randomInt(normalizedMinTarget, normalizedMaxTarget);

  const numbers: number[] = [];

  while (numbers.length < targetCount) {
    numbers.push(randomNumberByParity(targetParity, range));
  }

  while (numbers.length < total) {
    numbers.push(randomNumberByParity(oppositeParity(targetParity), range));
  }

  const shuffledNumbers = shuffleList(numbers);
  const targetIndices = new Set<number>();

  shuffledNumbers.forEach((value, index) => {
    if (parityOf(value) === targetParity) {
      targetIndices.add(index);
    }
  });

  return {
    items: toScatterItems(shuffledNumbers),
    targetIndices,
  };
}

function buildSortParityBoard({
  range,
  totalNumbers,
  uniqueNumbers,
}: {
  range: NumberRange;
  totalNumbers: number;
  uniqueNumbers: boolean;
}) {
  const total = clamp(totalNumbers, 4, 10);
  const pool: number[] = [];

  for (let value = range.min; value <= range.max; value++) {
    pool.push(value);
  }

  const numbers: number[] = [];

  if (uniqueNumbers) {
    const shuffledPool = shuffleList(pool);
    const maxCount = Math.min(total, shuffledPool.length);

    for (let index = 0; index < maxCount; index++) {
      numbers.push(shuffledPool[index]);
    }
  } else {
    while (numbers.length < total) {
      numbers.push(pool[randomInt(0, pool.length - 1)]);
    }
  }

  return {
    numbers: shuffleList(numbers),
  };
}

function buildJudgeParityData({ range }: { range: NumberRange }) {
  const number = randomInt(range.min, range.max);
  const actualParity = parityOf(number);

  const claimIsTrue = Math.random() < 0.5;
  const claimedParity = claimIsTrue
    ? actualParity
    : oppositeParity(actualParity);

  return {
    number,
    claimedParity,
    claimIsTrue,
  };
}

function randomNumberByParity(
  targetParity: Parity,
  range: NumberRange,
): number {
  const matched: number[] = [];

  for (let value = range.min; value <= range.max; value++) {
    if (parityOf(value) === targetParity) {
      matched.push(value);
    }
  }

  if (matched.length === 0) {
    return targetParity === "even" ? 0 : 1;
  }

  return matched[randomInt(0, matched.length - 1)];
}

function isSortAnswerCorrect(
  assignments: AssignmentMap,
  numbers: number[],
): boolean {
  const requiredCount = numbers.length;
  const assignedCount = Object.keys(assignments).length;

  if (assignedCount !== requiredCount) {
    return false;
  }

  for (let index = 0; index < numbers.length; index++) {
    const value = numbers[index];
    const assignedParity = assignments[index];

    if (!assignedParity) {
      return false;
    }

    if (assignedParity !== parityOf(value)) {
      return false;
    }
  }

  return true;
}

function parseAssignments(value: string): AssignmentMap {
  if (!value) return {};

  const mapping: AssignmentMap = {};
  const segments = value.split(",");

  segments.forEach((segment) => {
    const [indexRaw, parityRaw] = segment.split(":");
    const index = Number.parseInt(indexRaw, 10);

    if (!Number.isFinite(index)) return;
    if (parityRaw !== "even" && parityRaw !== "odd") return;

    mapping[index] = parityRaw;
  });

  return mapping;
}

function encodeAssignments(assignments: AssignmentMap): string {
  return Object.keys(assignments)
    .map((key) => Number.parseInt(key, 10))
    .filter((key) => Number.isFinite(key))
    .sort((a, b) => a - b)
    .map((index) => `${index}:${assignments[index]}`)
    .join(",");
}

function parseIndexSet(value: string): Set<number> {
  if (!value) return new Set<number>();

  return new Set(
    value
      .split(",")
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isFinite(item) && item >= 0),
  );
}

function encodeIndexSet(indices: Set<number>): string {
  return Array.from(indices)
    .sort((a, b) => a - b)
    .join(",");
}

function areSetsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;

  for (const value of a) {
    if (!b.has(value)) return false;
  }

  return true;
}

function toScatterItems(numbers: number[]): ScatterNumberItem[] {
  const toneClasses = [
    "bg-rose-100 text-rose-700",
    "bg-orange-100 text-orange-700",
    "bg-amber-100 text-amber-700",
    "bg-lime-100 text-lime-700",
    "bg-cyan-100 text-cyan-700",
    "bg-violet-100 text-violet-700",
  ] as const;

  return numbers.map((value, index) => {
    const shiftX = randomInt(-8, 8);
    const shiftY = randomInt(-8, 8);
    const rotate = randomInt(-16, 16);
    const scale = 0.92 + randomInt(0, 20) / 100;

    return {
      id: `pick-${index}-${value}`,
      value,
      style: {
        transform: `translate(${shiftX}px, ${shiftY}px) rotate(${rotate}deg) scale(${scale})`,
      },
      toneClass: toneClasses[randomInt(0, toneClasses.length - 1)],
    };
  });
}

function parityOf(value: number): Parity {
  return value % 2 === 0 ? "even" : "odd";
}

function oppositeParity(parity: Parity): Parity {
  return parity === "even" ? "odd" : "even";
}

function parityLabel(parity: Parity): string {
  return parity === "even" ? "chẵn" : "lẻ";
}

function normalizeRange(minValue: number, maxValue: number): NumberRange {
  return {
    min: clamp(Math.min(minValue, maxValue), 0, 10),
    max: clamp(Math.max(minValue, maxValue), 0, 10),
  };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shuffleList<T>(items: T[]): T[] {
  const copied = [...items];

  for (let index = copied.length - 1; index > 0; index--) {
    const randomIndex = randomInt(0, index);
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }

  return copied;
}

interface NumberRange {
  min: number;
  max: number;
}

interface TreeAppleSpot {
  x: number;
  y: number;
  rotate: number;
  scale: number;
}
