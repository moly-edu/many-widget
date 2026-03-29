import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useEffect, useMemo, type DragEvent } from "react";
import type {
  CompareWidgetAnswer,
  CompareWidgetParams,
} from "../definition_compare";
import { LearningObjectToken } from "./LearningObjects";
import { clamp, createLearningObjects } from "./learning-objects-data";

type CompareGoal = "equal" | "left-greater" | "left-less";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

export function WidgetComponentCompare() {
  const params = useWidgetParams<CompareWidgetParams>();

  const leftCount = clamp(params.leftCount, 0, 10);
  const rightCount = clamp(params.rightCount, 0, 10);
  const dragSetup = useMemo(
    () => buildDragSetup(params.dragGoal, leftCount, rightCount),
    [leftCount, params.dragGoal, rightCount],
  );
  const dragTotalCount = dragSetup.total;
  const dragGoal = params.dragGoal;

  const leftObjects = useMemo(
    () => createLearningObjects(leftCount, `compare-left-${params.mode}`),
    [leftCount, params.mode],
  );

  const rightObjects = useMemo(
    () => createLearningObjects(rightCount, `compare-right-${params.mode}`),
    [rightCount, params.mode],
  );

  const dragObjects = useMemo(
    () =>
      createLearningObjects(
        dragTotalCount,
        `compare-drag-${dragGoal}-${dragTotalCount}-${dragSetup.initialLeftCount}`,
      ),
    [dragGoal, dragSetup.initialLeftCount, dragTotalCount],
  );

  const initialLeftSet = useMemo(
    () =>
      new Set(
        dragObjects.slice(0, dragSetup.initialLeftCount).map((item) => item.id),
      ),
    [dragObjects, dragSetup.initialLeftCount],
  );

  const initialEncoded = useMemo(
    () => encodeIdSet(initialLeftSet),
    [initialLeftSet],
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<CompareWidgetAnswer>({
    evaluate: (ans) => {
      if (params.mode === "pick-sign") {
        const sign = ans.value ?? "";
        const expected = getCompareSign(leftCount, rightCount);
        const isCorrect = sign === expected;

        return {
          isCorrect,
          score: isCorrect ? 100 : 0,
          maxScore: 100,
        };
      }

      const leftSet = parseIdSet(ans.value ?? "", dragObjects);
      const leftFinal = leftSet.size;
      const rightFinal = dragObjects.length - leftFinal;
      const isCorrect = satisfiesGoal(leftFinal, rightFinal, dragGoal);

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  useEffect(() => {
    if (params.mode !== "drag-expression") return;
    setAnswer({ value: initialEncoded });
  }, [initialEncoded, params.mode, setAnswer]);

  if (params.mode === "pick-sign") {
    const selectedSign = answer?.value ?? "";
    const questionText =
      params.customPrompt?.trim() ||
      "Quan sát 2 ô đồ vật và chọn dấu so sánh đúng.";

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-violet-50 via-fuchsia-50 to-pink-50">
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
            <div className="text-center mb-5">
              <div className="inline-block px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold mb-2">
                ⚖️ So sánh trong phạm vi 10 - Dạng 1
              </div>
              <h2 className="text-xl font-black text-slate-800">
                <Speak>{questionText}</Speak>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ObjectGroup title="Ô 1" items={leftObjects} tone="left" />
              <ObjectGroup title="Ô 2" items={rightObjects} tone="right" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {[
                { sign: "<", label: "Bé hơn" },
                { sign: "=", label: "Bằng nhau" },
                { sign: ">", label: "Lớn hơn" },
              ].map((option) => (
                <button
                  key={option.sign}
                  onClick={() => setAnswer({ value: option.sign })}
                  disabled={isLocked}
                  className={`rounded-2xl border-2 px-3 py-3 transition-colors ${
                    selectedSign === option.sign
                      ? "border-fuchsia-500 bg-fuchsia-50"
                      : "border-slate-200 bg-white hover:border-fuchsia-300"
                  } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="text-2xl font-black text-slate-800">
                    {option.sign}
                  </div>
                  <div className="text-xs text-slate-500">{option.label}</div>
                </button>
              ))}
            </div>

            {!isLocked && (
              <button
                onClick={submit}
                disabled={!canSubmit || isSubmitting}
                className="w-full mt-5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white py-3 font-semibold disabled:bg-slate-300"
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
              fallbackCorrect="Đúng rồi! Em so sánh rất chính xác."
              fallbackIncorrect={`Chưa đúng. Kết quả đúng là ${leftCount} ${getCompareSign(leftCount, rightCount)} ${rightCount}.`}
            />
          </div>
        </div>
      </div>
    );
  }

  const parsedLeftSet = parseIdSet(answer?.value ?? "", dragObjects);
  const leftSet =
    answer?.value && parsedLeftSet.size === parseRawCount(answer.value)
      ? parsedLeftSet
      : initialLeftSet;
  const leftItems = dragObjects.filter((item) => leftSet.has(item.id));
  const rightItems = dragObjects.filter((item) => !leftSet.has(item.id));

  const questionText =
    params.customPrompt?.trim() ||
    `Kéo thả đồ vật giữa 2 ô để ${goalText(dragGoal)}.`;

  const setLeftItems = (nextLeftIds: Set<string>) => {
    if (isLocked) return;
    setAnswer({ value: encodeIdSet(nextLeftIds) });
  };

  const onDropLeft = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) return;

    const itemId = event.dataTransfer.getData("text/compare-item-id");
    if (!itemId) return;

    const nextLeft = new Set(leftSet);
    nextLeft.add(itemId);
    setLeftItems(nextLeft);
  };

  const onDropRight = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) return;

    const itemId = event.dataTransfer.getData("text/compare-item-id");
    if (!itemId) return;

    const nextLeft = new Set(leftSet);
    nextLeft.delete(itemId);
    setLeftItems(nextLeft);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-amber-50 via-orange-50 to-rose-50">
      <div className="w-full max-w-5xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="text-center mb-5">
            <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold mb-2">
              🔁 So sánh trong phạm vi 10 - Dạng 2
            </div>
            <h2 className="text-xl font-black text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              onDrop={onDropLeft}
              onDragOver={(event) => event.preventDefault()}
            >
              <ObjectGroup
                title="Ô 1"
                items={leftItems}
                tone="left"
                draggable={!isLocked}
                dragPrefix="left"
              />
            </div>

            <div
              onDrop={onDropRight}
              onDragOver={(event) => event.preventDefault()}
            >
              <ObjectGroup
                title="Ô 2"
                items={rightItems}
                tone="right"
                draggable={!isLocked}
                dragPrefix="right"
              />
            </div>
          </div>

          {!isLocked && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => setAnswer({ value: initialEncoded })}
                className="rounded-xl border border-slate-200 py-2.5 text-slate-600 hover:bg-slate-50"
              >
                Làm lại thao tác kéo thả
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit || isSubmitting}
                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-2.5 font-semibold disabled:bg-slate-300"
              >
                {isSubmitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            showFeedback={params.feedback.showFeedback}
            correctText={params.feedback.feedbackCorrect}
            incorrectText={params.feedback.feedbackIncorrect}
            fallbackCorrect="Đúng rồi! Em đã kéo thả thỏa điều kiện."
            fallbackIncorrect={`Chưa đạt yêu cầu "${goalText(dragGoal)}".`}
          />
        </div>
      </div>
    </div>
  );
}

function ObjectGroup({
  title,
  items,
  tone,
  draggable,
  dragPrefix,
}: {
  title: string;
  items: ReturnType<typeof createLearningObjects>;
  tone: "left" | "right";
  draggable?: boolean;
  dragPrefix?: "left" | "right";
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 min-h-64 ${
        tone === "left"
          ? "border-amber-200 bg-amber-50"
          : "border-rose-200 bg-rose-50"
      }`}
    >
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">Có {items.length} đồ vật</p>

      {items.length === 0 ? (
        <div className="text-xs italic text-slate-400">Ô trống</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <LearningObjectToken
              key={`${dragPrefix ?? "static"}-${item.id}`}
              item={item}
              size={52}
              draggable={Boolean(draggable)}
              onDragStart={(event) => {
                if (!dragPrefix) return;
                event.dataTransfer.setData("text/compare-item-id", item.id);
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

function parseIdSet(
  value: string,
  items: ReturnType<typeof createLearningObjects>,
): Set<string> {
  if (!value.trim()) return new Set<string>();
  if (value.trim() === "__EMPTY__") return new Set<string>();

  const validIds = new Set(items.map((item) => item.id));

  return new Set(
    value
      .split("|")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && validIds.has(item)),
  );
}

function encodeIdSet(ids: Set<string>): string {
  if (ids.size === 0) return "__EMPTY__";
  return [...ids].sort().join("|");
}

function parseRawCount(value: string): number {
  if (!value.trim()) return 0;
  if (value.trim() === "__EMPTY__") return 0;
  return value.split("|").filter((item) => item.trim().length > 0).length;
}

function getCompareSign(left: number, right: number): "<" | "=" | ">" {
  if (left < right) return "<";
  if (left > right) return ">";
  return "=";
}

function goalText(goal: CompareGoal): string {
  if (goal === "equal") return "hai ô có số lượng bằng nhau";
  if (goal === "left-greater") return "ô 1 nhiều hơn ô 2";
  return "ô 1 ít hơn ô 2";
}

function satisfiesGoal(
  left: number,
  right: number,
  goal: CompareGoal,
): boolean {
  if (goal === "equal") return left === right;
  if (goal === "left-greater") return left > right;
  return left < right;
}

function buildDragSetup(
  goal: CompareGoal,
  baseLeft: number,
  baseRight: number,
): { total: number; initialLeftCount: number } {
  const rawTotal = clamp(baseLeft + baseRight, 0, 10);

  if (goal === "equal") {
    let total = clamp(rawTotal < 4 ? 4 : rawTotal, 4, 10);
    if (total % 2 !== 0) {
      total = total < 10 ? total + 1 : total - 1;
    }

    // Start from an unequal split so learners need to move items to reach equality.
    const initialLeftCount = Math.max(1, total / 2 - 1);

    return {
      total,
      initialLeftCount,
    };
  }

  const total = clamp(rawTotal < 3 ? 3 : rawTotal, 3, 10);

  if (goal === "left-greater") {
    // Reverse the target at start: left < right.
    return {
      total,
      initialLeftCount: 1,
    };
  }

  // Reverse the target at start: left > right.
  return {
    total,
    initialLeftCount: total - 1,
  };
}
