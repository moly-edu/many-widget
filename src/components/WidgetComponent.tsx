import "../index.css";

import { useWidgetParams, useSubmission, Speak } from "@moly-edu/widget-sdk";
import type { WidgetParams, WidgetAnswer } from "../definition";
import { useState, useMemo } from "react";

export function WidgetComponent() {
  const params = useWidgetParams<WidgetParams>();
  const correctAnswer = params.num1 + params.num2;

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<WidgetAnswer>({
    evaluate: (ans) => {
      const isCorrect = parseInt(ans.value, 10) === correctAnswer;
      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  if (params.mode === "fill") {
    return (
      <FillMode
        params={params}
        correctAnswer={correctAnswer}
        answer={answer}
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
    <ChoiceMode
      params={params}
      correctAnswer={correctAnswer}
      answer={answer}
      setAnswer={setAnswer}
      result={result}
      submit={submit}
      isLocked={isLocked}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

// ============================================================
// Shared props
// ============================================================
interface ModeProps {
  params: WidgetParams;
  correctAnswer: number;
  answer: WidgetAnswer | undefined;
  setAnswer: (a: WidgetAnswer) => void;
  result: { isCorrect: boolean; score: number; maxScore: number } | null;
  submit: () => Promise<void>;
  isLocked: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
}

// ============================================================
// MODE: FILL (điền đáp án)
// ============================================================
function FillMode({
  params,
  correctAnswer,
  answer,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: ModeProps) {
  const [inputValue, setInputValue] = useState("");

  const handleChange = (val: string) => {
    if (isLocked) return;
    // Chỉ cho nhập số
    const cleaned = val.replace(/[^0-9-]/g, "");
    setInputValue(cleaned);
    if (cleaned) {
      setAnswer({ value: cleaned });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit) submit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-amber-50 to-orange-50">
      <div className="w-full max-w-md">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-3">
              ✏️ Điền đáp án
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{params.question}</Speak>
            </h2>
          </div>

          {/* Phép tính */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Speak text={`${params.num1} cộng ${params.num2} bằng bao nhiêu?`}>
              <span className="text-5xl font-bold text-slate-800">
                {params.num1}
              </span>
              <span className="text-4xl font-bold text-amber-500 mx-2">+</span>
              <span className="text-5xl font-bold text-slate-800">
                {params.num2}
              </span>
              <span className="text-4xl font-bold text-slate-400 mx-2">=</span>
              <span className="text-5xl font-bold text-amber-600">?</span>
            </Speak>
          </div>

          {/* Input */}
          <input
            type="text"
            inputMode="numeric"
            value={isLocked ? (answer?.value ?? "") : inputValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLocked}
            placeholder={
              params.fillSettings.showPlaceholder
                ? params.fillSettings.placeholder
                : undefined
            }
            className="w-full text-center text-3xl font-bold py-4 px-6 border-2 border-slate-200 rounded-xl 
              focus:border-amber-400 focus:outline-none transition-colors
              disabled:bg-slate-50 disabled:text-slate-500"
          />

          {/* Submit */}
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

          {/* Feedback */}
          <Feedback
            result={result}
            isLocked={isLocked}
            params={params}
            correctAnswer={correctAnswer}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODE: CHOICE (chọn đáp án)
// ============================================================
function ChoiceMode({
  params,
  correctAnswer,
  answer,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: ModeProps) {
  // Tạo danh sách đáp án
  const options = useMemo(() => {
    const count = params.choiceSettings.numberOfOptions;
    const opts = new Set<number>();
    opts.add(correctAnswer);

    // Tạo đáp án sai gần đúng
    while (opts.size < count) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const wrong = correctAnswer + offset;
      if (wrong > 0 && wrong !== correctAnswer) {
        opts.add(wrong);
      }
    }

    const arr = Array.from(opts);
    if (params.choiceSettings.shuffleOptions) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
  }, [
    correctAnswer,
    params.choiceSettings.numberOfOptions,
    params.choiceSettings.shuffleOptions,
  ]);

  const selectedValue = answer?.value ? parseInt(answer.value, 10) : null;

  const handleSelect = (val: number) => {
    if (isLocked) return;
    setAnswer({ value: String(val) });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-emerald-50 to-teal-50">
      <div className="w-full max-w-md">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mb-3">
              🎯 Chọn đáp án
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{params.question}</Speak>
            </h2>
          </div>

          {/* Phép tính */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Speak text={`${params.num1} cộng ${params.num2} bằng bao nhiêu?`}>
              <span className="text-5xl font-bold text-slate-800">
                {params.num1}
              </span>
              <span className="text-4xl font-bold text-emerald-500 mx-2">
                +
              </span>
              <span className="text-5xl font-bold text-slate-800">
                {params.num2}
              </span>
              <span className="text-4xl font-bold text-slate-400 mx-2">=</span>
              <span className="text-5xl font-bold text-emerald-600">?</span>
            </Speak>
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {options.map((val) => {
              const isSelected = selectedValue === val;
              return (
                <button
                  key={val}
                  onClick={() => handleSelect(val)}
                  disabled={isLocked}
                  className={`
                    py-4 rounded-xl text-2xl font-bold transition-all border-2
                    ${
                      isSelected
                        ? "bg-emerald-500 text-white border-emerald-600 scale-105 shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                    }
                    ${isLocked ? "cursor-default" : "cursor-pointer"}
                  `}
                >
                  {val}
                </button>
              );
            })}
          </div>

          {/* Submit */}
          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed 
                text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          {/* Feedback */}
          <Feedback
            result={result}
            isLocked={isLocked}
            params={params}
            correctAnswer={correctAnswer}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Shared components
// ============================================================
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
  correctAnswer,
}: {
  result: { isCorrect: boolean } | null;
  isLocked: boolean;
  params: WidgetParams;
  correctAnswer: number;
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
        <div className="text-sm text-slate-500 mt-1">
          Đáp án đúng: <strong>{correctAnswer}</strong>
        </div>
      )}
    </div>
  );
}
