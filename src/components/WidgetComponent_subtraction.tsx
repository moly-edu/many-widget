import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useMemo } from "react";
import type {
  SubtractionWidgetAnswer,
  SubtractionWidgetParams,
} from "../definition_subtraction";
import { LearningObjectToken } from "./LearningObjects";
import { clamp, createLearningObjects } from "./learning-objects-data";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

export function WidgetComponentSubtraction() {
  const params = useWidgetParams<SubtractionWidgetParams>();

  const totalCount = clamp(params.totalCount, 0, 10);
  const takeAwayCount = clamp(params.takeAwayCount, 0, totalCount);
  const remainCount = totalCount - takeAwayCount;

  const totalObjects = useMemo(
    () => createLearningObjects(totalCount, "sub-total"),
    [totalCount],
  );

  const takeAwayObjects = useMemo(
    () => totalObjects.slice(0, takeAwayCount),
    [takeAwayCount, totalObjects],
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<SubtractionWidgetAnswer>({
    evaluate: (ans) => {
      const parsed = Number.parseInt(ans.value ?? "", 10);
      const isCorrect = Number.isFinite(parsed) && parsed === remainCount;

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  const questionText =
    params.customPrompt?.trim() ||
    "Quan sát phép trừ bằng hình đồ vật và điền kết quả còn lại.";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-green-50 via-emerald-50 to-teal-50">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="text-center mb-5">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-2">
              ➖ Phép trừ trong phạm vi 10
            </div>
            <h2 className="text-xl font-black text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center min-w-155">
              <ObjectBox
                title=""
                subtitle=""
                items={totalObjects}
                tone="left"
              />
              <EquationSymbol symbol="-" />
              <ObjectBox
                title=""
                subtitle=""
                items={takeAwayObjects}
                tone="right"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <EquationSymbol symbol="=" />
            <input
              type="number"
              min={0}
              max={10}
              value={answer?.value ?? ""}
              onChange={(event) => {
                setAnswer({ value: event.target.value });
              }}
              disabled={isLocked}
              placeholder="?"
              className="w-24 h-14 rounded-xl border-2 border-emerald-200 text-center text-2xl font-bold text-slate-700 focus:outline-hidden focus:border-emerald-400 disabled:bg-slate-100"
            />
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            showFeedback={params.feedback.showFeedback}
            correctText={params.feedback.feedbackCorrect}
            incorrectText={params.feedback.feedbackIncorrect}
            fallbackCorrect={`Rất tốt! Còn lại ${remainCount} đồ vật.`}
            fallbackIncorrect={`Chưa đúng. Kết quả đúng là ${remainCount}.`}
          />
        </div>
      </div>
    </div>
  );
}

function ObjectBox({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: ReturnType<typeof createLearningObjects>;
  tone: "left" | "right";
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 min-h-44 ${
        tone === "left"
          ? "border-emerald-200 bg-emerald-50"
          : "border-teal-200 bg-teal-50"
      }`}
    >
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-500 mb-2">{subtitle}</p>

      {items.length === 0 ? (
        <div className="text-xs italic text-slate-400">Không có đồ vật</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <LearningObjectToken key={item.id} item={item} size={50} />
          ))}
        </div>
      )}
    </div>
  );
}

function EquationSymbol({ symbol }: { symbol: string }) {
  return (
    <div className="text-4xl font-black text-emerald-500 text-center leading-none">
      {symbol}
    </div>
  );
}

function Feedback({
  result,
  isLocked,
  showFeedback,
  correctText,
  incorrectText,
  fallbackCorrect,
  fallbackIncorrect,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  showFeedback: boolean;
  correctText: string;
  incorrectText: string;
  fallbackCorrect: string;
  fallbackIncorrect: string;
}) {
  if (!result || !isLocked || !showFeedback) return null;

  return (
    <div
      className={`mt-4 p-4 rounded-xl border-2 text-center ${
        result.isCorrect
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="text-2xl mb-1">{result.isCorrect ? "🎯" : "💡"}</div>
      <p
        className={`font-semibold ${
          result.isCorrect ? "text-green-700" : "text-red-700"
        }`}
      >
        {result.isCorrect
          ? correctText || fallbackCorrect
          : incorrectText || fallbackIncorrect}
      </p>
    </div>
  );
}
