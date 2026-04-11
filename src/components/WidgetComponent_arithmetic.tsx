import "../index.css";

import {
  Speak,
  VoiceNumberInput,
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
  ArithmeticWidgetAnswer,
  ArithmeticWidgetParams,
} from "../definition_arithmetic";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type SupportMode = "none" | "column";
type Type2SupportMode = "sticks" | "lego" | "number-table" | "number-line";
type SupportModalStep = "root" | "type2-list" | "type2-preview";
type AnswerMethod = "voice" | "input" | "choice";
type UsedSupport = "column" | "read-prompt" | "read-result" | Type2SupportMode;

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
  column: "Đặt tính theo cột",
  "read-prompt": "Đọc đề bài",
  "read-result": "Đọc kết quả",
  sticks: "Que tính",
  lego: "Lego",
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

export function WidgetComponentArithmetic() {
  const params = useWidgetParams<ArithmeticWidgetParams>();
  const { operation, firstNumber, secondNumber } =
    getNormalizedOperands(params);
  const operatorSymbol = operation === "phép cộng" ? "+" : "-";
  const expectedResult =
    operation === "phép cộng"
      ? firstNumber + secondNumber
      : firstNumber - secondNumber;

  const [supportMode, setSupportMode] = useState<SupportMode>("none");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportModalStep, setSupportModalStep] =
    useState<SupportModalStep>("root");
  const [pendingType2Support, setPendingType2Support] =
    useState<Type2SupportMode>("sticks");

  const [answerMethod, setAnswerMethod] = useState<AnswerMethod>("input");
  const [answerMethodModalOpen, setAnswerMethodModalOpen] = useState(false);
  const [usedSupports, setUsedSupports] = useState<UsedSupport[]>([]);

  const [columnTens, setColumnTens] = useState("");
  const [columnUnits, setColumnUnits] = useState("");

  const audioTimerRef = useRef<number[]>([]);

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<ArithmeticWidgetAnswer>({
    evaluate: (ans) => {
      const parsed = Number.parseInt(ans.value ?? "", 10);
      const isCorrect = Number.isFinite(parsed) && parsed === expectedResult;
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

  const questionText =
    operation === "phép cộng"
      ? "Tính phép cộng theo cột dọc."
      : "Tính phép trừ theo cột dọc.";

  const expressionText = `${firstNumber} ${operatorSymbol} ${secondNumber}`;
  const firstStyle = getNumberStyle(firstNumber);
  const secondStyle = getNumberStyle(secondNumber);
  const resultStyle = getNumberStyle(expectedResult);

  const stepMoves = useMemo(
    () =>
      buildStepMoves(
        firstNumber,
        secondNumber,
        operation === "phép cộng" ? "add" : "subtract",
      ),
    [firstNumber, secondNumber, operation],
  );

  const choiceOptions = useMemo(() => {
    const optionRange =
      operation === "phép cộng" ? { min: 2, max: 19 } : { min: 0, max: 9 };

    return buildChoiceOptions(
      expectedResult,
      optionRange.min,
      optionRange.max,
      firstNumber * 100 + secondNumber * 10 + expectedResult,
    );
  }, [expectedResult, firstNumber, operation, secondNumber]);

  const effectiveAnswerMethod: AnswerMethod =
    supportMode === "column" ? "input" : answerMethod;
  const usedSupportLabels = useMemo(
    () => usedSupports.map((item) => supportLabelMap[item]),
    [usedSupports],
  );

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
    if (supportMode !== "column") return;

    const raw = (answer?.value ?? "").replace(/[^\d]/g, "").slice(-2);
    if (!raw) {
      setColumnTens("");
      setColumnUnits("");
      return;
    }

    if (raw.length === 1) {
      setColumnTens("");
      setColumnUnits(raw);
      return;
    }

    setColumnTens(raw[0]);
    setColumnUnits(raw[1]);
  }, [answer?.value, supportMode]);

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
        380 + index * 520,
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

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canSubmit) {
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

  const applyTypeOneSupport = () => {
    markSupportUsed("column");
    setSupportMode("column");
    setAnswerMethod("input");
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

  const writeAnswer = (nextValue: string, supports = usedSupports) => {
    setAnswer({
      value: nextValue,
      usedSupports: serializeUsedSupports(supports),
    });
  };

  const markSupportUsed = (support: UsedSupport) => {
    setUsedSupports((prev) => {
      if (prev.includes(support)) return prev;
      const next = [...prev, support];
      writeAnswer(answer?.value ?? "", next);
      return next;
    });
  };

  const onAnswerChange = (value: string) => {
    writeAnswer(value.replace(/[^\d]/g, ""));
  };

  const stepperRange =
    operation === "phép cộng" ? { min: 2, max: 19 } : { min: 0, max: 9 };

  const adjustAnswerBy = (delta: number) => {
    const current = Number.parseInt(answer?.value ?? "", 10);
    const base = Number.isFinite(current) ? current : stepperRange.min;
    const next = clamp(base + delta, stepperRange.min, stepperRange.max);
    writeAnswer(String(next));
  };

  const updateColumnAnswer = (part: "tens" | "units", value: string) => {
    const clean = value.replace(/[^\d]/g, "").slice(-1);
    const nextTens = part === "tens" ? clean : columnTens;
    const nextUnits = part === "units" ? clean : columnUnits;

    if (part === "tens") setColumnTens(clean);
    if (part === "units") setColumnUnits(clean);

    const merged =
      nextTens === "" && nextUnits === ""
        ? ""
        : nextTens === ""
          ? nextUnits
          : `${nextTens}${nextUnits}`;

    writeAnswer(merged);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-rose-50 via-orange-50 to-amber-50">
      <style>{`
        @keyframes step-reveal {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.9);
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
            opacity: 0.3;
            transform: scale(1.1);
          }
        }
      `}</style>

      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-lg border border-orange-100 p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold mb-2">
                Cộng trừ lớp 1 (1-10)
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">
                <Speak>{questionText}</Speak>
              </h2>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <button
                type="button"
                onClick={openSupportModal}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-700 text-sm font-semibold hover:bg-amber-100"
              >
                <span aria-hidden="true" className="mr-1">
                  🛟
                </span>
                Hỗ trợ
              </button>

              <button
                type="button"
                onClick={() => setAnswerMethodModalOpen(true)}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-indigo-700 text-sm font-semibold hover:bg-indigo-100"
              >
                <span aria-hidden="true" className="mr-1">
                  ⌨️
                </span>
                Phương thức điền
              </button>

              {supportMode !== "none" && (
                <button
                  type="button"
                  onClick={() => setSupportMode("none")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Tắt hỗ trợ
                </button>
              )}
            </div>
          </div>

          {supportMode === "column" ? (
            <ColumnSupportBoard
              firstNumber={firstNumber}
              secondNumber={secondNumber}
              operatorSymbol={operatorSymbol}
              tensValue={columnTens}
              unitValue={columnUnits}
              onTensChange={(value) => updateColumnAnswer("tens", value)}
              onUnitsChange={(value) => updateColumnAnswer("units", value)}
              onKeyDown={onKeyDown}
              disabled={isLocked}
            />
          ) : (
            <div className="space-y-4">
              <VerticalMathBoard
                firstNumber={firstNumber}
                secondNumber={secondNumber}
                operatorSymbol={operatorSymbol}
                answerArea={
                  effectiveAnswerMethod === "voice" ? (
                    <VoiceNumberInput
                      value={answer?.value ?? ""}
                      onValueChange={(cleaned) => onAnswerChange(cleaned)}
                      onKeyDown={onKeyDown}
                      disabled={isLocked}
                      lang="vi-VN"
                      timeoutMs={10000}
                      showMic="auto"
                      micButtonLabel="Trả lời bằng giọng nói"
                      stopButtonLabel="Dừng nghe"
                      placeholder="?"
                      className="w-full h-14 rounded-lg border-2 border-orange-200 text-right px-3 text-4xl font-bold text-slate-700 bg-white focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
                    />
                  ) : effectiveAnswerMethod === "input" ? (
                    <AnswerInput
                      value={answer?.value ?? ""}
                      onChange={onAnswerChange}
                      onKeyDown={onKeyDown}
                      disabled={isLocked}
                      showStepper={true}
                      onIncrement={() => adjustAnswerBy(1)}
                      onDecrement={() => adjustAnswerBy(-1)}
                    />
                  ) : (
                    <div className="h-14 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-2xl font-bold">
                      ?
                    </div>
                  )
                }
              />

              {effectiveAnswerMethod === "choice" && (
                <ChoiceAnswerBoard
                  options={choiceOptions}
                  selectedValue={answer?.value ?? ""}
                  onSelect={(value) => writeAnswer(String(value))}
                  disabled={isLocked}
                />
              )}
            </div>
          )}

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            correctText="Chính xác rồi!"
            incorrectText="Chưa đúng, thử lại nhé."
            expectedResult={expectedResult}
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
          onSelectTypeOne={applyTypeOneSupport}
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
              operation={operation}
              expressionText={expressionText}
              firstNumber={firstNumber}
              secondNumber={secondNumber}
              operatorSymbol={operatorSymbol}
              expectedResult={expectedResult}
              stepMoves={stepMoves}
              firstStyle={firstStyle}
              secondStyle={secondStyle}
              resultStyle={resultStyle}
            />
          }
        />
      )}

      {answerMethodModalOpen && (
        <AnswerMethodModal
          selectedMethod={answerMethod}
          onClose={() => setAnswerMethodModalOpen(false)}
          onSelect={(method) => {
            setAnswerMethod(method);
            setAnswerMethodModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function getNormalizedOperands(params: ArithmeticWidgetParams): {
  operation: "phép cộng" | "phép trừ";
  firstNumber: number;
  secondNumber: number;
} {
  const operation = params.operation;

  if (operation === "phép cộng") {
    return {
      operation,
      firstNumber: clamp(params.addFirstNumber ?? 1, 1, 10),
      secondNumber: clamp(params.addSecondNumber ?? 1, 1, 9),
    };
  }

  return {
    operation,
    firstNumber: clamp(params.numberMax, 1, 10),
    secondNumber: clamp(params.numberMin, 1, 9),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getNumberStyle(value: number): NumberStyle {
  const hue = (value * 37) % 360;
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

function splitDigitsByPlace(value: number): {
  tens: string;
  units: string;
} {
  const abs = Math.abs(value);
  const tens = abs >= 10 ? String(Math.floor(abs / 10)) : "";
  const units = String(abs % 10);
  return { tens, units };
}

function buildChoiceOptions(
  correct: number,
  min: number,
  max: number,
  seed: number,
): number[] {
  const optionSet = new Set<number>();
  optionSet.add(correct);

  const offsets = [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6];
  for (const offset of offsets) {
    if (optionSet.size >= 4) break;
    const candidate = correct + offset;
    if (candidate >= min && candidate <= max) {
      optionSet.add(candidate);
    }
  }

  for (let value = min; value <= max && optionSet.size < 4; value += 1) {
    optionSet.add(value);
  }

  return deterministicShuffle(Array.from(optionSet).slice(0, 4), seed);
}

function deterministicShuffle(values: number[], seed: number): number[] {
  const output = [...values];
  let currentSeed = seed || 1;

  for (let i = output.length - 1; i > 0; i -= 1) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const ratio = currentSeed / 233280;
    const j = Math.floor(ratio * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }

  return output;
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
        "column",
        "read-prompt",
        "read-result",
        "sticks",
        "lego",
        "number-table",
        "number-line",
      ].includes(item),
    );

  return Array.from(new Set(parsed));
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

function AnswerInput({
  value,
  onChange,
  onKeyDown,
  disabled,
  showStepper = false,
  onIncrement,
  onDecrement,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  showStepper?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
}) {
  if (showStepper) {
    return (
      <div className="relative w-full">
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled}
          className="absolute top-1/2 -translate-y-1/2 -left-14 h-12 w-12 rounded-lg border-2 border-orange-200 bg-white text-2xl font-black text-orange-600 hover:bg-orange-50 disabled:opacity-60"
        >
          -
        </button>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          inputMode="numeric"
          placeholder="?"
          className="w-full h-14 rounded-lg border-2 border-orange-200 bg-white text-right px-3 text-4xl font-bold text-slate-700 focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
        />

        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled}
          className="absolute top-1/2 -translate-y-1/2 -right-14 h-12 w-12 rounded-lg border-2 border-orange-200 bg-white text-2xl font-black text-orange-600 hover:bg-orange-50 disabled:opacity-60"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      inputMode="numeric"
      placeholder="?"
      className="w-full h-14 rounded-lg border-2 border-orange-200 bg-white text-right px-3 text-4xl font-bold text-slate-700 focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
    />
  );
}

function VerticalMathBoard({
  firstNumber,
  secondNumber,
  operatorSymbol,
  answerArea,
}: {
  firstNumber: number;
  secondNumber: number;
  operatorSymbol: string;
  answerArea: ReactNode;
}) {
  return (
    <div className="mx-auto w-64 rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
      <div className="font-mono text-5xl leading-tight text-slate-800">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
          <span className="w-8 text-center text-slate-500">&nbsp;</span>
          <span className="text-right">{firstNumber}</span>
          <span className="w-8 text-center text-orange-500">
            {operatorSymbol}
          </span>
          <span className="text-right">{secondNumber}</span>
        </div>

        <div className="h-1 rounded-full bg-slate-700 mt-3 mb-2" />

        <div className="text-base leading-normal">{answerArea}</div>
      </div>
    </div>
  );
}

function ColumnSupportBoard({
  firstNumber,
  secondNumber,
  operatorSymbol,
  tensValue,
  unitValue,
  onTensChange,
  onUnitsChange,
  onKeyDown,
  disabled,
}: {
  firstNumber: number;
  secondNumber: number;
  operatorSymbol: string;
  tensValue: string;
  unitValue: string;
  onTensChange: (value: string) => void;
  onUnitsChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  const firstDigits = splitDigitsByPlace(firstNumber);
  const secondDigits = splitDigitsByPlace(secondNumber);

  const tensStyle = {
    bg: "#dbeafe",
    border: "#60a5fa",
    text: "#1e3a8a",
  };
  const unitsStyle = {
    bg: "#fef3c7",
    border: "#f59e0b",
    text: "#92400e",
  };

  return (
    <div className="mx-auto w-80 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
      <div className="grid grid-cols-[2.5rem_3.2rem_3.2rem] gap-2 font-mono text-5xl justify-center">
        <div className="rounded-lg h-16 flex items-center justify-center text-xl font-bold text-slate-500 bg-slate-100">
          &nbsp;
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: tensStyle.bg,
            color: tensStyle.text,
            borderColor: tensStyle.border,
          }}
        >
          {firstDigits.tens || ""}
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: unitsStyle.bg,
            color: unitsStyle.text,
            borderColor: unitsStyle.border,
          }}
        >
          {firstDigits.units}
        </div>

        <div className="rounded-lg h-16 flex items-center justify-center text-3xl font-bold text-orange-600 bg-orange-100">
          {operatorSymbol}
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: tensStyle.bg,
            color: tensStyle.text,
            borderColor: tensStyle.border,
          }}
        >
          {secondDigits.tens || ""}
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: unitsStyle.bg,
            color: unitsStyle.text,
            borderColor: unitsStyle.border,
          }}
        >
          {secondDigits.units}
        </div>
      </div>

      <div className="h-1 rounded-full bg-slate-700" />

      <div className="mx-auto grid grid-cols-[2.5rem_3.2rem_3.2rem] gap-2 justify-center">
        <div className="h-14" />

        <input
          value={tensValue}
          onChange={(event) => onTensChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          inputMode="numeric"
          placeholder=""
          className="h-14 rounded-lg border-2 text-center text-3xl font-bold focus:outline-none disabled:bg-slate-100"
          style={{
            backgroundColor: tensStyle.bg,
            color: tensStyle.text,
            borderColor: tensStyle.border,
          }}
        />

        <input
          value={unitValue}
          onChange={(event) => onUnitsChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          inputMode="numeric"
          placeholder=""
          className="h-14 rounded-lg border-2 text-center text-3xl font-bold focus:outline-none disabled:bg-slate-100"
          style={{
            backgroundColor: unitsStyle.bg,
            color: unitsStyle.text,
            borderColor: unitsStyle.border,
          }}
        />
      </div>
    </div>
  );
}

function ChoiceAnswerBoard({
  options,
  selectedValue,
  onSelect,
  disabled,
}: {
  options: number[];
  selectedValue: string;
  onSelect: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const isSelected = selectedValue === String(option);

        return (
          <button
            key={`option-${option}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option)}
            className={`rounded-xl border-2 py-4 text-2xl font-black transition-colors ${
              isSelected
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function HorizontalExpression({
  expressionText,
  firstNumber,
  secondNumber,
  operatorSymbol,
  firstStyle,
  secondStyle,
}: {
  expressionText: string;
  firstNumber: number;
  secondNumber: number;
  operatorSymbol: string;
  firstStyle: NumberStyle;
  secondStyle: NumberStyle;
}) {
  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
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
        <span className="text-orange-500">{operatorSymbol}</span>
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

      <p className="text-center text-xs text-slate-500 mt-2">
        {expressionText}
      </p>
    </div>
  );
}

function SticksSupport({
  firstNumber,
  secondNumber,
  expectedResult,
  operation,
  firstStyle,
  secondStyle,
  resultStyle,
}: {
  firstNumber: number;
  secondNumber: number;
  expectedResult: number;
  operation: "phép cộng" | "phép trừ";
  firstStyle: NumberStyle;
  secondStyle: NumberStyle;
  resultStyle: NumberStyle;
}) {
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
      <div className="flex items-start justify-center gap-3 flex-wrap md:flex-nowrap">
        <VisualCounterCard
          value={firstNumber}
          style={firstStyle}
          strike={false}
          renderItem={(key, style) => <StickItem key={key} style={style} />}
        />

        <div className="text-4xl font-black text-sky-700 mt-8 px-1">
          {operation === "phép cộng" ? "+" : "-"}
        </div>

        <VisualCounterCard
          value={secondNumber}
          style={secondStyle}
          strike={false}
          renderItem={(key, style) => <StickItem key={key} style={style} />}
        />
      </div>

      <div className="pt-2 border-t border-sky-200 space-y-2">
        <div
          className="inline-block rounded-xl border p-2"
          style={{ borderColor: resultStyle.border }}
        >
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: expectedResult }).map((_, index) => (
              <StickItem key={`result-stick-${index}`} style={resultStyle} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StickItem({ style }: { style: NumberStyle }) {
  return (
    <svg
      width="16"
      height="60"
      viewBox="0 0 16 60"
      role="img"
      aria-label="que tính"
    >
      <rect x="2" y="2" width="12" height="56" rx="4" fill={style.border} />
      <rect x="4" y="4" width="8" height="52" rx="3" fill={style.bg} />
    </svg>
  );
}

function LegoSupport({
  firstNumber,
  secondNumber,
  expectedResult,
  operation,
  firstStyle,
  secondStyle,
  resultStyle,
}: {
  firstNumber: number;
  secondNumber: number;
  expectedResult: number;
  operation: "phép cộng" | "phép trừ";
  firstStyle: NumberStyle;
  secondStyle: NumberStyle;
  resultStyle: NumberStyle;
}) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3">
      <div className="flex items-start justify-center gap-3 flex-wrap md:flex-nowrap">
        <VisualCounterCard
          value={firstNumber}
          style={firstStyle}
          strike={false}
          renderItem={(key, style) => <LegoItem key={key} style={style} />}
        />

        <div className="text-4xl font-black text-violet-700 mt-8 px-1">
          {operation === "phép cộng" ? "+" : "-"}
        </div>

        <VisualCounterCard
          value={secondNumber}
          style={secondStyle}
          strike={false}
          renderItem={(key, style) => <LegoItem key={key} style={style} />}
        />
      </div>

      <div className="pt-2 border-t border-violet-200 space-y-2">
        <div
          className="inline-block rounded-xl border p-2"
          style={{ borderColor: resultStyle.border }}
        >
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: expectedResult }).map((_, index) => (
              <LegoItem key={`result-lego-${index}`} style={resultStyle} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegoItem({ style }: { style: NumberStyle }) {
  return (
    <svg
      width="30"
      height="24"
      viewBox="0 0 30 24"
      role="img"
      aria-label="khối lego"
    >
      <rect x="2" y="8" width="26" height="14" rx="3" fill={style.border} />
      <circle cx="10" cy="8" r="3" fill={style.border} />
      <circle cx="20" cy="8" r="3" fill={style.border} />
      <rect x="4" y="10" width="22" height="10" rx="2" fill={style.bg} />
    </svg>
  );
}

function VisualCounterCard({
  value,
  style,
  strike,
  renderItem,
}: {
  value: number;
  style: NumberStyle;
  strike: boolean;
  renderItem: (key: string, style: NumberStyle) => ReactNode;
}) {
  return (
    <div
      className="relative rounded-xl border p-2"
      style={{
        borderColor: style.border,
        backgroundColor: "#fff",
        minWidth: 150,
      }}
    >
      <div
        className="inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-full text-2xl font-black mb-2 border"
        style={{
          backgroundColor: style.bg,
          color: style.text,
          borderColor: style.border,
        }}
      >
        {value}
      </div>

      <div className="grid grid-cols-5 gap-1 justify-items-center">
        {Array.from({ length: value }).map((_, index) =>
          renderItem(`visual-item-${value}-${index}`, style),
        )}
      </div>

      {strike && (
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="8"
            y1="8"
            x2="92"
            y2="92"
            stroke="#ef4444"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="92"
            x2="92"
            y2="8"
            stroke="#ef4444"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
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
            id="arrow-head"
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
                markerEnd="url(#arrow-head)"
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

function TypeTwoPreviewContent({
  mode,
  operation,
  expressionText,
  firstNumber,
  secondNumber,
  operatorSymbol,
  expectedResult,
  stepMoves,
  firstStyle,
  secondStyle,
  resultStyle,
}: {
  mode: Type2SupportMode;
  operation: "phép cộng" | "phép trừ";
  expressionText: string;
  firstNumber: number;
  secondNumber: number;
  operatorSymbol: string;
  expectedResult: number;
  stepMoves: StepMove[];
  firstStyle: NumberStyle;
  secondStyle: NumberStyle;
  resultStyle: NumberStyle;
}) {
  const supportBody =
    mode === "sticks" ? (
      <SticksSupport
        firstNumber={firstNumber}
        secondNumber={secondNumber}
        expectedResult={expectedResult}
        operation={operation}
        firstStyle={firstStyle}
        secondStyle={secondStyle}
        resultStyle={resultStyle}
      />
    ) : mode === "lego" ? (
      <LegoSupport
        firstNumber={firstNumber}
        secondNumber={secondNumber}
        expectedResult={expectedResult}
        operation={operation}
        firstStyle={firstStyle}
        secondStyle={secondStyle}
        resultStyle={resultStyle}
      />
    ) : mode === "number-table" ? (
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
    );

  return (
    <div className="space-y-3">
      <HorizontalExpression
        expressionText={expressionText}
        firstNumber={firstNumber}
        secondNumber={secondNumber}
        operatorSymbol={operatorSymbol}
        firstStyle={firstStyle}
        secondStyle={secondStyle}
      />

      {supportBody}
    </div>
  );
}

function SupportModal({
  step,
  pendingType2Support,
  onClose,
  onReadPrompt,
  onSelectTypeOne,
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
  onSelectTypeOne: () => void;
  onSelectTypeTwo: () => void;
  onReadResult: () => void;
  onBack: () => void;
  onPreviewTypeTwo: (mode: Type2SupportMode) => void;
  previewContent: ReactNode;
}) {
  const previewLabelMap: Record<Type2SupportMode, string> = {
    sticks: "que tính",
    lego: "lego",
    "number-table": "bảng số",
    "number-line": "tia số",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            <Speak>Chọn chế độ hỗ trợ</Speak>
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
              title="Hỗ trợ đặt tính theo hàng"
              colorClass="border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={onSelectTypeOne}
              illustration={<SupportIllustration kind="column" />}
            />

            <SupportOptionCard
              title="Hỗ trợ bằng tia số hoặc bảng tính"
              colorClass="border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
              onClick={onSelectTypeTwo}
              illustration={<SupportIllustration kind="number-line" />}
            />

            <SupportOptionCard
              title="Hỗ trợ đọc kết quả"
              colorClass="border-rose-200 bg-rose-50 hover:bg-rose-100"
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
                title="Hỗ trợ que tính"
                colorClass="border-sky-200 bg-sky-50 hover:bg-sky-100"
                onClick={() => onPreviewTypeTwo("sticks")}
                illustration={<SupportIllustration kind="sticks" />}
              />

              <SupportOptionCard
                title="Hỗ trợ lego"
                colorClass="border-violet-200 bg-violet-50 hover:bg-violet-100"
                onClick={() => onPreviewTypeTwo("lego")}
                illustration={<SupportIllustration kind="lego" />}
              />

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

function SupportIllustration({
  kind,
}: {
  kind:
    | "column"
    | "sticks"
    | "lego"
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

  if (kind === "column") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <rect x="4" y="6" width="20" height="16" rx="3" fill="#dbeafe" />
        <rect x="26" y="6" width="20" height="16" rx="3" fill="#fef3c7" />
        <rect x="4" y="24" width="20" height="16" rx="3" fill="#dbeafe" />
        <rect x="26" y="24" width="20" height="16" rx="3" fill="#fef3c7" />
        <rect x="50" y="6" width="18" height="34" rx="4" fill="#bbf7d0" />
      </svg>
    );
  }

  if (kind === "sticks") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`s-${i}`}
            x={8 + i * 8}
            y="6"
            width="5"
            height="34"
            rx="2"
            fill="#38bdf8"
          />
        ))}
        {[0, 1, 2].map((i) => (
          <rect
            key={`s2-${i}`}
            x={44 + i * 8}
            y="6"
            width="5"
            height="34"
            rx="2"
            fill="#a78bfa"
          />
        ))}
      </svg>
    );
  }

  if (kind === "lego") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <rect x="8" y="18" width="24" height="16" rx="3" fill="#60a5fa" />
        <circle cx="16" cy="18" r="3" fill="#60a5fa" />
        <circle cx="24" cy="18" r="3" fill="#60a5fa" />
        <rect x="40" y="12" width="24" height="22" rx="3" fill="#f472b6" />
        <circle cx="48" cy="12" r="3" fill="#f472b6" />
        <circle cx="56" cy="12" r="3" fill="#f472b6" />
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

function AnswerMethodModal({
  selectedMethod,
  onClose,
  onSelect,
}: {
  selectedMethod: AnswerMethod;
  onClose: () => void;
  onSelect: (method: AnswerMethod) => void;
}) {
  const methodOptions: Array<{
    method: AnswerMethod;
    title: string;
    icon: string;
  }> = [
    { method: "voice", title: "Thu âm để điền", icon: "🎤" },
    { method: "input", title: "Điền bằng ô nhập", icon: "⌨️" },
    { method: "choice", title: "Chọn 1 trong 4 đáp án", icon: "🔘" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            <Speak>Chọn phương thức điền đáp án</Speak>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        <div className="space-y-2">
          {methodOptions.map((option) => {
            const isActive = option.method === selectedMethod;

            return (
              <button
                key={option.method}
                type="button"
                onClick={() => onSelect(option.method)}
                className={`w-full rounded-xl border-2 px-4 py-3 flex items-center justify-between text-left ${
                  isActive
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold text-slate-800">
                  <Speak>{option.title}</Speak>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  {option.icon}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Feedback({
  result,
  isLocked,
  correctText,
  incorrectText,
  expectedResult,
  usedSupports,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  correctText: string;
  incorrectText: string;
  expectedResult: number;
  usedSupports: string[];
}) {
  if (!result || !isLocked) return null;

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
          ? correctText
          : `${incorrectText} Đáp án đúng là ${expectedResult}.`}
      </p>

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
