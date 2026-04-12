import "../index.css";

import {
  Speak,
  VoiceNumberInput,
  WidgetRuntime,
  useSubmission,
  useWidgetParams,
} from "@moly-edu/widget-sdk";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type {
  CountingWidgetAnswer,
  CountingWidgetParams,
} from "../definition_counting";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type AnswerMethod = "voice" | "input" | "choice";
type UsedSupport = "read-answer";

const MODE_IMAGE_COUNT = "Hiển thị số lượng ảnh";
const MODE_NUMBER_TOKEN = "Hiển thị 1 ảnh có số";
const MODE_SPELLING = "Hiển thị chữ xong đánh vần";
const MODE_TWO_DIGIT = "Đếm số có 2 chữ số (phạm vi 100)";

export function WidgetComponentCounting() {
  const params = useWidgetParams<CountingWidgetParams>();
  const mode = params.mode;

  const objectCount = clamp(params.objectCount ?? 1, 1, 10);
  const numberToken = clamp(
    Number.parseInt(params.numberToken ?? "1", 10),
    1,
    9,
  );
  const spellingNumber = clamp(
    Number.parseInt(params.spellingNumber ?? "1", 10),
    1,
    9,
  );
  const twoDigitNumber = clamp(params.twoDigitNumber ?? 10, 10, 99);

  const correctAnswer =
    mode === MODE_SPELLING
      ? spellingNumber
      : mode === MODE_TWO_DIGIT
        ? twoDigitNumber
        : objectCount;
  const questionTitle = buildQuestionTitle(mode, numberToken);

  const [answerMethod, setAnswerMethod] = useState<AnswerMethod>("input");
  const [answerMethodModalOpen, setAnswerMethodModalOpen] = useState(false);
  const [usedSupports, setUsedSupports] = useState<UsedSupport[]>([]);

  const range =
    mode === MODE_SPELLING
      ? { min: 1, max: 9 }
      : mode === MODE_TWO_DIGIT
        ? { min: 10, max: 99 }
        : { min: 1, max: 10 };

  const choiceOptions = useMemo(
    () =>
      buildChoiceOptions(
        correctAnswer,
        range.min,
        range.max,
        objectCount * 1000 +
          numberToken * 100 +
          spellingNumber * 10 +
          twoDigitNumber,
      ),
    [
      correctAnswer,
      objectCount,
      numberToken,
      range.max,
      range.min,
      spellingNumber,
      twoDigitNumber,
    ],
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
      const selected = Number.parseInt(ans.value ?? "", 10);
      const isCorrect = Number.isFinite(selected) && selected === correctAnswer;

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  useEffect(() => {
    const parsed = parseUsedSupports(answer?.usedSupports ?? "");
    if (parsed.length === 0) return;

    setUsedSupports((prev) => {
      const next = Array.from(new Set<UsedSupport>([...prev, ...parsed]));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [answer?.usedSupports]);

  const writeAnswer = (value: string, supports = usedSupports) => {
    setAnswer({
      value,
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

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canSubmit) {
      submit();
    }
  };

  const adjustAnswerBy = (delta: number) => {
    const current = Number.parseInt(answer?.value ?? "", 10);
    const base = Number.isFinite(current) ? current : range.min;
    const next = clamp(base + delta, range.min, range.max);
    writeAnswer(String(next));
  };

  const selectedValue = Number(answer?.value ?? "NaN");
  const usedSupportLabels = usedSupports.map((support) =>
    support === "read-answer" ? "Đọc đáp án" : support,
  );

  const handleReadAnswerSupport = () => {
    markSupportUsed("read-answer");
    speakVietnamese(
      buildReadAnswerSpeech(mode, {
        objectCount,
        numberToken,
        spellingNumber,
        twoDigitNumber,
      }),
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-teal-50 via-cyan-50 to-sky-50">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold mb-2">
                {mode === MODE_TWO_DIGIT
                  ? "Đếm số trong phạm vi 100"
                  : "Đếm số trong phạm vi 10"}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">
                <Speak>{questionTitle}</Speak>
              </h2>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <button
                type="button"
                onClick={handleReadAnswerSupport}
                className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-teal-700 text-sm font-semibold hover:bg-teal-100"
              >
                <span aria-hidden="true" className="mr-1">
                  🛟
                </span>
                Hỗ trợ đọc đáp án
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
            </div>
          </div>

          <DisplayBoard compact={mode !== MODE_TWO_DIGIT}>
            {mode === MODE_IMAGE_COUNT ? (
              <ImageCountPanel
                imageUrl={params.imageUrl ?? "https://picsum.photos/536/354"}
                count={objectCount}
              />
            ) : mode === MODE_NUMBER_TOKEN ? (
              <NumberTokenPanel token={numberToken} count={objectCount} />
            ) : mode === MODE_TWO_DIGIT ? (
              <TwoDigitCubePanel value={twoDigitNumber} />
            ) : (
              <SpellingPanel value={spellingNumber} />
            )}
          </DisplayBoard>

          <div className="mt-5">
            {answerMethod === "voice" ? (
              <div className="w-28 mx-auto">
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
                  className="mx-auto w-28 h-14 rounded-lg border-2 border-cyan-200 text-center px-2 text-3xl font-bold text-slate-700 bg-white focus:outline-none focus:border-cyan-400 disabled:bg-slate-100"
                />
              </div>
            ) : answerMethod === "input" ? (
              <AnswerInput
                value={answer?.value ?? ""}
                onChange={onAnswerChange}
                onKeyDown={onKeyDown}
                disabled={isLocked}
                onIncrement={() => adjustAnswerBy(1)}
                onDecrement={() => adjustAnswerBy(-1)}
              />
            ) : (
              <ChoiceAnswerBoard
                options={choiceOptions}
                selectedValue={selectedValue}
                onSelect={(value) => writeAnswer(String(value))}
                disabled={isLocked}
              />
            )}
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-6 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            expectedAnswer={correctAnswer}
            usedSupports={usedSupportLabels}
          />
        </div>
      </div>

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

function DisplayBoard({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 border-cyan-100 bg-cyan-50/60 p-4 flex items-center justify-center ${
        compact
          ? "min-h-56 w-full max-w-90 md:w-1/2 md:max-w-none mx-auto"
          : "min-h-80 w-full"
      }`}
    >
      {children}
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
    <div className="grid grid-cols-3 gap-3 place-items-center justify-items-center">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`img-${index}`}
          className="h-20 w-20 rounded-xl border border-cyan-200 bg-white shadow-sm overflow-hidden"
        >
          <img
            src={imageUrl}
            alt={`hinh-${index + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

function NumberTokenPanel({ token, count }: { token: number; count: number }) {
  const placements = useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        rotate: ((index % 3) - 1) * 5,
        delay: `${index * 65}ms`,
      })),
    [count],
  );

  return (
    <>
      <style>{`
        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.88);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div className="grid grid-cols-3 gap-3 place-items-center justify-items-center">
        {placements.map((item, index) => (
          <div
            key={`token-${index}`}
            className="h-16 w-16 rounded-xl border-2 border-indigo-200 bg-linear-to-br from-indigo-100 to-cyan-100 shadow-sm flex items-center justify-center"
            style={{
              transform: `rotate(${item.rotate}deg)`,
              animation: "pop-in 420ms ease forwards",
              animationDelay: item.delay,
              opacity: 0,
            }}
          >
            <span className="text-3xl font-black text-indigo-700">{token}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function TwoDigitCubePanel({ value }: { value: number }) {
  const tens = Math.floor(value / 10);
  const units = value % 10;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-center gap-6">
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: tens }).map((_, stackIndex) => (
            <TensStack key={`tens-stack-${stackIndex}`} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center max-w-72">
          {Array.from({ length: units }).map((_, index) => (
            <UnitCube key={`unit-cube-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TensStack() {
  return (
    <div className="relative h-32 w-8">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`tens-cube-${index}`}
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: `${index * 10}px`, zIndex: 30 - index }}
        >
          <CubeIcon size={16} />
        </div>
      ))}
    </div>
  );
}

function UnitCube() {
  return <CubeIcon size={28} />;
}

function CubeIcon({ size }: { size: number }) {
  const w = size;
  const h = Math.round(size * 0.72);
  const topHeight = Math.round(size * 0.24);
  const sideWidth = Math.round(size * 0.22);

  return (
    <svg
      width={w}
      height={h + topHeight}
      viewBox={`0 0 ${w} ${h + topHeight}`}
      aria-hidden="true"
    >
      <polygon
        points={`0,${topHeight} ${w - sideWidth},${topHeight} ${w},0 ${sideWidth},0`}
        fill="#d9f99d"
        stroke="#14b8a6"
        strokeWidth="1"
      />
      <polygon
        points={`0,${topHeight} 0,${h + topHeight} ${w - sideWidth},${h + topHeight} ${w - sideWidth},${topHeight}`}
        fill="#a3e635"
        stroke="#14b8a6"
        strokeWidth="1"
      />
      <polygon
        points={`${w - sideWidth},${topHeight} ${w},0 ${w},${h} ${w - sideWidth},${h + topHeight}`}
        fill="#4ade80"
        stroke="#14b8a6"
        strokeWidth="1"
      />
    </svg>
  );
}

function SpellingPanel({ value }: { value: number }) {
  const word = numberToVietnamese(value);

  return (
    <p className="text-4xl md:text-5xl font-black text-emerald-900 tracking-wide">
      {word}
    </p>
  );
}

function AnswerInput({
  value,
  onChange,
  onKeyDown,
  disabled,
  onIncrement,
  onDecrement,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="relative mx-auto w-28">
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        className="absolute top-1/2 -translate-y-1/2 -left-10 h-9 w-9 rounded-lg border-2 border-cyan-200 bg-white text-xl font-black text-cyan-600 hover:bg-cyan-50 disabled:opacity-60"
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
        className="w-28 h-14 rounded-lg border-2 border-cyan-200 bg-white text-center px-2 text-3xl font-bold text-slate-700 focus:outline-none focus:border-cyan-400 disabled:bg-slate-100"
      />

      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        className="absolute top-1/2 -translate-y-1/2 -right-10 h-9 w-9 rounded-lg border-2 border-cyan-200 bg-white text-xl font-black text-cyan-600 hover:bg-cyan-50 disabled:opacity-60"
      >
        +
      </button>
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
  selectedValue: number;
  onSelect: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const isSelected = selectedValue === option;

        return (
          <button
            key={`option-${option}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option)}
            className={`rounded-xl border-2 py-4 text-2xl font-black transition-colors ${
              isSelected
                ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Feedback({
  result,
  isLocked,
  expectedAnswer,
  usedSupports,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  expectedAnswer: number;
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
      <div className="text-2xl mb-1">{result.isCorrect ? "🎉" : "💡"}</div>
      <p
        className={`font-semibold ${
          result.isCorrect ? "text-green-700" : "text-red-700"
        }`}
      >
        {result.isCorrect
          ? "Chính xác rồi!"
          : `Chưa đúng. Đáp án là ${expectedAnswer}.`}
      </p>

      {usedSupports.length > 0 && (
        <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-left">
          <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide">
            Hỗ trợ đã dùng
          </p>
          <ul className="mt-1 text-sm text-cyan-800 list-disc pl-5">
            {usedSupports.map((item) => (
              <li key={`used-support-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
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

function buildQuestionTitle(
  mode: CountingWidgetParams["mode"],
  token: number,
): string {
  if (mode === MODE_IMAGE_COUNT) return "Có bao nhiêu hình";
  if (mode === MODE_NUMBER_TOKEN) return `Có bao nhiêu số ${token} trong đây`;
  if (mode === MODE_TWO_DIGIT) return "Số được mô phỏng là số bao nhiêu";
  return "Chữ dưới đây là số mấy";
}

function buildReadAnswerSpeech(
  mode: CountingWidgetParams["mode"],
  values: {
    objectCount: number;
    numberToken: number;
    spellingNumber: number;
    twoDigitNumber: number;
  },
): string {
  if (mode === MODE_IMAGE_COUNT) {
    return `Có ${numberToVietnamese(values.objectCount)} hình.`;
  }

  if (mode === MODE_NUMBER_TOKEN) {
    return `Có ${numberToVietnamese(values.objectCount)} số ${values.numberToken}.`;
  }

  if (mode === MODE_TWO_DIGIT) {
    return `Số được mô phỏng là số ${values.twoDigitNumber}.`;
  }

  return `Chữ dưới đây là số ${values.spellingNumber}.`;
}

function speakVietnamese(text: string) {
  void WidgetRuntime.requestTtsSpeak({
    text,
    lang: "vi-VN",
    rate: 0.95,
    timeoutMs: 25000,
  }).catch(() => undefined);
}

function serializeUsedSupports(items: UsedSupport[]): string {
  return Array.from(new Set(items)).join("|");
}

function parseUsedSupports(raw: string): UsedSupport[] {
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split("|")
        .map((item) => item.trim())
        .filter((item): item is UsedSupport => item === "read-answer"),
    ),
  );
}

function buildChoiceOptions(
  correctValue: number,
  min: number,
  max: number,
  seed: number,
): number[] {
  const options = new Set<number>([correctValue]);

  const offsets = [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5];
  for (const offset of offsets) {
    if (options.size >= 4) break;
    const candidate = correctValue + offset;
    if (candidate >= min && candidate <= max) {
      options.add(candidate);
    }
  }

  for (let value = min; value <= max && options.size < 4; value += 1) {
    options.add(value);
  }

  return deterministicShuffle(Array.from(options).slice(0, 4), seed);
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
  };

  return words[value] ?? String(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
