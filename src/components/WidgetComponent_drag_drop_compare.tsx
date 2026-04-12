import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useEffect, useMemo, type DragEvent } from "react";
import type {
  DragDropCompareWidgetAnswer,
  DragDropCompareWidgetParams,
} from "../definition_drag_drop_compare";

interface LearningObjectItem {
  id: string;
}

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type CompareSign = "<" | ">" | "=";

type Scenario =
  | {
      mode: "normal";
      imageUrl: string;
      total: number;
      initialLeft: number;
      moveCount: number;
      instructionText: string;
    }
  | {
      mode: "compare";
      imageUrl: string;
      total: number;
      initialLeft: number;
      sign: CompareSign;
      minMoveCount: number;
      instructionText: string;
      centerSymbol: CompareSign;
    };

const MODE_NORMAL = "Kéo thả ảnh bình thường";
const MODE_COMPARE = "Kéo thả có so sánh";
const DEFAULT_IMAGE = "https://picsum.photos/seed/drag-shared/96/96";

const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='16' fill='%23fde68a'/%3E%3Ccircle cx='48' cy='48' r='20' fill='%23f59e0b'/%3E%3C/svg%3E";

export function WidgetComponentDragDropCompare() {
  const params = useWidgetParams<DragDropCompareWidgetParams>();
  const scenario = useMemo(() => buildScenario(params), [params]);

  const dragObjects = useMemo(
    () =>
      createLearningObjects(
        scenario.total,
        `drag-widget-${scenario.mode}-${scenario.total}-${scenario.initialLeft}`,
      ),
    [scenario.initialLeft, scenario.mode, scenario.total],
  );

  const initialLeftSet = useMemo(
    () =>
      new Set(
        dragObjects.slice(0, scenario.initialLeft).map((item) => item.id),
      ),
    [dragObjects, scenario.initialLeft],
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
  } = useSubmission<DragDropCompareWidgetAnswer>({
    evaluate: (ans) => {
      const leftSet = parseIdSet(ans.value ?? "", dragObjects);
      const leftFinal = leftSet.size;
      const rightFinal = scenario.total - leftFinal;

      const isCorrect =
        scenario.mode === "normal"
          ? rightFinal === scenario.moveCount
          : satisfiesSign(leftFinal, rightFinal, scenario.sign);

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  useEffect(() => {
    setAnswer({ value: initialEncoded });
  }, [initialEncoded, setAnswer]);

  const parsedLeftSet = parseIdSet(answer?.value ?? "", dragObjects);
  const leftSet = answer?.value ? parsedLeftSet : initialLeftSet;

  const leftItems = dragObjects.filter((item) => leftSet.has(item.id));
  const rightItems = dragObjects.filter((item) => !leftSet.has(item.id));

  const setLeftItems = (nextLeftIds: Set<string>) => {
    if (isLocked) return;
    setAnswer({ value: encodeIdSet(nextLeftIds) });
  };

  const onDropLeft = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) return;

    const itemId = event.dataTransfer.getData("text/drag-item-id");
    if (!itemId) return;

    const nextLeft = new Set(leftSet);
    nextLeft.add(itemId);
    setLeftItems(nextLeft);
  };

  const onDropRight = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) return;

    const itemId = event.dataTransfer.getData("text/drag-item-id");
    if (!itemId) return;

    const nextLeft = new Set(leftSet);
    nextLeft.delete(itemId);
    setLeftItems(nextLeft);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-cyan-50 via-sky-50 to-indigo-50">
      <div className="w-full max-w-5xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="mb-4">
            <div className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold mb-2">
              {scenario.mode === "normal" ? MODE_NORMAL : MODE_COMPARE}
            </div>
            <h2 className="text-xl font-black text-slate-800">
              <Speak>{scenario.instructionText}</Speak>
            </h2>
          </div>

          {scenario.mode === "compare" ? (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <DropZone
                items={leftItems}
                imageUrl={scenario.imageUrl}
                onDrop={onDropLeft}
                isLocked={isLocked}
                count={leftItems.length}
              />

              <div className="h-14 w-14 rounded-2xl border border-slate-300 bg-white flex items-center justify-center text-3xl font-black text-slate-700">
                {scenario.centerSymbol}
              </div>

              <DropZone
                items={rightItems}
                imageUrl={scenario.imageUrl}
                onDrop={onDropRight}
                isLocked={isLocked}
                count={rightItems.length}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <DropZone
                items={leftItems}
                imageUrl={scenario.imageUrl}
                onDrop={onDropLeft}
                isLocked={isLocked}
                count={leftItems.length}
              />

              <DropZone
                items={rightItems}
                imageUrl={scenario.imageUrl}
                onDrop={onDropRight}
                isLocked={isLocked}
                count={rightItems.length}
              />
            </div>
          )}

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            scenario={scenario}
            leftCount={leftItems.length}
            rightCount={rightItems.length}
          />
        </div>
      </div>
    </div>
  );
}

function DropZone({
  items,
  imageUrl,
  onDrop,
  isLocked,
  count,
}: {
  items: ReturnType<typeof createLearningObjects>;
  imageUrl: string;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  isLocked: boolean;
  count: number;
}) {
  return (
    <div>
      <div
        className="rounded-2xl border-2 border-cyan-100 bg-cyan-50/60 p-4 flex items-center justify-center min-h-56 w-full"
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <div className="w-full min-h-44 grid grid-cols-3 gap-2 place-items-center justify-items-center">
          {items.map((item) => (
            <div
              key={item.id}
              className="h-24 w-24 rounded-xl border border-cyan-200 bg-white shadow-sm overflow-hidden"
              draggable={!isLocked}
              onDragStart={(event) => {
                if (isLocked) return;
                event.dataTransfer.setData("text/drag-item-id", item.id);
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <img
                src={imageUrl}
                alt="item"
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2 text-center text-sm font-semibold text-slate-600">
        {count} ảnh
      </p>
    </div>
  );
}

function Feedback({
  result,
  isLocked,
  scenario,
  leftCount,
  rightCount,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  scenario: Scenario;
  leftCount: number;
  rightCount: number;
}) {
  if (!result || !isLocked) return null;

  const expectedText =
    scenario.mode === "normal"
      ? `Ô 2 cần có đúng ${scenario.moveCount} ảnh.`
      : scenario.sign === ">"
        ? `Ô 1 phải lớn hơn ô 2. Cần kéo ít nhất ${scenario.minMoveCount} ảnh để đạt điều kiện.`
        : scenario.sign === "<"
          ? `Ô 1 phải nhỏ hơn ô 2. Cần kéo ít nhất ${scenario.minMoveCount} ảnh để đạt điều kiện.`
          : `Ô 1 phải bằng ô 2. Cần kéo ít nhất ${scenario.minMoveCount} ảnh để đạt điều kiện.`;

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
          ? "Chính xác rồi!"
          : "Chưa đúng, thử kéo thả lại nhé."}
      </p>
      <p className="mt-1 text-sm text-slate-600">{expectedText}</p>
      <p className="mt-1 text-sm text-slate-600">
        Hiện tại: ô 1 có {leftCount} ảnh, ô 2 có {rightCount} ảnh.
      </p>
    </div>
  );
}

function buildScenario(params: DragDropCompareWidgetParams): Scenario {
  const imageUrl = params.imageUrl?.trim() || DEFAULT_IMAGE;

  if (params.mode === MODE_NORMAL) {
    const total = clamp(params.normalTotalCount ?? 1, 1, 9);
    const moveCount = clamp(params.normalMoveCount ?? 1, 1, total);

    return {
      mode: "normal",
      imageUrl,
      total,
      initialLeft: total,
      moveCount,
      instructionText: `Kéo đúng ${moveCount} ảnh từ ô 1 sang ô 2.`,
    };
  }

  const sign: CompareSign = params.compareSign;
  const minMoveCount = clamp(params.compareMinMoveCount ?? 1, 1, 4);
  const scenarioSeed = Math.max(1, Math.floor(params.scenarioSeed ?? 1));

  // Build an unsatisfied starting state that still allows at least minMoveCount moves
  // to reach a satisfying state, and avoid making one side always equal to 1.
  const baseDifference = sign === "=" ? 2 * minMoveCount : 2 * minMoveCount - 1;
  const smallerSideBase = pickSmallerSideBase(baseDifference, scenarioSeed);

  let initialLeft = smallerSideBase;
  let initialRight = smallerSideBase;

  if (sign === ">") {
    // Start with left < right, so learner must move images from right to left.
    initialRight = smallerSideBase + baseDifference;
  } else if (sign === "<") {
    // Start with left > right, so learner must move images from left to right.
    initialLeft = smallerSideBase + baseDifference;
  } else {
    // Start unequal with even difference so equality is reachable.
    initialRight = smallerSideBase + baseDifference;
  }

  return {
    mode: "compare",
    imageUrl,
    total: initialLeft + initialRight,
    initialLeft,
    sign,
    minMoveCount,
    centerSymbol: sign,
    instructionText: `Kéo thả ảnh giữa hai ô để thỏa mãn dấu ${sign}`,
  };
}

function pickSmallerSideBase(difference: number, scenarioSeed: number): number {
  const maxTotal = 12;
  const maxBase = Math.max(1, Math.floor((maxTotal - difference) / 2));

  const preferredCandidates = [1, 2, 3].filter((value) => value <= maxBase);
  const candidates =
    preferredCandidates.length > 0
      ? preferredCandidates
      : Array.from({ length: maxBase }, (_, index) => index + 1);

  const pickedIndex = (scenarioSeed - 1) % candidates.length;
  return candidates[pickedIndex];
}

function satisfiesSign(
  left: number,
  right: number,
  sign: CompareSign,
): boolean {
  if (sign === ">") return left > right;
  if (sign === "<") return left < right;
  return left === right;
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

function createLearningObjects(
  count: number,
  prefix: string,
): LearningObjectItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
