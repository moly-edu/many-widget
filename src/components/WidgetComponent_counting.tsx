import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useMemo, type DragEvent } from "react";
import type {
  CountingWidgetAnswer,
  CountingWidgetParams,
} from "../definition_counting";
import {
  clamp,
  createLearningObjects,
  randomInt,
  shuffleArray,
} from "./learning-objects-data";
import { LearningObjectToken } from "./LearningObjects";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

export function WidgetComponentCounting() {
  const params = useWidgetParams<CountingWidgetParams>();

  const objectCount = clamp(params.objectCount, 1, 10);
  const targetMoveCount = clamp(params.targetMoveCount, 1, objectCount);

  const objects = useMemo(
    () => createLearningObjects(objectCount, `counting-${params.mode}`),
    [objectCount, params.mode],
  );

  const choiceOptions = useMemo(
    () => buildChoiceOptions(objectCount),
    [objectCount],
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<CountingWidgetAnswer>({
    evaluate: (ans) => {
      if (params.mode === "count-choice") {
        const selected = Number(ans.value ?? "");
        const isCorrect = Number.isFinite(selected) && selected === objectCount;

        return {
          isCorrect,
          score: isCorrect ? 100 : 0,
          maxScore: 100,
        };
      }

      const movedIds = parseIdSet(ans.value ?? "");
      const isCorrect = movedIds.size === targetMoveCount;

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  if (params.mode === "count-choice") {
    const selectedValue = Number(answer?.value ?? "NaN");
    const questionText =
      params.customPrompt?.trim() || "Trong hình dưới đây có bao nhiêu đồ vật?";

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-cyan-50 via-sky-50 to-blue-50">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
            <div className="text-center mb-5">
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold mb-2">
                🔢 Học đếm trong phạm vi 10 - Dạng 1
              </div>
              <h2 className="text-xl font-black text-slate-800">
                <Speak>{questionText}</Speak>
              </h2>
            </div>

            <ObjectBoard items={objects} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {choiceOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setAnswer({ value: String(option) })}
                  disabled={isLocked}
                  className={`rounded-2xl border-2 px-3 py-3 text-lg font-bold transition-colors ${
                    selectedValue === option
                      ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"
                  } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                >
                  {option}
                </button>
              ))}
            </div>

            {!isLocked && (
              <button
                onClick={submit}
                disabled={!canSubmit || isSubmitting}
                className="w-full mt-5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white py-3 font-semibold disabled:bg-slate-300"
              >
                {isSubmitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            )}

            <Feedback
              result={result}
              isLocked={isLocked}
              correctText={params.feedback.feedbackCorrect}
              incorrectText={params.feedback.feedbackIncorrect}
              showFeedback={params.feedback.showFeedback}
              fallbackCorrect={`Đúng rồi! Có ${objectCount} đồ vật.`}
              fallbackIncorrect={`Chưa đúng. Đáp án là ${objectCount}.`}
            />
          </div>
        </div>
      </div>
    );
  }

  const movedIds = parseIdSet(answer?.value ?? "");
  const sourceItems = objects.filter((item) => !movedIds.has(item.id));
  const targetItems = objects.filter((item) => movedIds.has(item.id));
  const questionText =
    params.customPrompt?.trim() ||
    `Hãy kéo thả ${targetMoveCount} đồ vật sang bên ô mục tiêu.`;

  const onDropToTarget = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) return;

    const itemId = event.dataTransfer.getData("text/object-id");
    if (!itemId || movedIds.has(itemId)) return;

    const next = new Set(movedIds);
    next.add(itemId);
    setAnswer({ value: encodeIdSet(next) });
  };

  const onDropToSource = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) return;

    const itemId = event.dataTransfer.getData("text/object-id");
    if (!itemId || !movedIds.has(itemId)) return;

    const next = new Set(movedIds);
    next.delete(itemId);
    setAnswer({ value: encodeIdSet(next) });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-lime-50 via-emerald-50 to-teal-50">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="text-center mb-5">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-2">
              🧲 Học đếm trong phạm vi 10 - Dạng 2
            </div>
            <h2 className="text-xl font-black text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DropPanel
              title="Ô nguồn"
              subtitle=""
              items={sourceItems}
              onDrop={onDropToSource}
              onDragOver={(event) => event.preventDefault()}
              tone="source"
              isLocked={isLocked}
            />

            <DropPanel
              title="Ô mục tiêu"
              subtitle=""
              items={targetItems}
              onDrop={onDropToTarget}
              onDragOver={(event) => event.preventDefault()}
              tone="target"
              isLocked={isLocked}
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
            correctText={params.feedback.feedbackCorrect}
            incorrectText={params.feedback.feedbackIncorrect}
            showFeedback={params.feedback.showFeedback}
            fallbackCorrect="Tuyệt vời! Em kéo đúng số lượng rồi."
            fallbackIncorrect={`Chưa đúng. Cần kéo đúng ${targetMoveCount} đồ vật.`}
          />
        </div>
      </div>
    </div>
  );
}

function ObjectBoard({
  items,
}: {
  items: ReturnType<typeof createLearningObjects>;
}) {
  return (
    <div className="rounded-2xl border-2 border-cyan-100 bg-cyan-50/60 p-4">
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 place-items-center">
        {items.map((item) => (
          <LearningObjectToken key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function DropPanel({
  title,
  subtitle,
  items,
  onDrop,
  onDragOver,
  tone,
  isLocked,
}: {
  title: string;
  subtitle: string;
  items: ReturnType<typeof createLearningObjects>;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  tone: "source" | "target";
  isLocked: boolean;
}) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`rounded-2xl border-2 p-4 min-h-56 ${
        tone === "source"
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>

      {items.length === 0 ? (
        <div className="text-xs text-slate-400 italic">Không có đồ vật</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item) => (
            <LearningObjectToken
              key={item.id}
              item={item}
              size={54}
              draggable={!isLocked}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/object-id", item.id);
                event.dataTransfer.effectAllowed = "move";
              }}
            />
          ))}
        </div>
      )}
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
      <div className="text-2xl mb-1">{result.isCorrect ? "🎉" : "💡"}</div>
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

function buildChoiceOptions(correctCount: number): number[] {
  const options = new Set<number>([correctCount]);

  while (options.size < 4) {
    options.add(randomInt(0, 10));
  }

  return shuffleArray([...options]);
}

function parseIdSet(value: string): Set<string> {
  if (!value.trim()) return new Set<string>();

  return new Set(
    value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function encodeIdSet(ids: Set<string>): string {
  return [...ids].sort().join("|");
}
