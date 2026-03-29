import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useMemo } from "react";
import type {
  Shape2DWidgetAnswer,
  Shape2DWidgetParams,
} from "../definition_shapes_2d";

const SHAPE_KEYS = ["triangle", "rectangle", "circle", "square"] as const;
type Shape2D = (typeof SHAPE_KEYS)[number];

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

export function WidgetComponentShape2D() {
  const params = useWidgetParams<Shape2DWidgetParams>();

  const singleData = useMemo(
    () =>
      buildSingleChoiceData(
        params.targetShape,
        params.singleSettings.shuffleOptions,
      ),
    [params.singleSettings.shuffleOptions, params.targetShape],
  );

  const multiData = useMemo(
    () =>
      buildMultiSelectData({
        targetShape: params.targetShape,
        totalItems: params.multiSettings.totalItems,
        minTargetCount: params.multiSettings.minTargetCount,
        maxTargetCount: params.multiSettings.maxTargetCount,
      }),
    [
      params.multiSettings.maxTargetCount,
      params.multiSettings.minTargetCount,
      params.multiSettings.totalItems,
      params.targetShape,
    ],
  );

  const questionText = getQuestionText(
    params.mode,
    params.customPrompt,
    params.targetShape,
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<Shape2DWidgetAnswer>({
    evaluate: (ans) => {
      const value = ans.value?.trim() ?? "";

      let isCorrect = false;

      if (params.mode === "single-choice-4") {
        isCorrect = value === params.targetShape;
      }

      if (params.mode === "multi-select") {
        const selectedIndices = parseIndexSet(value);
        isCorrect = areSetsEqual(selectedIndices, multiData.targetIndices);
      }

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  if (params.mode === "single-choice-4") {
    return (
      <SingleChoiceMode
        params={params}
        questionText={questionText}
        options={singleData.options}
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

  const selectedIndices = parseIndexSet(answer?.value ?? "");

  return (
    <MultiSelectMode
      params={params}
      questionText={questionText}
      items={multiData.items}
      selectedIndices={selectedIndices}
      targetIndices={multiData.targetIndices}
      setAnswer={setAnswer}
      result={result}
      submit={submit}
      isLocked={isLocked}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

interface SharedModeProps {
  params: Shape2DWidgetParams;
  questionText: string;
  setAnswer: (answer: Shape2DWidgetAnswer) => void;
  result: SubmissionResult;
  submit: () => Promise<void>;
  isLocked: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
}

interface SingleChoiceModeProps extends SharedModeProps {
  options: Shape2D[];
  answerValue: string;
}

function SingleChoiceMode({
  params,
  questionText,
  options,
  answerValue,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: SingleChoiceModeProps) {
  const correctDetail = `Đáp án đúng là hình ${shapeLabel(params.targetShape)}.`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-sky-50 via-cyan-50 to-emerald-50">
      <div className="w-full max-w-2xl">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
          <HeaderBadge
            title="🟦 Widget Hình 2D"
            subtitle="Dạng 1: Chọn 1 trong 4"
            questionText={questionText}
          />

          <div className="grid grid-cols-2 gap-4">
            {options.map((shape) => {
              const isSelected = answerValue === shape;
              return (
                <button
                  key={shape}
                  onClick={() => {
                    if (isLocked) return;
                    setAnswer({ value: shape });
                  }}
                  disabled={isLocked}
                  className={`rounded-2xl border-2 p-3 transition-all ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-50 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-cyan-300"
                  } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Shape2DView shape={shape} />
                  <div className="mt-2 text-sm font-semibold text-slate-700">
                    {shapeLabel(shape)}
                  </div>
                </button>
              );
            })}
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed
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
            helpfulHint="Mẹo: Hình tam giác có 3 cạnh, hình chữ nhật có 4 góc vuông."
          />
        </div>
      </div>
    </div>
  );
}

interface MultiSelectModeProps extends SharedModeProps {
  items: Shape2D[];
  selectedIndices: Set<number>;
  targetIndices: Set<number>;
}

function MultiSelectMode({
  params,
  questionText,
  items,
  selectedIndices,
  targetIndices,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: MultiSelectModeProps) {
  const correctDetail = `Các đáp án đúng là những hình ${shapeLabel(params.targetShape)}.`;

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-indigo-50 via-blue-50 to-cyan-50">
      <div className="w-full max-w-3xl">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
          <HeaderBadge
            title="🟦 Widget Hình 2D"
            subtitle="Dạng 2: Chọn nhiều đáp án"
            questionText={questionText}
          />

          <div className="text-xs text-slate-500 mb-3 text-center">
            Đã chọn {selectedIndices.size} hình
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((shape, index) => {
              const isSelected = selectedIndices.has(index);
              const isTarget = targetIndices.has(index);

              return (
                <button
                  key={`shape-${index}-${shape}`}
                  onClick={() => toggleSelect(index)}
                  disabled={isLocked}
                  className={`rounded-2xl border-2 p-2 transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Shape2DView shape={shape} compact />
                  <div className="text-xs font-medium text-slate-600 mt-1">
                    {isLocked && result && !result.isCorrect && isTarget
                      ? "(Đúng)"
                      : shapeLabel(shape)}
                  </div>
                </button>
              );
            })}
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed
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
            helpfulHint="Quan sát kỹ từng hình rồi mới chọn, đừng chọn vội nhé."
          />
        </div>
      </div>
    </div>
  );
}

function HeaderBadge({
  title,
  subtitle,
  questionText,
}: {
  title: string;
  subtitle: string;
  questionText: string;
}) {
  return (
    <div className="text-center mb-6">
      <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mb-2">
        {title}
      </div>
      <div className="text-xs font-semibold text-slate-500 mb-2">
        {subtitle}
      </div>
      <h2 className="text-lg font-bold text-slate-800">
        <Speak>{questionText}</Speak>
      </h2>
    </div>
  );
}

function Shape2DView({
  shape,
  compact,
}: {
  shape: Shape2D;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-16" : "h-20";

  if (shape === "triangle") {
    return (
      <svg viewBox="0 0 120 90" className={`w-full ${sizeClass}`}>
        <polygon
          points="60,12 106,78 14,78"
          fill="#f97316"
          stroke="#c2410c"
          strokeWidth="4"
        />
      </svg>
    );
  }

  if (shape === "rectangle") {
    return (
      <svg viewBox="0 0 120 90" className={`w-full ${sizeClass}`}>
        <rect
          x="14"
          y="20"
          width="92"
          height="50"
          rx="8"
          fill="#38bdf8"
          stroke="#0369a1"
          strokeWidth="4"
        />
      </svg>
    );
  }

  if (shape === "circle") {
    return (
      <svg viewBox="0 0 120 90" className={`w-full ${sizeClass}`}>
        <circle
          cx="60"
          cy="45"
          r="30"
          fill="#22c55e"
          stroke="#166534"
          strokeWidth="4"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 90" className={`w-full ${sizeClass}`}>
      <rect
        x="25"
        y="12"
        width="70"
        height="70"
        rx="8"
        fill="#a78bfa"
        stroke="#6d28d9"
        strokeWidth="4"
      />
    </svg>
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
  params: Shape2DWidgetParams;
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
  mode: Shape2DWidgetParams["mode"],
  customPrompt: string,
  targetShape: Shape2D,
): string {
  const prompt = customPrompt.trim();
  if (prompt) return prompt;

  if (mode === "single-choice-4") {
    return `Đâu là hình ${shapeLabel(targetShape)}?`;
  }

  return `Hãy chọn tất cả hình ${shapeLabel(targetShape)} trong các hình dưới đây.`;
}

function buildSingleChoiceData(targetShape: Shape2D, shuffleOptions: boolean) {
  const options = shuffleOptions
    ? shuffleList([...SHAPE_KEYS])
    : [...SHAPE_KEYS];

  if (!options.includes(targetShape)) {
    options[0] = targetShape;
  }

  return { options };
}

function buildMultiSelectData({
  targetShape,
  totalItems,
  minTargetCount,
  maxTargetCount,
}: {
  targetShape: Shape2D;
  totalItems: number;
  minTargetCount: number;
  maxTargetCount: number;
}) {
  const total = clamp(totalItems, 6, 24);
  const minTarget = clamp(Math.min(minTargetCount, maxTargetCount), 1, total);
  const maxTarget = clamp(
    Math.max(minTargetCount, maxTargetCount),
    minTarget,
    total,
  );
  const targetCount = randomInt(minTarget, maxTarget);

  const items: Shape2D[] = [];

  while (items.length < targetCount) {
    items.push(targetShape);
  }

  while (items.length < total) {
    items.push(randomDistractorShape(targetShape));
  }

  const shuffledItems = shuffleList(items);
  const targetIndices = new Set<number>();

  shuffledItems.forEach((shape, index) => {
    if (shape === targetShape) {
      targetIndices.add(index);
    }
  });

  return {
    items: shuffledItems,
    targetIndices,
  };
}

function randomDistractorShape(targetShape: Shape2D): Shape2D {
  const pool = SHAPE_KEYS.filter((shape) => shape !== targetShape);
  return pool[randomInt(0, pool.length - 1)] as Shape2D;
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

function shapeLabel(shape: Shape2D): string {
  if (shape === "triangle") return "tam giác";
  if (shape === "rectangle") return "chữ nhật";
  if (shape === "circle") return "tròn";
  return "vuông";
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
