import "../index.css";

import {
  useWidgetParams,
  useSubmission,
  Speak,
  VoiceNumberInput,
} from "@moly-edu/widget-sdk";
import type { WidgetParams, WidgetAnswer } from "../definition";
import { useMemo, type CSSProperties, type KeyboardEvent } from "react";

export function WidgetComponent() {
  const params = useWidgetParams<WidgetParams>();

  const digitRange = useMemo(
    () => normalizeDigitRange(params.boardNumberMin, params.boardNumberMax),
    [params.boardNumberMax, params.boardNumberMin],
  );

  const questionText = getQuestionText(params);

  const findOneData = useMemo(
    () =>
      buildFindOneData({
        targetNumber: params.targetNumber,
        distractorCount: params.findOneSettings.distractorCount,
        range: digitRange,
        shuffleOptions: params.findOneSettings.shuffleOptions,
      }),
    [
      digitRange,
      params.findOneSettings.distractorCount,
      params.findOneSettings.shuffleOptions,
      params.targetNumber,
    ],
  );

  const selectAllData = useMemo(
    () =>
      buildSelectAllData({
        targetNumber: params.targetNumber,
        totalDigits: params.selectAllSettings.totalDigits,
        minTargetCount: params.selectAllSettings.minTargetCount,
        maxTargetCount: params.selectAllSettings.maxTargetCount,
        range: digitRange,
      }),
    [
      digitRange,
      params.selectAllSettings.maxTargetCount,
      params.selectAllSettings.minTargetCount,
      params.selectAllSettings.totalDigits,
      params.targetNumber,
    ],
  );

  const countData = useMemo(
    () =>
      buildCountData({
        targetNumber: params.targetNumber,
        totalDigits: params.countSettings.totalDigits,
        minTargetCount: params.countSettings.minTargetCount,
        maxTargetCount: params.countSettings.maxTargetCount,
        range: digitRange,
      }),
    [
      digitRange,
      params.countSettings.maxTargetCount,
      params.countSettings.minTargetCount,
      params.countSettings.totalDigits,
      params.targetNumber,
    ],
  );

  const judgeData = useMemo(
    () =>
      buildJudgeData({
        targetNumber: params.targetNumber,
        totalDigits: params.judgeSettings.totalDigits,
        minTargetCount: params.judgeSettings.minTargetCount,
        maxTargetCount: params.judgeSettings.maxTargetCount,
        maxOffset: params.judgeSettings.maxOffset,
        range: digitRange,
      }),
    [
      digitRange,
      params.judgeSettings.maxOffset,
      params.judgeSettings.maxTargetCount,
      params.judgeSettings.minTargetCount,
      params.judgeSettings.totalDigits,
      params.targetNumber,
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
  } = useSubmission<WidgetAnswer>({
    evaluate: (ans) => {
      const rawValue = ans.value?.trim() ?? "";

      let isCorrect = false;

      if (params.mode === "find-one") {
        isCorrect = Number.parseInt(rawValue, 10) === params.targetNumber;
      }

      if (params.mode === "select-all-ones") {
        const selectedIndices = parseSelectedIndices(rawValue);
        isCorrect = areSetsEqual(selectedIndices, selectAllData.targetIndices);
      }

      if (params.mode === "count-ones") {
        isCorrect = Number.parseInt(rawValue, 10) === countData.targetCount;
      }

      if (params.mode === "judge-count") {
        const userChoice = rawValue === "true";
        isCorrect = userChoice === judgeData.claimIsTrue;
      }

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  if (params.mode === "find-one") {
    const selected = answer?.value ? Number.parseInt(answer.value, 10) : null;

    return (
      <FindOneMode
        params={params}
        questionText={questionText}
        options={findOneData.options}
        selected={selected}
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

  if (params.mode === "select-all-ones") {
    const selectedIndices = parseSelectedIndices(answer?.value ?? "");

    return (
      <SelectAllMode
        params={params}
        questionText={questionText}
        items={selectAllData.items}
        selectedIndices={selectedIndices}
        targetCount={selectAllData.targetIndices.size}
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

  if (params.mode === "count-ones") {
    return (
      <CountMode
        params={params}
        questionText={questionText}
        items={countData.items}
        targetCount={countData.targetCount}
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
    <JudgeMode
      params={params}
      questionText={questionText}
      items={judgeData.items}
      targetCount={judgeData.targetCount}
      claimedCount={judgeData.claimedCount}
      claimIsTrue={judgeData.claimIsTrue}
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

type SubmitResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

interface ModeProps {
  params: WidgetParams;
  questionText: string;
  answer: WidgetAnswer | undefined;
  setAnswer: (a: WidgetAnswer) => void;
  result: SubmitResult;
  submit: () => Promise<void>;
  isLocked: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
}

interface ScatterItem {
  id: string;
  value: number;
  style: CSSProperties;
  toneClass: string;
}

interface FindOneProps extends ModeProps {
  options: number[];
  selected: number | null;
}

function FindOneMode({
  params,
  questionText,
  options,
  selected,
  answer,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: FindOneProps) {
  const correctDetail = `Đáp án đúng là số ${params.targetNumber}.`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-sky-50 via-cyan-50 to-emerald-50">
      <div className="w-full max-w-md">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium mb-3">
              🔎 Dạng 1: Đâu là số mục tiêu?
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {options.map((value, index) => {
              const isSelected = selected === value && answer?.value !== "";
              return (
                <button
                  key={`${value}-${index}`}
                  onClick={() => {
                    if (isLocked) return;
                    setAnswer({ value: String(value) });
                  }}
                  disabled={isLocked}
                  className={`
                    py-4 rounded-xl text-3xl font-bold transition-all border-2
                    ${
                      isSelected
                        ? "bg-cyan-500 text-white border-cyan-600 scale-105 shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50"
                    }
                    ${isLocked ? "cursor-default" : "cursor-pointer"}
                  `}
                >
                  {value}
                </button>
              );
            })}
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed 
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
            correctDetail={correctDetail}
          />
        </div>
      </div>
    </div>
  );
}

interface SelectAllProps extends ModeProps {
  items: ScatterItem[];
  selectedIndices: Set<number>;
  targetCount: number;
}

function SelectAllMode({
  params,
  questionText,
  items,
  selectedIndices,
  targetCount,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: SelectAllProps) {
  const correctDetail = `Có ${targetCount} số ${params.targetNumber} trong bảng.`;

  const handleToggle = (index: number) => {
    if (isLocked) return;

    const nextSelection = new Set(selectedIndices);
    if (nextSelection.has(index)) {
      nextSelection.delete(index);
    } else {
      nextSelection.add(index);
    }

    setAnswer({ value: encodeSelectedIndices(nextSelection) });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-indigo-50 via-blue-50 to-cyan-50">
      <div className="w-full max-w-md">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium mb-3">
              🧩 Dạng 2: Chọn tất cả số mục tiêu
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <div className="mb-3 text-xs text-slate-500 text-center">
            Đã chọn {selectedIndices.size} ô
          </div>

          <ScatterBoard
            items={items}
            selectable
            selectedIndices={selectedIndices}
            onToggle={handleToggle}
            disabled={isLocked}
          />

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed 
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
            correctDetail={correctDetail}
          />
        </div>
      </div>
    </div>
  );
}

interface CountModeProps extends ModeProps {
  items: ScatterItem[];
  targetCount: number;
}

function CountMode({
  params,
  questionText,
  items,
  targetCount,
  answer,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: CountModeProps) {
  const correctDetail = `Có ${targetCount} số ${params.targetNumber} trong bảng.`;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canSubmit) {
      submit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-amber-50 via-orange-50 to-rose-50">
      <div className="w-full max-w-md">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-3">
              🧮 Dạng 3: Đếm số lượng
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <ScatterBoard items={items} />

          <div className="mt-4">
            <VoiceNumberInput
              value={answer?.value ?? ""}
              onValueChange={(cleaned) => {
                if (isLocked) return;
                setAnswer({ value: cleaned });
              }}
              onKeyDown={onKeyDown}
              disabled={isLocked}
              lang="vi-VN"
              timeoutMs={10000}
              showMic="auto"
              micButtonLabel="Trả lời bằng giọng nói"
              stopButtonLabel="Dừng nghe"
              placeholder={
                params.countSettings.showPlaceholder
                  ? params.countSettings.placeholder
                  : undefined
              }
              className="w-full text-center text-3xl font-bold py-4 px-6 border-2 border-slate-200 rounded-xl 
                focus:border-amber-400 focus:outline-none transition-colors
                disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

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

          <Feedback
            result={result}
            isLocked={isLocked}
            params={params}
            correctDetail={correctDetail}
          />
        </div>
      </div>
    </div>
  );
}

interface JudgeModeProps extends ModeProps {
  items: ScatterItem[];
  targetCount: number;
  claimedCount: number;
  claimIsTrue: boolean;
}

function JudgeMode({
  params,
  questionText,
  items,
  targetCount,
  claimedCount,
  claimIsTrue,
  answer,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: JudgeModeProps) {
  const selected = answer?.value ?? "";
  const correctLabel = claimIsTrue ? "Đúng" : "Sai";
  const correctDetail = `Thực tế có ${targetCount} số ${params.targetNumber}. Đáp án đúng là: ${correctLabel}.`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-fuchsia-50 via-pink-50 to-rose-50">
      <div className="w-full max-w-md">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium mb-3">
              ⚖️ Dạng 4: Đúng hay Sai? (Sáng tạo thêm)
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              <Speak>{questionText}</Speak>
            </h2>
          </div>

          <ScatterBoard items={items} />

          <div className="mt-4 p-3 rounded-xl bg-pink-50 border border-pink-100 text-center text-pink-800 font-semibold">
            <Speak>
              Mệnh đề: Trong bảng có {claimedCount} số {params.targetNumber}.
            </Speak>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => {
                if (isLocked) return;
                setAnswer({ value: "true" });
              }}
              disabled={isLocked}
              className={`py-3 rounded-xl font-bold border-2 transition-all ${
                selected === "true"
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
              } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
            >
              Đúng
            </button>

            <button
              onClick={() => {
                if (isLocked) return;
                setAnswer({ value: "false" });
              }}
              disabled={isLocked}
              className={`py-3 rounded-xl font-bold border-2 transition-all ${
                selected === "false"
                  ? "bg-rose-500 text-white border-rose-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-rose-300"
              } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
            >
              Sai
            </button>
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-4 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-300 disabled:cursor-not-allowed 
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
          />
        </div>
      </div>
    </div>
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
}: {
  result: { isCorrect: boolean } | null;
  isLocked: boolean;
  params: WidgetParams;
  correctDetail: string;
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
    </div>
  );
}

function ScatterBoard({
  items,
  selectable,
  selectedIndices,
  onToggle,
  disabled,
}: {
  items: ScatterItem[];
  selectable?: boolean;
  selectedIndices?: Set<number>;
  onToggle?: (index: number) => void;
  disabled?: boolean;
}) {
  const columnCount = Math.min(
    6,
    Math.max(3, Math.ceil(Math.sqrt(items.length))),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item, index) => {
          const isSelected = selectedIndices?.has(index) ?? false;

          if (selectable && onToggle) {
            return (
              <button
                key={item.id}
                onClick={() => onToggle(index)}
                disabled={disabled}
                style={item.style}
                className={`h-14 rounded-xl border-2 text-2xl font-black transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-500 text-white scale-105 shadow"
                    : `${item.toneClass} border-white/60`
                } ${disabled ? "cursor-default" : "cursor-pointer"}`}
              >
                {item.value}
              </button>
            );
          }

          return (
            <div
              key={item.id}
              style={item.style}
              className={`h-14 rounded-xl border border-white/60 flex items-center justify-center text-2xl font-black ${item.toneClass}`}
            >
              {item.value}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getQuestionText(params: WidgetParams): string {
  const customPrompt = params.customPrompt.trim();
  if (customPrompt) return customPrompt;

  if (params.mode === "find-one") {
    return `Đâu là số ${params.targetNumber}?`;
  }

  if (params.mode === "select-all-ones") {
    return `Chọn tất cả số ${params.targetNumber} trong các số dưới đây.`;
  }

  if (params.mode === "count-ones") {
    return `Trong đây có mấy số ${params.targetNumber}?`;
  }

  return `Mệnh đề dưới đây đúng hay sai với số ${params.targetNumber}?`;
}

function buildFindOneData({
  targetNumber,
  distractorCount,
  range,
  shuffleOptions,
}: {
  targetNumber: number;
  distractorCount: number;
  range: DigitRange;
  shuffleOptions: boolean;
}) {
  const pool = getDistractorPool(targetNumber, range);
  const totalDistractors = clamp(distractorCount, 1, 8);
  const distractors: number[] = [];

  while (distractors.length < totalDistractors) {
    const candidate = pool[randomInt(0, pool.length - 1)];
    distractors.push(candidate);
  }

  const options = [targetNumber, ...distractors];
  return {
    options: shuffleOptions ? shuffleList(options) : options,
  };
}

function buildSelectAllData({
  targetNumber,
  totalDigits,
  minTargetCount,
  maxTargetCount,
  range,
}: {
  targetNumber: number;
  totalDigits: number;
  minTargetCount: number;
  maxTargetCount: number;
  range: DigitRange;
}) {
  const normalized = normalizeBoardConfig(
    totalDigits,
    minTargetCount,
    maxTargetCount,
  );
  const digits = buildMixedBoard(
    normalized.totalDigits,
    normalized.targetCount,
    targetNumber,
    range,
  );
  const items = toScatterItems(digits);
  const targetIndices = new Set<number>();

  digits.forEach((value, index) => {
    if (value === targetNumber) {
      targetIndices.add(index);
    }
  });

  return { items, targetIndices };
}

function buildCountData({
  targetNumber,
  totalDigits,
  minTargetCount,
  maxTargetCount,
  range,
}: {
  targetNumber: number;
  totalDigits: number;
  minTargetCount: number;
  maxTargetCount: number;
  range: DigitRange;
}) {
  const normalized = normalizeBoardConfig(
    totalDigits,
    minTargetCount,
    maxTargetCount,
  );
  const digits = buildMixedBoard(
    normalized.totalDigits,
    normalized.targetCount,
    targetNumber,
    range,
  );

  return {
    items: toScatterItems(digits),
    targetCount: normalized.targetCount,
  };
}

function buildJudgeData({
  targetNumber,
  totalDigits,
  minTargetCount,
  maxTargetCount,
  maxOffset,
  range,
}: {
  targetNumber: number;
  totalDigits: number;
  minTargetCount: number;
  maxTargetCount: number;
  maxOffset: number;
  range: DigitRange;
}) {
  const normalized = normalizeBoardConfig(
    totalDigits,
    minTargetCount,
    maxTargetCount,
  );
  const digits = buildMixedBoard(
    normalized.totalDigits,
    normalized.targetCount,
    targetNumber,
    range,
  );

  const claimIsTrue = Math.random() < 0.5;
  const claimedCount = claimIsTrue
    ? normalized.targetCount
    : makeIncorrectClaim(
        normalized.targetCount,
        normalized.totalDigits,
        clamp(maxOffset, 1, 4),
      );

  return {
    items: toScatterItems(digits),
    targetCount: normalized.targetCount,
    claimedCount,
    claimIsTrue,
  };
}

function makeIncorrectClaim(
  actual: number,
  totalDigits: number,
  maxOffset: number,
): number {
  const candidates: number[] = [];

  for (let offset = 1; offset <= maxOffset; offset++) {
    const up = actual + offset;
    const down = actual - offset;

    if (up >= 0 && up <= totalDigits) {
      candidates.push(up);
    }

    if (down >= 0 && down <= totalDigits) {
      candidates.push(down);
    }
  }

  const unique = Array.from(
    new Set(candidates.filter((value) => value !== actual)),
  );
  if (unique.length === 0) {
    return actual === 0 ? 1 : actual - 1;
  }

  return unique[randomInt(0, unique.length - 1)];
}

function toScatterItems(digits: number[]): ScatterItem[] {
  const toneClasses = [
    "bg-rose-100 text-rose-700",
    "bg-orange-100 text-orange-700",
    "bg-amber-100 text-amber-700",
    "bg-lime-100 text-lime-700",
    "bg-cyan-100 text-cyan-700",
    "bg-violet-100 text-violet-700",
  ] as const;

  return digits.map((value, index) => {
    const shiftX = randomInt(-8, 8);
    const shiftY = randomInt(-8, 8);
    const rotate = randomInt(-18, 18);
    const scale = 0.92 + randomInt(0, 20) / 100;

    return {
      id: `token-${index}-${value}`,
      value,
      style: {
        transform: `translate(${shiftX}px, ${shiftY}px) rotate(${rotate}deg) scale(${scale})`,
      },
      toneClass: toneClasses[randomInt(0, toneClasses.length - 1)],
    };
  });
}

function parseSelectedIndices(value: string): Set<number> {
  if (!value) return new Set<number>();

  return new Set(
    value
      .split(",")
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isFinite(item) && item >= 0),
  );
}

function encodeSelectedIndices(indices: Set<number>): string {
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

function buildMixedBoard(
  totalDigits: number,
  targetCount: number,
  targetNumber: number,
  range: DigitRange,
): number[] {
  const digits: number[] = [];
  while (digits.length < targetCount) {
    digits.push(targetNumber);
  }

  while (digits.length < totalDigits) {
    digits.push(pickRandomDifferentDigit(targetNumber, range));
  }

  return shuffleList(digits);
}

function normalizeBoardConfig(
  totalDigits: number,
  minTargetCount: number,
  maxTargetCount: number,
) {
  const normalizedTotal = clamp(totalDigits, 6, 30);
  const normalizedMin = clamp(
    Math.min(minTargetCount, maxTargetCount),
    1,
    normalizedTotal,
  );
  const normalizedMax = clamp(
    Math.max(minTargetCount, maxTargetCount),
    normalizedMin,
    normalizedTotal,
  );

  return {
    totalDigits: normalizedTotal,
    targetCount: randomInt(normalizedMin, normalizedMax),
  };
}

function getDistractorPool(targetNumber: number, range: DigitRange): number[] {
  const inRange: number[] = [];
  for (let value = range.min; value <= range.max; value++) {
    if (value !== targetNumber) {
      inRange.push(value);
    }
  }

  if (inRange.length > 0) {
    return inRange;
  }

  const fallback: number[] = [];
  for (let value = 1; value <= 9; value++) {
    if (value !== targetNumber) {
      fallback.push(value);
    }
  }

  return fallback;
}

function pickRandomDifferentDigit(
  targetNumber: number,
  range: DigitRange,
): number {
  const pool = getDistractorPool(targetNumber, range);
  return pool[randomInt(0, pool.length - 1)];
}

function normalizeDigitRange(min: number, max: number): DigitRange {
  return {
    min: clamp(Math.min(min, max), 1, 9),
    max: clamp(Math.max(min, max), 1, 9),
  };
}

function shuffleList<T>(items: T[]): T[] {
  const copied = [...items];
  for (let index = copied.length - 1; index > 0; index--) {
    const randomIndex = randomInt(0, index);
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }
  return copied;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface DigitRange {
  min: number;
  max: number;
}
