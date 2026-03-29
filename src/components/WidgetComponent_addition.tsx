import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useMemo } from "react";
import type {
  AdditionWidgetAnswer,
  AdditionWidgetParams,
} from "../definition_addition";
import { LearningObjectToken } from "./LearningObjects";
import { clamp, createLearningObjects } from "./learning-objects-data";

const BALANCE_DENOMINATIONS = [1, 2, 5, 10, 20];

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

export function WidgetComponentAddition() {
  const params = useWidgetParams<AdditionWidgetParams>();

  const mode = params.mode;
  const leftCount = clamp(params.leftCount, 0, 10);
  const rightCount = clamp(params.rightCount, 0, 10 - leftCount);
  const total = leftCount + rightCount;
  const target = clamp(params.target, 1, 20);

  const leftObjects = useMemo(
    () => createLearningObjects(leftCount, `addition-left-${mode}`),
    [leftCount, mode],
  );

  const rightObjects = useMemo(
    () => createLearningObjects(rightCount, `addition-right-${mode}`),
    [rightCount, mode],
  );

  const availableDenominations = useMemo(
    () => BALANCE_DENOMINATIONS.filter((value) => value <= target),
    [target],
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<AdditionWidgetAnswer>({
    evaluate: (ans) => {
      if (mode === "balance-scale") {
        const selectedWeights = parseWeightList(ans.value ?? "");
        const sum = selectedWeights.reduce((acc, value) => acc + value, 0);
        const isCorrect = sum === target;

        return {
          isCorrect,
          score: isCorrect ? 100 : 0,
          maxScore: 100,
        };
      }

      const parsed = Number.parseInt(ans.value ?? "", 10);
      const isCorrect = Number.isFinite(parsed) && parsed === total;

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  const selectedWeights = useMemo(
    () => parseWeightList(answer?.value ?? ""),
    [answer?.value],
  );
  const currentTotal = selectedWeights.reduce((sum, value) => sum + value, 0);

  const questionText =
    params.customPrompt?.trim() ||
    (mode === "balance-scale"
      ? "Chọn các quả cân để cân bằng đúng trọng lượng mục tiêu."
      : "Quan sát hai nhóm đồ vật và điền kết quả phép cộng.");

  if (mode === "balance-scale") {
    const rotationAngle = getRotationAngle(currentTotal, target);

    const handleAddWeight = (value: number) => {
      if (isLocked) return;
      const next = [...selectedWeights, value];
      setAnswer({ value: JSON.stringify(next) });
    };

    const handleRemoveWeight = (index: number) => {
      if (isLocked) return;
      const next = selectedWeights.filter(
        (_, itemIndex) => itemIndex !== index,
      );
      setAnswer({ value: JSON.stringify(next) });
    };

    const handleClearAll = () => {
      if (isLocked) return;
      setAnswer({ value: JSON.stringify([]) });
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-sky-100 to-blue-50">
        <div className="w-full max-w-3xl">
          {isLocked && (
            <div className="mb-4 text-center">
              <span className="inline-block px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                📋 Chế độ xem lại
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-slate-200">
            <div className="text-center mb-4">
              <div className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold mb-2">
                ⚖️ Dạng cân bằng trong phạm vi 20
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1 text-slate-800">
                <Speak>{questionText}</Speak>
              </h2>
            </div>

            <div className="mb-6">
              <div className="relative">
                <div className="flex justify-center mb-2">
                  <div className="w-0 h-0 border-l-20 border-l-transparent border-r-20 border-r-transparent border-b-30 border-b-slate-700" />
                </div>

                <div className="relative h-2 mx-auto w-3/5">
                  <div
                    className="absolute inset-0 bg-slate-700 rounded-full transition-transform duration-300"
                    style={{
                      transform: `rotate(${rotationAngle}deg)`,
                      transformOrigin: "center",
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 -translate-x-1/2"
                      style={{ width: "42%" }}
                    >
                      <div className="flex justify-center">
                        <div className="w-0.5 h-10 bg-slate-600" />
                      </div>
                      <div className="bg-amber-100 border-2 border-amber-600 rounded-t-lg h-24 flex flex-col items-center justify-center shadow-lg">
                        <div className="text-3xl md:text-4xl font-bold text-amber-800 mb-1">
                          {target}
                        </div>
                        <div className="text-xs text-amber-700 font-semibold">
                          kg
                        </div>
                      </div>
                    </div>

                    <div
                      className="absolute right-0 top-0 translate-x-1/2"
                      style={{ width: "42%" }}
                    >
                      <div className="flex justify-center">
                        <div className="w-0.5 h-10 bg-slate-600" />
                      </div>
                      <div className="bg-sky-100 border-2 border-sky-600 rounded-t-lg h-24 flex flex-wrap items-start justify-center p-1.5 gap-1 overflow-y-auto shadow-lg">
                        {selectedWeights.length === 0 ? (
                          <div className="flex items-center justify-center w-full h-full text-sky-400 text-xs">
                            Chọn quả cân
                          </div>
                        ) : (
                          selectedWeights.map((value, index) => (
                            <button
                              key={`selected-${index}-${value}`}
                              onClick={() => handleRemoveWeight(index)}
                              disabled={isLocked}
                              className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-base font-bold rounded-full border-2 transition-all ${
                                isLocked
                                  ? "bg-sky-200 border-sky-400 text-sky-700 cursor-default"
                                  : "bg-sky-300 border-sky-500 text-sky-800 hover:bg-sky-400 cursor-pointer"
                              }`}
                            >
                              {value}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-1">
                  <div className="w-24 h-6 bg-slate-700 rounded-t-lg" />
                </div>
              </div>
            </div>

            {!isLocked && (
              <div className="mb-4">
                <h3 className="text-center text-sm font-semibold text-slate-700 mb-3">
                  Chọn quả cân:
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {availableDenominations.map((value) => (
                    <button
                      key={value}
                      onClick={() => handleAddWeight(value)}
                      className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center text-lg md:text-xl font-bold bg-white border-2 border-indigo-300 text-indigo-700 rounded-full hover:bg-indigo-50 hover:border-indigo-500 hover:scale-110 transition-all shadow-sm hover:shadow-md"
                    >
                      {value}
                    </button>
                  ))}
                </div>

                {selectedWeights.length > 0 && (
                  <div className="text-center mt-3">
                    <button
                      onClick={handleClearAll}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isLocked && (
              <button
                onClick={submit}
                disabled={!canSubmit || isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm md:text-base"
              >
                {isSubmitting ? "Đang nộp bài..." : "Nộp bài"}
              </button>
            )}

            {result && isLocked && (
              <div
                className={`p-4 md:p-5 rounded-xl mt-4 border-2 ${
                  result.isCorrect
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {result.isCorrect ? "🎉" : "💪"}
                  </div>
                  <div
                    className={`text-lg md:text-xl font-bold mb-1 ${
                      result.isCorrect ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {result.isCorrect
                      ? params.feedback.showFeedback
                        ? params.feedback.feedbackCorrect
                        : "Tuyệt vời!"
                      : params.feedback.showFeedback
                        ? params.feedback.feedbackIncorrect
                        : "Chưa đúng rồi!"}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      result.isCorrect ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {result.isCorrect
                      ? `Đã cân bằng: ${currentTotal} kg = ${target} kg`
                      : `Tổng đã chọn: ${currentTotal} kg, mục tiêu ${target} kg`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-yellow-50 via-amber-50 to-orange-50">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="text-center mb-5">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold mb-2">
              ➕ Phép cộng trong phạm vi 10
            </div>
            <h2 className="text-xl font-black text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center min-w-155">
              <ObjectBox title="" items={leftObjects} tone="left" />
              <EquationSymbol symbol="+" />
              <ObjectBox title="" items={rightObjects} tone="right" />
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
              className="w-24 h-14 rounded-xl border-2 border-amber-200 text-center text-2xl font-bold text-slate-700 focus:outline-hidden focus:border-amber-400 disabled:bg-slate-100"
            />
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-3 font-semibold disabled:bg-slate-300"
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
            fallbackCorrect={`Chính xác! Kết quả là ${total}.`}
            fallbackIncorrect={`Chưa đúng. Kết quả đúng là ${total}.`}
          />
        </div>
      </div>
    </div>
  );
}

function parseWeightList(value: string): number[] {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  } catch {
    return [];
  }
}

function getRotationAngle(current: number, target: number): number {
  const difference = current - target;
  const maxAngle = 10;
  const normalizedBy = Math.max(target, 1);
  const angle = (difference / normalizedBy) * maxAngle;

  return Math.max(-maxAngle, Math.min(maxAngle, angle));
}

function ObjectBox({
  title,
  items,
  tone,
}: {
  title: string;
  items: ReturnType<typeof createLearningObjects>;
  tone: "left" | "right";
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 min-h-44 ${
        tone === "left"
          ? "border-amber-200 bg-amber-50"
          : "border-orange-200 bg-orange-50"
      }`}
    >
      <h3 className="text-sm font-bold text-slate-700 mb-2">{title}</h3>
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
    <div className="text-4xl font-black text-amber-500 text-center leading-none">
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
      <div className="text-2xl mb-1">{result.isCorrect ? "🌟" : "💡"}</div>
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
