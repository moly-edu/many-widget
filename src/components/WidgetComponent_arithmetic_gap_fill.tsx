import "../index.css";

import {
  Speak,
  WidgetRuntime,
  useSubmission,
  useWidgetParams,
} from "@moly-edu/widget-sdk";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type {
  ArithmeticGapFillWidgetAnswer,
  ArithmeticGapFillWidgetParams,
} from "../definition_arithmetic_gap_fill";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type Type2SupportMode = "number-table" | "number-line";
type SupportModalStep = "root" | "type2-list" | "type2-preview";
type UsedSupport =
  | "show-expression"
  | "read-prompt"
  | "read-result"
  | Type2SupportMode;

type StepMove = {
  from: number;
  to: number;
  label: string;
};

type NumberStyle = {
  bg: string;
  text: string;
  border: string;
};

type GapFillDraft = {
  firstValue: string;
  secondValue: string;
  resultValue: string;
};

const EMPTY_DRAFT: GapFillDraft = {
  firstValue: "",
  secondValue: "",
  resultValue: "",
};

const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='16' fill='%23fef3c7'/%3E%3Ccircle cx='48' cy='48' r='20' fill='%23f59e0b'/%3E%3C/svg%3E";

const stepWordMap: Record<number, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
};

const supportLabelMap: Record<UsedSupport, string> = {
  "show-expression": "Điền sẵn 2 số đầu vào",
  "read-prompt": "Đọc đề bài",
  "read-result": "Đọc kết quả",
  "number-table": "Bảng số",
  "number-line": "Tia số",
};

const audioAssetModules = import.meta.glob("../assets/*.{wav,mp3,ogg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const audioFileByName = Object.entries(audioAssetModules).reduce<
  Record<string, string>
>((acc, [modulePath, assetUrl]) => {
  const fileName = modulePath.split("/").pop();
  if (fileName) {
    acc[fileName] = assetUrl;
  }
  return acc;
}, {});

export function WidgetComponentArithmeticGapFill() {
  const params = useWidgetParams<ArithmeticGapFillWidgetParams>();
  const {
    operation,
    firstNumber,
    secondNumber,
    firstImageUrl,
    secondImageUrl,
  } = getNormalizedConfig(params);

  const operatorSymbol = operation === "phép cộng" ? "+" : "-";
  const expectedResult =
    operation === "phép cộng"
      ? firstNumber + secondNumber
      : firstNumber - secondNumber;

  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportModalStep, setSupportModalStep] =
    useState<SupportModalStep>("root");
  const [pendingType2Support, setPendingType2Support] =
    useState<Type2SupportMode>("number-table");
  const [usedSupports, setUsedSupports] = useState<UsedSupport[]>([]);

  const audioTimerRef = useRef<number[]>([]);
  const draftRef = useRef<GapFillDraft>(EMPTY_DRAFT);
  const supportsRef = useRef<UsedSupport[]>([]);

  const stepMoves = useMemo(
    () =>
      buildStepMoves(
        firstNumber,
        secondNumber,
        operation === "phép cộng" ? "add" : "subtract",
      ),
    [firstNumber, operation, secondNumber],
  );

  const firstStyle = useMemo(() => getNumberStyle(firstNumber), [firstNumber]);
  const secondStyle = useMemo(
    () => getNumberStyle(secondNumber),
    [secondNumber],
  );
  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<ArithmeticGapFillWidgetAnswer>({
    evaluate: (ans) => {
      const draft = parseGapFillDraft(ans.value ?? "");
      const first = Number.parseInt(draft.firstValue, 10);
      const second = Number.parseInt(draft.secondValue, 10);
      const resultValue = Number.parseInt(draft.resultValue, 10);

      const isFirstCorrect = Number.isFinite(first) && first === firstNumber;
      const isSecondCorrect =
        Number.isFinite(second) && second === secondNumber;
      const isResultCorrect =
        Number.isFinite(resultValue) && resultValue === expectedResult;

      const isCorrect = isFirstCorrect && isSecondCorrect && isResultCorrect;

      const used = parseUsedSupports(ans.usedSupports ?? "");
      const hasReadResultSupport = used.includes("read-result");
      const normalSupportCount = used.filter(
        (item) => item !== "read-result",
      ).length;

      let score = isCorrect ? Math.max(0, 100 - normalSupportCount * 10) : 0;
      if (score > 0 && hasReadResultSupport) {
        score = score * 0.5;
      }

      return {
        isCorrect,
        score,
        maxScore: 100,
      };
    },
  });

  const draft = useMemo(
    () => parseGapFillDraft(answer?.value ?? ""),
    [answer?.value],
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    supportsRef.current = usedSupports;
  }, [usedSupports]);

  useEffect(() => {
    const parsed = parseUsedSupports(answer?.usedSupports ?? "");
    if (parsed.length === 0) return;

    setUsedSupports((prev) => {
      const merged = Array.from(new Set<UsedSupport>([...prev, ...parsed]));
      if (merged.length === prev.length) return prev;
      return merged;
    });
  }, [answer?.usedSupports]);

  useEffect(() => {
    audioTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    audioTimerRef.current = [];

    if (
      !supportModalOpen ||
      supportModalStep !== "type2-preview" ||
      (pendingType2Support !== "number-table" &&
        pendingType2Support !== "number-line")
    ) {
      return;
    }

    stepMoves.forEach((_, index) => {
      const timeout = window.setTimeout(
        () => {
          playStepAudio(operation, index + 1);
        },
        360 + index * 500,
      );
      audioTimerRef.current.push(timeout);
    });

    return () => {
      audioTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      audioTimerRef.current = [];
    };
  }, [
    operation,
    pendingType2Support,
    stepMoves,
    supportModalOpen,
    supportModalStep,
  ]);

  const writeAnswer = (
    nextDraft: GapFillDraft = draftRef.current,
    nextSupports: UsedSupport[] = supportsRef.current,
  ) => {
    setAnswer({
      value: serializeGapFillDraft(nextDraft),
      usedSupports: serializeUsedSupports(nextSupports),
    });
  };

  const markSupportUsed = (support: UsedSupport) => {
    setUsedSupports((prev) => {
      if (prev.includes(support)) return prev;
      const next = [...prev, support];
      supportsRef.current = next;
      writeAnswer(draftRef.current, next);
      return next;
    });
  };

  const onInputChange = (field: keyof GapFillDraft, raw: string) => {
    const clean = raw.replace(/[^\d]/g, "").slice(0, 2);
    const next = {
      ...draftRef.current,
      [field]: clean,
    };

    draftRef.current = next;
    writeAnswer(next, supportsRef.current);
  };

  const isAnswerComplete =
    draft.firstValue !== "" &&
    draft.secondValue !== "" &&
    draft.resultValue !== "";

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canSubmit && isAnswerComplete) {
      submit();
    }
  };

  const openSupportModal = () => {
    setSupportModalOpen(true);
    setSupportModalStep("root");
  };

  const closeSupportModal = () => {
    setSupportModalOpen(false);
  };

  const applyShowExpressionSupport = () => {
    const nextSupports: UsedSupport[] = supportsRef.current.includes(
      "show-expression",
    )
      ? supportsRef.current
      : [...supportsRef.current, "show-expression"];

    if (nextSupports !== supportsRef.current) {
      supportsRef.current = nextSupports;
      setUsedSupports(nextSupports);
    }

    const nextDraft: GapFillDraft = {
      ...draftRef.current,
      firstValue: String(firstNumber),
      secondValue: String(secondNumber),
    };

    draftRef.current = nextDraft;
    writeAnswer(nextDraft, nextSupports);
    closeSupportModal();
  };

  const previewTypeTwoSupport = (mode: Type2SupportMode) => {
    markSupportUsed(mode);
    setPendingType2Support(mode);
    setSupportModalStep("type2-preview");
  };

  const readPromptSupport = () => {
    markSupportUsed("read-prompt");
    closeSupportModal();
    speakVietnamese(
      buildExpressionSpeech(firstNumber, secondNumber, operation, false),
    );
  };

  const readResultSupport = () => {
    markSupportUsed("read-result");
    closeSupportModal();
    speakVietnamese(
      buildExpressionSpeech(firstNumber, secondNumber, operation, true),
    );
  };

  const usedSupportLabels = useMemo(
    () => usedSupports.map((item) => supportLabelMap[item]),
    [usedSupports],
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-cyan-50 via-sky-50 to-indigo-50">
      <style>{`
        @keyframes step-reveal {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes path-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes foot-fade {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.28;
            transform: scale(1.08);
          }
        }
      `}</style>

      <div className="w-full max-w-5xl">
        <div className="bg-white/95 rounded-3xl shadow-xl border border-sky-100 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold mb-2">
                Toán tình huống
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">
                <Speak>Đếm số lượng hình ảnh và tính rồi điền vào các ô.</Speak>
              </h2>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <button
                type="button"
                onClick={openSupportModal}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-700 text-sm font-semibold hover:bg-amber-100"
              >
                <span aria-hidden="true">🛟</span>
                Hỗ trợ
              </button>
            </div>
          </div>

          <div className="mt-2 overflow-x-auto pb-1">
            <div className="min-w-160 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-x-2 gap-y-2">
              <div className="col-start-1">
                <ImageCountPanel imageUrl={firstImageUrl} count={firstNumber} />
              </div>

              <div className="col-start-3">
                <ImageCountPanel
                  imageUrl={secondImageUrl}
                  count={secondNumber}
                />
              </div>

              <div className="col-start-1 flex justify-center">
                <AnswerInput
                  value={draft.firstValue}
                  onChange={(value) => onInputChange("firstValue", value)}
                  onKeyDown={onKeyDown}
                  disabled={isLocked}
                />
              </div>

              <div className="col-start-2 flex justify-center">
                <MathSymbol symbol={operatorSymbol} />
              </div>

              <div className="col-start-3 flex justify-center">
                <AnswerInput
                  value={draft.secondValue}
                  onChange={(value) => onInputChange("secondValue", value)}
                  onKeyDown={onKeyDown}
                  disabled={isLocked}
                />
              </div>

              <div className="col-start-4 flex justify-center">
                <MathSymbol symbol="=" />
              </div>

              <div className="col-start-5 flex justify-center">
                <AnswerInput
                  value={draft.resultValue}
                  onChange={(value) => onInputChange("resultValue", value)}
                  onKeyDown={onKeyDown}
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {!isLocked && (
            <button
              type="button"
              onClick={submit}
              disabled={!isAnswerComplete || !canSubmit || isSubmitting}
              className="w-full mt-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            expectedFirst={firstNumber}
            expectedSecond={secondNumber}
            expectedResult={expectedResult}
            answerDraft={draft}
            usedSupports={usedSupportLabels}
          />
        </div>
      </div>

      {supportModalOpen && (
        <SupportModal
          step={supportModalStep}
          pendingType2Support={pendingType2Support}
          onClose={closeSupportModal}
          onReadPrompt={readPromptSupport}
          onShowExpression={applyShowExpressionSupport}
          onSelectTypeTwo={() => setSupportModalStep("type2-list")}
          onReadResult={readResultSupport}
          onBack={() =>
            setSupportModalStep((prev) =>
              prev === "type2-preview" ? "type2-list" : "root",
            )
          }
          onPreviewTypeTwo={previewTypeTwoSupport}
          previewContent={
            <TypeTwoPreviewContent
              mode={pendingType2Support}
              firstNumber={firstNumber}
              secondNumber={secondNumber}
              expectedResult={expectedResult}
              operatorSymbol={operatorSymbol}
              stepMoves={stepMoves}
              firstStyle={firstStyle}
              secondStyle={secondStyle}
            />
          }
        />
      )}
    </div>
  );
}

function ImageCountPanel({
  imageUrl,
  count,
}: {
  imageUrl: string;
  count: number;
}) {
  return (
    <div className="rounded-3xl border-2 border-violet-500 bg-slate-100/90 px-2 py-2 shadow-sm">
      <div className="grid grid-cols-3 gap-2 justify-items-center">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`image-${count}-${index}`}
            className="h-16 w-16 md:h-18 md:w-18 rounded-xl border border-slate-300 bg-white flex items-center justify-center overflow-hidden"
          >
            <img
              src={imageUrl}
              alt={`item ${index + 1}`}
              loading="lazy"
              className="h-12 w-12 md:h-20 md:w-16 object-contain"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MathSymbol({ symbol }: { symbol: string }) {
  return (
    <div className="h-14 w-14 md:h-16 md:w-16 rounded-full border-4 border-violet-400 bg-white flex items-center justify-center text-3xl md:text-4xl font-black text-slate-700 shadow-sm">
      {symbol}
    </div>
  );
}

function AnswerInput({
  value,
  onChange,
  onKeyDown,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      inputMode="numeric"
      placeholder="?"
      className="h-14 w-14 md:h-16 md:w-16 rounded-2xl border-4 border-violet-500 bg-white text-center text-3xl md:text-4xl font-black text-slate-700 focus:outline-none focus:border-violet-600 disabled:bg-slate-100"
    />
  );
}

function SupportModal({
  step,
  pendingType2Support,
  onClose,
  onReadPrompt,
  onShowExpression,
  onSelectTypeTwo,
  onReadResult,
  onBack,
  onPreviewTypeTwo,
  previewContent,
}: {
  step: SupportModalStep;
  pendingType2Support: Type2SupportMode;
  onClose: () => void;
  onReadPrompt: () => void;
  onShowExpression: () => void;
  onSelectTypeTwo: () => void;
  onReadResult: () => void;
  onBack: () => void;
  onPreviewTypeTwo: (mode: Type2SupportMode) => void;
  previewContent: ReactNode;
}) {
  const previewLabelMap: Record<Type2SupportMode, string> = {
    "number-table": "bảng số",
    "number-line": "tia số",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            <Speak>Chọn hỗ trợ</Speak>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        {step === "root" && (
          <div className="grid md:grid-cols-2 gap-3">
            <SupportOptionCard
              title="Hỗ trợ đọc đề bài"
              colorClass="border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
              onClick={onReadPrompt}
              illustration={<SupportIllustration kind="read-prompt" />}
            />

            <SupportOptionCard
              title="Hỗ trợ điền 2 số đầu vào"
              colorClass="border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={onShowExpression}
              illustration={<SupportIllustration kind="show-expression" />}
            />

            <SupportOptionCard
              title="Hỗ trợ bằng bảng số hoặc tia số"
              colorClass="border-rose-200 bg-rose-50 hover:bg-rose-100"
              onClick={onSelectTypeTwo}
              illustration={<SupportIllustration kind="number-line" />}
            />

            <SupportOptionCard
              title="Hỗ trợ đọc kết quả"
              colorClass="border-amber-200 bg-amber-50 hover:bg-amber-100"
              onClick={onReadResult}
              illustration={<SupportIllustration kind="read-result" />}
            />
          </div>
        )}

        {step === "type2-list" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              Quay lại
            </button>

            <div className="grid md:grid-cols-2 gap-3">
              <SupportOptionCard
                title="Hỗ trợ bảng số"
                colorClass="border-rose-200 bg-rose-50 hover:bg-rose-100"
                onClick={() => onPreviewTypeTwo("number-table")}
                illustration={<SupportIllustration kind="number-table" />}
              />

              <SupportOptionCard
                title="Hỗ trợ tia số"
                colorClass="border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
                onClick={() => onPreviewTypeTwo("number-line")}
                illustration={<SupportIllustration kind="number-line" />}
              />
            </div>
          </div>
        )}

        {step === "type2-preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>

              <div className="text-sm text-slate-600">
                Đang xem trước:{" "}
                <span className="font-semibold">
                  <Speak>{previewLabelMap[pendingType2Support]}</Speak>
                </span>
              </div>
            </div>

            {previewContent}
          </div>
        )}
      </div>
    </div>
  );
}

function SupportOptionCard({
  title,
  colorClass,
  onClick,
  illustration,
}: {
  title: string;
  colorClass: string;
  onClick: () => void;
  illustration: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 ${colorClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-800 text-base">
          <Speak>{title}</Speak>
        </p>
        <div className="shrink-0">{illustration}</div>
      </div>
    </button>
  );
}

function TypeTwoPreviewContent({
  mode,
  firstNumber,
  secondNumber,
  expectedResult,
  operatorSymbol,
  stepMoves,
  firstStyle,
  secondStyle,
}: {
  mode: Type2SupportMode;
  firstNumber: number;
  secondNumber: number;
  expectedResult: number;
  operatorSymbol: string;
  stepMoves: StepMove[];
  firstStyle: NumberStyle;
  secondStyle: NumberStyle;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
        <div className="flex items-center justify-center gap-3 text-4xl md:text-5xl font-black font-mono">
          <span
            className="rounded-xl px-3 py-1 border"
            style={{
              backgroundColor: firstStyle.bg,
              color: firstStyle.text,
              borderColor: firstStyle.border,
            }}
          >
            {firstNumber}
          </span>
          <span className="text-sky-600">{operatorSymbol}</span>
          <span
            className="rounded-xl px-3 py-1 border"
            style={{
              backgroundColor: secondStyle.bg,
              color: secondStyle.text,
              borderColor: secondStyle.border,
            }}
          >
            {secondNumber}
          </span>
          <span className="text-slate-500">=</span>
          <span className="rounded-xl px-3 py-1 border border-slate-300 bg-white text-slate-500">
            ?
          </span>
        </div>
      </div>

      {mode === "number-table" ? (
        <NumberTableSupport
          start={firstNumber}
          target={expectedResult}
          stepMoves={stepMoves}
          accentStyle={secondStyle}
        />
      ) : (
        <NumberLineSupport
          start={firstNumber}
          target={expectedResult}
          stepMoves={stepMoves}
          accentStyle={secondStyle}
        />
      )}
    </div>
  );
}

function NumberTableSupport({
  start,
  target,
  stepMoves,
  accentStyle,
}: {
  start: number;
  target: number;
  stepMoves: StepMove[];
  accentStyle: NumberStyle;
}) {
  const numbers = Array.from({ length: 20 }, (_, index) => index);
  const stepIndexByValue = new Map<number, number>();

  stepMoves.forEach((move, index) => {
    stepIndexByValue.set(move.to, index);
  });

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <div className="grid grid-cols-10 gap-2">
        {numbers.map((value) => {
          const isStart = value === start;
          const isTarget = value === target;
          const stepIndex = stepIndexByValue.get(value);

          return (
            <div
              key={`table-${value}`}
              className="relative h-16 rounded-lg border flex items-center justify-center font-bold overflow-hidden"
              style={{
                borderColor:
                  isStart || isTarget ? accentStyle.border : "#cbd5e1",
                backgroundColor: isTarget
                  ? "#fde68a"
                  : isStart
                    ? accentStyle.bg
                    : "#ffffff",
                color: isStart || isTarget ? accentStyle.text : "#334155",
              }}
            >
              <span className="text-2xl font-black z-10">{value}</span>

              {typeof stepIndex === "number" && (
                <>
                  <div
                    className="absolute inset-0 flex items-center justify-center text-4xl z-20"
                    style={{
                      animation: isTarget
                        ? "foot-fade 1000ms ease forwards"
                        : "step-reveal 700ms ease forwards",
                      animationDelay: `${stepIndex * 520}ms`,
                      opacity: 0,
                    }}
                  >
                    👣
                  </div>

                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 text-lg font-black text-rose-700 z-30"
                    style={{
                      animation: "step-reveal 700ms ease forwards",
                      animationDelay: `${stepIndex * 520 + 180}ms`,
                      opacity: 0,
                    }}
                  >
                    {stepMoves[stepIndex].label}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumberLineSupport({
  start,
  target,
  stepMoves,
  accentStyle,
}: {
  start: number;
  target: number;
  stepMoves: StepMove[];
  accentStyle: NumberStyle;
}) {
  const rangeMin = Math.max(0, Math.min(start, target) - 1);
  const rangeMax = Math.min(19, Math.max(start, target) + 1);
  const values = Array.from(
    { length: rangeMax - rangeMin + 1 },
    (_, index) => rangeMin + index,
  );

  const width = Math.max(420, values.length * 95);
  const height = 190;
  const baselineY = 106;
  const leftPadding = 34;
  const rightPadding = 34;
  const xStep =
    values.length <= 1
      ? 0
      : (width - leftPadding - rightPadding) / (values.length - 1);

  const getX = (value: number) => leftPadding + (value - rangeMin) * xStep;

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <marker
            id="arrow-head-gap-fill"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={accentStyle.border} />
          </marker>
        </defs>

        <line
          x1={leftPadding}
          y1={baselineY}
          x2={width - rightPadding}
          y2={baselineY}
          stroke="#64748b"
          strokeWidth="3"
        />

        {values.map((value) => {
          const x = getX(value);
          const isStart = value === start;
          const isTarget = value === target;

          return (
            <g key={`line-point-${value}`}>
              <circle
                cx={x}
                cy={baselineY}
                r={isStart || isTarget ? 7 : 5}
                fill={isStart || isTarget ? accentStyle.border : "#94a3b8"}
              />
              <text
                x={x}
                y={baselineY + 24}
                fontSize="17"
                fontWeight="700"
                textAnchor="middle"
                fill="#334155"
              >
                {value}
              </text>
            </g>
          );
        })}

        {stepMoves.map((move, index) => {
          const x1 = getX(move.from);
          const x2 = getX(move.to);
          const mid = (x1 + x2) / 2;
          const arcHeight = 28 + (index % 2) * 10;
          const path = `M ${x1} ${baselineY} Q ${mid} ${arcHeight} ${x2} ${baselineY}`;
          const length = Math.abs(x2 - x1) * 1.9;

          return (
            <g key={`line-move-${move.from}-${move.to}-${index}`}>
              <path
                d={path}
                fill="none"
                stroke={accentStyle.border}
                strokeWidth="3"
                markerEnd="url(#arrow-head-gap-fill)"
                strokeDasharray={length}
                strokeDashoffset={length}
                style={{
                  animation: "path-draw 950ms ease forwards",
                  animationDelay: `${index * 520}ms`,
                }}
              />
              <text
                x={mid}
                y={arcHeight - 10}
                fontSize="20"
                fontWeight="800"
                textAnchor="middle"
                fill={accentStyle.text}
                style={{
                  animation: "step-reveal 700ms ease forwards",
                  animationDelay: `${index * 520 + 240}ms`,
                  opacity: 0,
                }}
              >
                {move.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SupportIllustration({
  kind,
}: {
  kind:
    | "show-expression"
    | "number-table"
    | "number-line"
    | "read-prompt"
    | "read-result";
}) {
  if (kind === "read-prompt" || kind === "read-result") {
    const waveColor = kind === "read-result" ? "#fb7185" : "#22d3ee";
    const bodyColor = kind === "read-result" ? "#f43f5e" : "#06b6d4";

    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <polygon
          points="10,19 20,19 30,11 30,37 20,29 10,29"
          fill={bodyColor}
        />
        <path
          d="M 36 18 Q 42 24 36 30"
          fill="none"
          stroke={waveColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 42 14 Q 52 24 42 34"
          fill="none"
          stroke={waveColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {kind === "read-result" && (
          <text x="54" y="16" fontSize="10" fontWeight="700" fill="#be123c">
            50%
          </text>
        )}
      </svg>
    );
  }

  if (kind === "show-expression") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <rect x="4" y="8" width="18" height="14" rx="3" fill="#bfdbfe" />
        <rect x="28" y="8" width="18" height="14" rx="3" fill="#fde68a" />
        <rect x="52" y="8" width="16" height="14" rx="3" fill="#d1fae5" />
        <text x="13" y="18" fontSize="10" textAnchor="middle" fill="#1e3a8a">
          4
        </text>
        <text x="37" y="18" fontSize="10" textAnchor="middle" fill="#92400e">
          3
        </text>
        <text x="60" y="18" fontSize="10" textAnchor="middle" fill="#065f46">
          ?
        </text>
        <text x="24" y="35" fontSize="16" fontWeight="700" fill="#0f766e">
          +
        </text>
        <text x="46" y="35" fontSize="16" fontWeight="700" fill="#0f766e">
          =
        </text>
      </svg>
    );
  }

  if (kind === "number-table") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect
              key={`t-${r}-${c}`}
              x={6 + c * 16}
              y={6 + r * 12}
              width="14"
              height="10"
              rx="2"
              fill={r === 1 && c === 2 ? "#fde68a" : "#fff"}
              stroke="#fda4af"
            />
          )),
        )}
        <text x="41" y="30" fontSize="14">
          👣
        </text>
      </svg>
    );
  }

  return (
    <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
      <line x1="6" y1="30" x2="66" y2="30" stroke="#0ea5e9" strokeWidth="2" />
      <circle cx="16" cy="30" r="3" fill="#0ea5e9" />
      <circle cx="34" cy="30" r="3" fill="#0ea5e9" />
      <circle cx="52" cy="30" r="3" fill="#0ea5e9" />
      <path
        d="M 16 30 Q 25 12 34 30"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
      />
    </svg>
  );
}

function Feedback({
  result,
  isLocked,
  expectedFirst,
  expectedSecond,
  expectedResult,
  answerDraft,
  usedSupports,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  expectedFirst: number;
  expectedSecond: number;
  expectedResult: number;
  answerDraft: GapFillDraft;
  usedSupports: string[];
}) {
  if (!result || !isLocked) return null;

  const first = Number.parseInt(answerDraft.firstValue, 10);
  const second = Number.parseInt(answerDraft.secondValue, 10);
  const final = Number.parseInt(answerDraft.resultValue, 10);

  return (
    <div
      className={`mt-4 p-4 rounded-xl border-2 text-center ${
        result.isCorrect
          ? "bg-green-50 border-green-200"
          : "bg-rose-50 border-rose-200"
      }`}
    >
      <div className="text-2xl mb-1">{result.isCorrect ? "🌟" : "💡"}</div>
      <p
        className={`font-semibold ${
          result.isCorrect ? "text-green-700" : "text-rose-700"
        }`}
      >
        {result.isCorrect
          ? "Chính xác rồi!"
          : "Chưa đúng, kiểm tra lại số lượng hai ô hình và kết quả."}
      </p>

      <div className="mt-3 grid md:grid-cols-3 gap-2 text-left">
        <CheckRow
          label="Số thứ nhất"
          actual={Number.isFinite(first) ? first : null}
          expected={expectedFirst}
        />
        <CheckRow
          label="Số thứ hai"
          actual={Number.isFinite(second) ? second : null}
          expected={expectedSecond}
        />
        <CheckRow
          label="Kết quả"
          actual={Number.isFinite(final) ? final : null}
          expected={expectedResult}
        />
      </div>

      {usedSupports.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            Hỗ trợ đã dùng
          </p>
          <ul className="mt-1 text-sm text-amber-800 list-disc pl-5">
            {usedSupports.map((item) => (
              <li key={`used-support-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CheckRow({
  label,
  actual,
  expected,
}: {
  label: string;
  actual: number | null;
  expected: number;
}) {
  const isCorrect = actual === expected;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        Bạn điền: <span className="font-bold">{actual ?? "(trống)"}</span>
      </p>
      <p className="text-sm text-slate-700">
        Đúng: <span className="font-bold">{expected}</span>
      </p>
      <p
        className={`mt-1 text-xs font-bold ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}
      >
        {isCorrect ? "Đúng" : "Sai"}
      </p>
    </div>
  );
}

function getNormalizedConfig(params: ArithmeticGapFillWidgetParams): {
  operation: "phép cộng" | "phép trừ";
  firstNumber: number;
  secondNumber: number;
  firstImageUrl: string;
  secondImageUrl: string;
} {
  const operation = params.operation;

  const firstImageUrl =
    params.firstImageUrl?.trim() ||
    "https://picsum.photos/seed/arithmetic-gap-first/96/96";
  const secondImageUrl =
    params.secondImageUrl?.trim() ||
    "https://picsum.photos/seed/arithmetic-gap-second/96/96";

  if (operation === "phép cộng") {
    return {
      operation,
      firstNumber: clamp(params.addFirstNumber ?? 1, 1, 10),
      secondNumber: clamp(params.addSecondNumber ?? 1, 1, 9),
      firstImageUrl,
      secondImageUrl,
    };
  }

  return {
    operation,
    firstNumber: clamp(params.numberMax, 1, 10),
    secondNumber: clamp(params.numberMin, 1, 9),
    firstImageUrl,
    secondImageUrl,
  };
}

function serializeGapFillDraft(value: GapFillDraft): string {
  return JSON.stringify(value);
}

function parseGapFillDraft(raw: string): GapFillDraft {
  if (!raw) return EMPTY_DRAFT;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_DRAFT;

    const draft = parsed as Partial<GapFillDraft>;
    return {
      firstValue: sanitizeDraftValue(draft.firstValue),
      secondValue: sanitizeDraftValue(draft.secondValue),
      resultValue: sanitizeDraftValue(draft.resultValue),
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function sanitizeDraftValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d]/g, "").slice(0, 2);
}

function serializeUsedSupports(items: UsedSupport[]): string {
  return Array.from(new Set(items)).join("|");
}

function parseUsedSupports(raw: string): UsedSupport[] {
  if (!raw) return [];

  const parsed = raw
    .split("|")
    .map((item) => item.trim())
    .filter((item): item is UsedSupport =>
      [
        "show-expression",
        "read-prompt",
        "read-result",
        "number-table",
        "number-line",
      ].includes(item),
    );

  return Array.from(new Set(parsed));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getNumberStyle(value: number): NumberStyle {
  const hue = ((Math.abs(value) + 1) * 37) % 360;
  return {
    bg: `hsl(${hue} 90% 92%)`,
    text: `hsl(${hue} 65% 28%)`,
    border: `hsl(${hue} 75% 58%)`,
  };
}

function buildStepMoves(
  start: number,
  distance: number,
  operation: "add" | "subtract",
): StepMove[] {
  const direction = operation === "add" ? 1 : -1;
  const moves: StepMove[] = [];

  for (let step = 1; step <= distance; step += 1) {
    const from = start + direction * (step - 1);
    const to = start + direction * step;
    const sign = direction > 0 ? "+" : "-";
    moves.push({ from, to, label: `${sign}${step}` });
  }

  return moves;
}

function numberToVietnamese(value: number): string {
  const words: Record<number, string> = {
    0: "không",
    1: "một",
    2: "hai",
    3: "ba",
    4: "bốn",
    5: "năm",
    6: "sáu",
    7: "bảy",
    8: "tám",
    9: "chín",
    10: "mười",
    11: "mười một",
    12: "mười hai",
    13: "mười ba",
    14: "mười bốn",
    15: "mười lăm",
    16: "mười sáu",
    17: "mười bảy",
    18: "mười tám",
    19: "mười chín",
  };

  return words[value] ?? String(value);
}

function buildExpressionSpeech(
  firstNumber: number,
  secondNumber: number,
  operation: "phép cộng" | "phép trừ",
  includeResult: boolean,
): string {
  const opWord = operation === "phép cộng" ? "cộng" : "trừ";
  const firstWord = numberToVietnamese(firstNumber);
  const secondWord = numberToVietnamese(secondNumber);

  if (!includeResult) {
    return `${firstWord} ${opWord} ${secondWord} bằng bao nhiêu`;
  }

  const result =
    operation === "phép cộng"
      ? firstNumber + secondNumber
      : firstNumber - secondNumber;
  const resultWord = numberToVietnamese(result);
  return `${firstWord} ${opWord} ${secondWord} bằng ${resultWord}`;
}

function speakVietnamese(text: string) {
  void WidgetRuntime.requestTtsSpeak({
    text,
    lang: "vi-VN",
    rate: 0.95,
    timeoutMs: 25000,
  }).catch(() => undefined);
}

function playStepAudio(operation: "phép cộng" | "phép trừ", step: number) {
  const word = stepWordMap[step];
  if (!word) return;

  const fileName =
    operation === "phép cộng" ? `add-${word}.wav` : `subtraction-${word}.wav`;

  const audioSrc = audioFileByName[fileName];
  if (!audioSrc) return;

  const audio = new Audio(audioSrc);
  void audio.play().catch(() => undefined);
}
