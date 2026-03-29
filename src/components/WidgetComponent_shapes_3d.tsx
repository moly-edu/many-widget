import "../index.css";

import { Speak, useSubmission, useWidgetParams } from "@moly-edu/widget-sdk";
import { useMemo } from "react";
import type {
  Shape3DWidgetAnswer,
  Shape3DWidgetParams,
} from "../definition_shapes_3d";

const SOLID_KEYS = ["cuboid", "cube", "cone", "cylinder"] as const;
type Solid3D = (typeof SOLID_KEYS)[number];

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

export function WidgetComponentShape3D() {
  const params = useWidgetParams<Shape3DWidgetParams>();

  const singleData = useMemo(
    () =>
      buildSingleChoiceData(
        params.targetSolid,
        params.singleSettings.shuffleOptions,
      ),
    [params.singleSettings.shuffleOptions, params.targetSolid],
  );

  const multiData = useMemo(
    () =>
      buildMultiSelectData({
        targetSolid: params.targetSolid,
        totalItems: params.multiSettings.totalItems,
        minTargetCount: params.multiSettings.minTargetCount,
        maxTargetCount: params.multiSettings.maxTargetCount,
      }),
    [
      params.multiSettings.maxTargetCount,
      params.multiSettings.minTargetCount,
      params.multiSettings.totalItems,
      params.targetSolid,
    ],
  );

  const netData = useMemo(
    () => buildNetMatchData(params.targetSolid, params.netSettings.optionCount),
    [params.netSettings.optionCount, params.targetSolid],
  );

  const questionText = getQuestionText(
    params.mode,
    params.customPrompt,
    params.targetSolid,
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<Shape3DWidgetAnswer>({
    evaluate: (ans) => {
      const value = ans.value?.trim() ?? "";
      let isCorrect = false;

      if (params.mode === "single-choice-4") {
        isCorrect = value === params.targetSolid;
      }

      if (params.mode === "multi-select") {
        const selectedIndices = parseIndexSet(value);
        isCorrect = areSetsEqual(selectedIndices, multiData.targetIndices);
      }

      if (params.mode === "net-match") {
        isCorrect = value === params.targetSolid;
      }

      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        maxScore: 100,
      };
    },
  });

  if (params.mode === "single-choice-4") {
    return (
      <SingleChoiceMode
        params={params}
        questionText={questionText}
        options={singleData.options}
        answerValue={answer?.value ?? ""}
        setAnswer={setAnswer}
        result={result}
        submit={submit}
        isLocked={isLocked}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (params.mode === "multi-select") {
    const selectedIndices = parseIndexSet(answer?.value ?? "");

    return (
      <MultiSelectMode
        params={params}
        questionText={questionText}
        items={multiData.items}
        selectedIndices={selectedIndices}
        targetIndices={multiData.targetIndices}
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
    <NetMatchMode
      params={params}
      questionText={questionText}
      targetSolid={params.targetSolid}
      options={netData.options}
      answerValue={answer?.value ?? ""}
      setAnswer={setAnswer}
      result={result}
      submit={submit}
      isLocked={isLocked}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

interface SharedModeProps {
  params: Shape3DWidgetParams;
  questionText: string;
  setAnswer: (answer: Shape3DWidgetAnswer) => void;
  result: SubmissionResult;
  submit: () => Promise<void>;
  isLocked: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
}

interface SingleChoiceModeProps extends SharedModeProps {
  options: Solid3D[];
  answerValue: string;
}

function SingleChoiceMode({
  params,
  questionText,
  options,
  answerValue,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: SingleChoiceModeProps) {
  const correctDetail = `Đáp án đúng là ${solidLabel(params.targetSolid)}.`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-amber-50 via-orange-50 to-yellow-50">
      <div className="w-full max-w-2xl">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
          <HeaderBadge
            title="🧊 Widget Hình Khối 3D"
            subtitle="Dạng 1: Chọn 1 trong 4"
            questionText={questionText}
          />

          <div className="grid grid-cols-2 gap-4">
            {options.map((solid) => {
              const isSelected = answerValue === solid;
              return (
                <button
                  key={solid}
                  onClick={() => {
                    if (isLocked) return;
                    setAnswer({ value: solid });
                  }}
                  disabled={isLocked}
                  className={`rounded-2xl border-2 p-3 transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-50 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Solid3DView solid={solid} />
                  <div className="mt-2 text-sm font-semibold text-slate-700">
                    {solidLabel(solid)}
                  </div>
                </button>
              );
            })}
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed
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
            helpfulHint="Mẹo: Khối lập phương có các cạnh bằng nhau, khối nón có đỉnh nhọn."
          />
        </div>
      </div>
    </div>
  );
}

interface MultiSelectModeProps extends SharedModeProps {
  items: Solid3D[];
  selectedIndices: Set<number>;
  targetIndices: Set<number>;
}

function MultiSelectMode({
  params,
  questionText,
  items,
  selectedIndices,
  targetIndices,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: MultiSelectModeProps) {
  const correctDetail = `Các đáp án đúng là ${solidLabel(params.targetSolid)}.`;

  const toggleSelect = (index: number) => {
    if (isLocked) return;

    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }

    setAnswer({ value: encodeIndexSet(next) });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-indigo-50 via-blue-50 to-violet-50">
      <div className="w-full max-w-3xl">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
          <HeaderBadge
            title="🧊 Widget Hình Khối 3D"
            subtitle="Dạng 2: Chọn nhiều đáp án"
            questionText={questionText}
          />

          <div className="text-xs text-slate-500 mb-3 text-center">
            Đã chọn {selectedIndices.size} khối
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((solid, index) => {
              const isSelected = selectedIndices.has(index);
              const isTarget = targetIndices.has(index);

              return (
                <button
                  key={`solid-${index}-${solid}`}
                  onClick={() => toggleSelect(index)}
                  disabled={isLocked}
                  className={`rounded-2xl border-2 p-2 transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Solid3DView solid={solid} compact />
                  <div className="text-xs font-medium text-slate-600 mt-1">
                    {isLocked && result && !result.isCorrect && isTarget
                      ? "(Đúng)"
                      : solidLabel(solid)}
                  </div>
                </button>
              );
            })}
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed
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
            helpfulHint="Xem kỹ đường nét: khối trụ có 2 đáy tròn, khối hộp có các mặt chữ nhật."
          />
        </div>
      </div>
    </div>
  );
}

interface NetMatchModeProps extends SharedModeProps {
  targetSolid: Solid3D;
  options: Solid3D[];
  answerValue: string;
}

function NetMatchMode({
  params,
  questionText,
  targetSolid,
  options,
  answerValue,
  setAnswer,
  result,
  submit,
  isLocked,
  canSubmit,
  isSubmitting,
}: NetMatchModeProps) {
  const correctDetail = `Lưới phẳng này tạo thành ${solidLabel(targetSolid)}.`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-emerald-50 via-lime-50 to-amber-50">
      <div className="w-full max-w-3xl">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
          <HeaderBadge
            title="🧊 Widget Hình Khối 3D"
            subtitle="Dạng 3: Nhận dạng lưới phẳng"
            questionText={questionText}
          />

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-4">
            <div className="text-xs font-semibold text-emerald-700 mb-2 text-center">
              Lưới phẳng của một hình khối:
            </div>
            <NetView solid={targetSolid} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {options.map((solid) => {
              const isSelected = answerValue === solid;
              return (
                <button
                  key={`net-option-${solid}`}
                  onClick={() => {
                    if (isLocked) return;
                    setAnswer({ value: solid });
                  }}
                  disabled={isLocked}
                  className={`rounded-2xl border-2 p-3 transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Solid3DView solid={solid} compact />
                  <div className="mt-2 text-sm font-semibold text-slate-700">
                    {solidLabel(solid)}
                  </div>
                </button>
              );
            })}
          </div>

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed
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
            helpfulHint="Hãy tưởng tượng gấp các mặt của lưới lại để thành khối 3D."
          />
        </div>
      </div>
    </div>
  );
}

function HeaderBadge({
  title,
  subtitle,
  questionText,
}: {
  title: string;
  subtitle: string;
  questionText: string;
}) {
  return (
    <div className="text-center mb-6">
      <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mb-2">
        {title}
      </div>
      <div className="text-xs font-semibold text-slate-500 mb-2">
        {subtitle}
      </div>
      <h2 className="text-lg font-bold text-slate-800">
        <Speak>{questionText}</Speak>
      </h2>
    </div>
  );
}

function Solid3DView({
  solid,
  compact,
}: {
  solid: Solid3D;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-16" : "h-20";

  if (solid === "cube") {
    return (
      <svg viewBox="0 0 140 100" className={`w-full ${sizeClass}`}>
        <polygon
          points="45,20 85,20 105,35 65,35"
          fill="#bfdbfe"
          stroke="#2563eb"
          strokeWidth="3"
        />
        <polygon
          points="45,20 65,35 65,75 45,60"
          fill="#93c5fd"
          stroke="#2563eb"
          strokeWidth="3"
        />
        <polygon
          points="65,35 105,35 105,75 65,75"
          fill="#60a5fa"
          stroke="#2563eb"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (solid === "cuboid") {
    return (
      <svg viewBox="0 0 140 100" className={`w-full ${sizeClass}`}>
        <polygon
          points="32,24 92,24 114,38 54,38"
          fill="#fed7aa"
          stroke="#ea580c"
          strokeWidth="3"
        />
        <polygon
          points="32,24 54,38 54,78 32,64"
          fill="#fdba74"
          stroke="#ea580c"
          strokeWidth="3"
        />
        <polygon
          points="54,38 114,38 114,78 54,78"
          fill="#fb923c"
          stroke="#ea580c"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (solid === "cone") {
    return (
      <svg viewBox="0 0 140 100" className={`w-full ${sizeClass}`}>
        <ellipse
          cx="70"
          cy="74"
          rx="34"
          ry="10"
          fill="#f0abfc"
          stroke="#c026d3"
          strokeWidth="3"
        />
        <path
          d="M70 18 L36 74 L104 74 Z"
          fill="#e879f9"
          stroke="#c026d3"
          strokeWidth="3"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 140 100" className={`w-full ${sizeClass}`}>
      <ellipse
        cx="70"
        cy="24"
        rx="26"
        ry="9"
        fill="#a7f3d0"
        stroke="#047857"
        strokeWidth="3"
      />
      <rect
        x="44"
        y="24"
        width="52"
        height="52"
        fill="#6ee7b7"
        stroke="#047857"
        strokeWidth="3"
      />
      <ellipse
        cx="70"
        cy="76"
        rx="26"
        ry="9"
        fill="#34d399"
        stroke="#047857"
        strokeWidth="3"
      />
    </svg>
  );
}

function NetView({ solid }: { solid: Solid3D }) {
  if (solid === "cube") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-28">
        <g fill="#bfdbfe" stroke="#2563eb" strokeWidth="3">
          <rect x="70" y="35" width="35" height="35" />
          <rect x="35" y="35" width="35" height="35" />
          <rect x="105" y="35" width="35" height="35" />
          <rect x="140" y="35" width="35" height="35" />
          <rect x="70" y="0" width="35" height="35" />
          <rect x="70" y="70" width="35" height="35" />
        </g>
      </svg>
    );
  }

  if (solid === "cuboid") {
    return (
      <svg viewBox="0 0 240 130" className="w-full h-28">
        <g fill="#fed7aa" stroke="#ea580c" strokeWidth="3">
          <rect x="75" y="40" width="50" height="30" />
          <rect x="25" y="40" width="50" height="30" />
          <rect x="125" y="40" width="50" height="30" />
          <rect x="175" y="40" width="40" height="30" />
          <rect x="75" y="10" width="50" height="30" />
          <rect x="75" y="70" width="50" height="30" />
        </g>
      </svg>
    );
  }

  if (solid === "cone") {
    return (
      <svg
        viewBox="0 0 200 150"
        width="200"
        height="150"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-28"
      >
        <path
          d="M 100 10 
       L 35 85 
       A 75 75 0 0 0 165 85 
       Z"
          fill="#f0abfc"
          stroke="#c026d3"
          stroke-width="3"
          stroke-linejoin="round"
        />

        <circle
          cx="100"
          cy="110"
          r="25"
          fill="#f5d0fe"
          stroke="#c026d3"
          stroke-width="3"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 240 120"
      className="w-full h-28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="65"
        y="30"
        width="110"
        height="60"
        fill="#a7f3d0"
        stroke="#047857"
        stroke-width="3"
      />

      <circle
        cx="120"
        cy="15"
        r="15"
        fill="#d1fae5"
        stroke="#047857"
        stroke-width="3"
      />

      <circle
        cx="120"
        cy="105"
        r="15"
        fill="#6ee7b7"
        stroke="#047857"
        stroke-width="3"
      />
    </svg>
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
  helpfulHint,
}: {
  result: { isCorrect: boolean } | null;
  isLocked: boolean;
  params: Shape3DWidgetParams;
  correctDetail: string;
  helpfulHint: string;
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
      <div className="text-xs text-slate-500 mt-2">{helpfulHint}</div>
    </div>
  );
}

function getQuestionText(
  mode: Shape3DWidgetParams["mode"],
  customPrompt: string,
  targetSolid: Solid3D,
): string {
  const prompt = customPrompt.trim();
  if (prompt) return prompt;

  if (mode === "single-choice-4") {
    return `Đâu là ${solidLabel(targetSolid)}?`;
  }

  if (mode === "multi-select") {
    return `Hãy chọn tất cả ${solidLabel(targetSolid)} trong các khối dưới đây.`;
  }

  return "Lưới phẳng dưới đây thuộc về hình khối nào?";
}

function buildSingleChoiceData(targetSolid: Solid3D, shuffleOptions: boolean) {
  const options = shuffleOptions
    ? shuffleList([...SOLID_KEYS])
    : [...SOLID_KEYS];

  if (!options.includes(targetSolid)) {
    options[0] = targetSolid;
  }

  return { options };
}

function buildMultiSelectData({
  targetSolid,
  totalItems,
  minTargetCount,
  maxTargetCount,
}: {
  targetSolid: Solid3D;
  totalItems: number;
  minTargetCount: number;
  maxTargetCount: number;
}) {
  const total = clamp(totalItems, 6, 20);
  const minTarget = clamp(Math.min(minTargetCount, maxTargetCount), 1, total);
  const maxTarget = clamp(
    Math.max(minTargetCount, maxTargetCount),
    minTarget,
    total,
  );
  const targetCount = randomInt(minTarget, maxTarget);

  const items: Solid3D[] = [];

  while (items.length < targetCount) {
    items.push(targetSolid);
  }

  while (items.length < total) {
    items.push(randomDistractorSolid(targetSolid));
  }

  const shuffledItems = shuffleList(items);
  const targetIndices = new Set<number>();

  shuffledItems.forEach((solid, index) => {
    if (solid === targetSolid) {
      targetIndices.add(index);
    }
  });

  return {
    items: shuffledItems,
    targetIndices,
  };
}

function buildNetMatchData(targetSolid: Solid3D, optionCount: number) {
  const total = clamp(optionCount, 3, 4);
  const distractors = SOLID_KEYS.filter((solid) => solid !== targetSolid);
  const options: Solid3D[] = [targetSolid];

  while (options.length < total) {
    const pick = distractors[randomInt(0, distractors.length - 1)] as Solid3D;
    if (!options.includes(pick)) {
      options.push(pick);
    }
  }

  return {
    options: shuffleList(options),
  };
}

function randomDistractorSolid(targetSolid: Solid3D): Solid3D {
  const pool = SOLID_KEYS.filter((solid) => solid !== targetSolid);
  return pool[randomInt(0, pool.length - 1)] as Solid3D;
}

function parseIndexSet(value: string): Set<number> {
  if (!value) return new Set<number>();

  return new Set(
    value
      .split(",")
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isFinite(item) && item >= 0),
  );
}

function encodeIndexSet(indices: Set<number>): string {
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

function solidLabel(solid: Solid3D): string {
  if (solid === "cuboid") return "hình hộp chữ nhật";
  if (solid === "cube") return "hình lập phương";
  if (solid === "cone") return "khối nón";
  return "khối trụ";
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shuffleList<T>(items: T[]): T[] {
  const copied = [...items];

  for (let index = copied.length - 1; index > 0; index--) {
    const randomIndex = randomInt(0, index);
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }

  return copied;
}
