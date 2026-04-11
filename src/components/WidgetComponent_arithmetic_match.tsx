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
  type DragEvent,
  type ReactNode,
} from "react";
import type {
  ArithmeticMatchWidgetAnswer,
  ArithmeticMatchWidgetParams,
} from "../definition_arithmetic_match";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type ExpressionId = 1 | 2 | 3 | 4 | 5 | 6;
type OperationVi = "phép cộng" | "phép trừ";
type Type2SupportMode = "sticks" | "lego" | "number-table" | "number-line";
type SupportModalStep = "root" | "type2-list" | "type2-preview";
type UsedSupport = "read-prompt" | "read-result" | Type2SupportMode;

type NumberStyle = {
  bg: string;
  text: string;
  border: string;
};

type StepMove = {
  from: number;
  to: number;
  label: string;
};

type ExpressionItem = {
  id: ExpressionId;
  title: string;
  imageUrl: string;
  operation: OperationVi;
  operatorSymbol: "+" | "-";
  firstNumber: number;
  secondNumber: number;
  result: number;
  expressionText: string;
  stepMoves: StepMove[];
  firstStyle: NumberStyle;
  secondStyle: NumberStyle;
  resultStyle: NumberStyle;
};

type ResultToken = {
  id: string;
  value: number;
};

type PlacementMap = Partial<Record<ExpressionId, string>>;
type SupportMap = Partial<Record<ExpressionId, UsedSupport[]>>;

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

export function WidgetComponentArithmeticMatch() {
  const params = useWidgetParams<ArithmeticMatchWidgetParams>();
  const expressions = useMemo(() => buildExpressions(params), [params]);
  const expressionIds = useMemo(
    () => expressions.map((item) => item.id),
    [expressions],
  );

  const resultTokens = useMemo(
    () => buildResultTokens(expressions),
    [expressions],
  );
  const tokenById = useMemo(
    () => new Map(resultTokens.map((token) => [token.id, token] as const)),
    [resultTokens],
  );

  const [placements, setPlacements] = useState<PlacementMap>({});
  const [supportsByExpression, setSupportsByExpression] = useState<SupportMap>(
    {},
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

  const [activeExpressionId, setActiveExpressionId] =
    useState<ExpressionId | null>(null);

  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportModalStep, setSupportModalStep] =
    useState<SupportModalStep>("root");
  const [pendingType2Support, setPendingType2Support] =
    useState<Type2SupportMode>("sticks");

  const audioTimerRef = useRef<number[]>([]);
  const placementsRef = useRef<PlacementMap>({});
  const supportsRef = useRef<SupportMap>({});

  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  useEffect(() => {
    supportsRef.current = supportsByExpression;
  }, [supportsByExpression]);

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<ArithmeticMatchWidgetAnswer>({
    evaluate: (ans) => {
      const parsedPlacements = parsePlacementMap(
        ans.value ?? "",
        expressionIds,
        tokenById,
      );

      const isCorrect = expressions.every((item) => {
        const tokenId = parsedPlacements[item.id];
        if (!tokenId) return false;
        const token = tokenById.get(tokenId);
        return token?.value === item.result;
      });

      const supportMap = parseSupportMap(ans.usedSupports ?? "", expressionIds);
      const usedSupports = flattenSupportMap(supportMap);
      const hasReadResultSupport = usedSupports.includes("read-result");
      const normalSupportCount = usedSupports.filter(
        (support) => support !== "read-result",
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

  const activeExpression = useMemo(
    () => expressions.find((item) => item.id === activeExpressionId) ?? null,
    [activeExpressionId, expressions],
  );

  useEffect(() => {
    const nextPlacements = parsePlacementMap(
      answer?.value ?? "",
      expressionIds,
      tokenById,
    );
    setPlacements((prev) =>
      isPlacementMapEqual(prev, nextPlacements) ? prev : nextPlacements,
    );

    const nextSupports = parseSupportMap(
      answer?.usedSupports ?? "",
      expressionIds,
    );
    setSupportsByExpression((prev) =>
      isSupportMapEqual(prev, nextSupports) ? prev : nextSupports,
    );
  }, [answer?.usedSupports, answer?.value, expressionIds, tokenById]);

  useEffect(() => {
    if (
      activeExpressionId &&
      !expressions.some((item) => item.id === activeExpressionId)
    ) {
      setActiveExpressionId(null);
      setSupportModalOpen(false);
    }
  }, [activeExpressionId, expressions]);

  useEffect(() => {
    audioTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    audioTimerRef.current = [];

    if (
      !supportModalOpen ||
      supportModalStep !== "type2-preview" ||
      !activeExpression ||
      (pendingType2Support !== "number-table" &&
        pendingType2Support !== "number-line")
    ) {
      return;
    }

    activeExpression.stepMoves.forEach((_, index) => {
      const timeout = window.setTimeout(
        () => {
          playStepAudio(activeExpression.operation, index + 1);
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
    activeExpression,
    pendingType2Support,
    supportModalOpen,
    supportModalStep,
  ]);

  const writeAnswer = (
    nextPlacements: PlacementMap = placementsRef.current,
    nextSupports: SupportMap = supportsRef.current,
  ) => {
    setAnswer({
      value: serializePlacementMap(nextPlacements, expressionIds),
      usedSupports: serializeSupportMap(nextSupports, expressionIds),
    });
  };

  const assignTokenToExpression = (
    expressionId: ExpressionId,
    tokenId: string,
  ) => {
    if (isLocked || !tokenById.has(tokenId)) return;

    setPlacements((prev) => {
      const next: PlacementMap = { ...prev };

      expressionIds.forEach((id) => {
        if (next[id] === tokenId) {
          delete next[id];
        }
      });

      next[expressionId] = tokenId;
      placementsRef.current = next;
      writeAnswer(next, supportsRef.current);
      return next;
    });

    setSelectedTokenId(null);
  };

  const removePlacementFromExpression = (expressionId: ExpressionId) => {
    if (isLocked) return;

    setPlacements((prev) => {
      if (!prev[expressionId]) return prev;
      const next = { ...prev };
      delete next[expressionId];
      placementsRef.current = next;
      writeAnswer(next, supportsRef.current);
      return next;
    });
  };

  const returnTokenToPool = (tokenId: string) => {
    if (isLocked) return;

    setPlacements((prev) => {
      const next = { ...prev };
      let changed = false;

      expressionIds.forEach((id) => {
        if (next[id] === tokenId) {
          delete next[id];
          changed = true;
        }
      });

      if (!changed) return prev;

      placementsRef.current = next;
      writeAnswer(next, supportsRef.current);
      return next;
    });
  };

  const onTokenDragStart = (
    event: DragEvent<HTMLButtonElement>,
    tokenId: string,
  ) => {
    if (isLocked) return;
    event.dataTransfer.setData("text/plain", tokenId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingTokenId(tokenId);
  };

  const onTokenDragEnd = () => {
    setDraggingTokenId(null);
  };

  const onExpressionDrop = (
    event: DragEvent<HTMLButtonElement>,
    expressionId: ExpressionId,
  ) => {
    event.preventDefault();
    if (isLocked) return;

    const tokenId = event.dataTransfer.getData("text/plain") || draggingTokenId;
    if (!tokenId) return;
    assignTokenToExpression(expressionId, tokenId);
  };

  const onPoolDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) return;

    const tokenId = event.dataTransfer.getData("text/plain") || draggingTokenId;
    if (!tokenId) return;
    returnTokenToPool(tokenId);
  };

  const onTokenClick = (tokenId: string) => {
    if (isLocked) return;
    setSelectedTokenId((prev) => (prev === tokenId ? null : tokenId));
  };

  const onExpressionSlotClick = (expressionId: ExpressionId) => {
    if (isLocked) return;

    if (placementsRef.current[expressionId]) {
      removePlacementFromExpression(expressionId);
      return;
    }

    if (!selectedTokenId) return;
    assignTokenToExpression(expressionId, selectedTokenId);
  };

  const markSupportUsed = (
    expressionId: ExpressionId,
    support: UsedSupport,
  ) => {
    setSupportsByExpression((prev) => {
      const current = prev[expressionId] ?? [];
      if (current.includes(support)) return prev;

      const next = {
        ...prev,
        [expressionId]: [...current, support],
      };

      supportsRef.current = next;
      writeAnswer(placementsRef.current, next);
      return next;
    });
  };

  const openSupportModalForExpression = (expressionId: ExpressionId) => {
    setActiveExpressionId(expressionId);
    setSupportModalOpen(true);
    setSupportModalStep("root");
  };

  const closeSupportModal = () => {
    setSupportModalOpen(false);
  };

  const previewTypeTwoSupport = (mode: Type2SupportMode) => {
    if (!activeExpression) return;
    markSupportUsed(activeExpression.id, mode);
    setPendingType2Support(mode);
    setSupportModalStep("type2-preview");
  };

  const readPromptSupport = () => {
    if (!activeExpression) return;
    markSupportUsed(activeExpression.id, "read-prompt");
    closeSupportModal();

    speakVietnamese(
      buildExpressionSpeech(
        activeExpression.firstNumber,
        activeExpression.secondNumber,
        activeExpression.operation,
        false,
      ),
    );
  };

  const readResultSupport = () => {
    if (!activeExpression) return;
    markSupportUsed(activeExpression.id, "read-result");
    closeSupportModal();

    speakVietnamese(
      buildExpressionSpeech(
        activeExpression.firstNumber,
        activeExpression.secondNumber,
        activeExpression.operation,
        true,
      ),
    );
  };

  const assignedTokenIds = useMemo(
    () => new Set(Object.values(placements).filter(Boolean)),
    [placements],
  );

  const unassignedTokens = useMemo(
    () => resultTokens.filter((token) => !assignedTokenIds.has(token.id)),
    [assignedTokenIds, resultTokens],
  );

  const allPlaced = expressions.every(
    (item) => typeof placements[item.id] === "string",
  );

  const midpoint = Math.ceil(expressions.length / 2);
  const leftExpressions = expressions.slice(0, midpoint);
  const rightExpressions = expressions.slice(midpoint);

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

      <div className="w-full max-w-6xl">
        <div className="bg-white rounded-3xl shadow-lg border border-orange-100 p-6 md:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl md:text-2xl font-black text-slate-800">
              <Speak>Kéo đáp án đúng vào từng phép tính.</Speak>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(110px,220px)_minmax(0,1fr)] gap-2 md:gap-4 items-start">
              <div className="space-y-3">
                {leftExpressions.map((item) => (
                  <ExpressionCard
                    key={`expr-left-${item.id}`}
                    expression={item}
                    assignedToken={
                      placements[item.id]
                        ? (tokenById.get(placements[item.id] ?? "") ?? null)
                        : null
                    }
                    disabled={isLocked}
                    selectedTokenId={selectedTokenId}
                    onOpenSupport={() => openSupportModalForExpression(item.id)}
                    onDrop={(event) => onExpressionDrop(event, item.id)}
                    onDragOver={(event) => {
                      if (isLocked) return;
                      event.preventDefault();
                    }}
                    onSlotClick={() => onExpressionSlotClick(item.id)}
                  />
                ))}
              </div>

              <AnswerPool
                tokens={unassignedTokens}
                selectedTokenId={selectedTokenId}
                disabled={isLocked}
                onDragOver={(event) => {
                  if (isLocked) return;
                  event.preventDefault();
                }}
                onDrop={onPoolDrop}
                onTokenClick={onTokenClick}
                onTokenDragStart={onTokenDragStart}
                onTokenDragEnd={onTokenDragEnd}
              />

              <div className="space-y-3">
                {rightExpressions.map((item) => (
                  <ExpressionCard
                    key={`expr-right-${item.id}`}
                    expression={item}
                    assignedToken={
                      placements[item.id]
                        ? (tokenById.get(placements[item.id] ?? "") ?? null)
                        : null
                    }
                    disabled={isLocked}
                    selectedTokenId={selectedTokenId}
                    onOpenSupport={() => openSupportModalForExpression(item.id)}
                    onDrop={(event) => onExpressionDrop(event, item.id)}
                    onDragOver={(event) => {
                      if (isLocked) return;
                      event.preventDefault();
                    }}
                    onSlotClick={() => onExpressionSlotClick(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {!isLocked && (
            <button
              type="button"
              onClick={submit}
              disabled={!allPlaced || !canSubmit || isSubmitting}
              className="w-full mt-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            expressions={expressions}
            placements={placements}
            tokenById={tokenById}
            supportsByExpression={supportsByExpression}
          />
        </div>
      </div>

      {supportModalOpen && activeExpression && (
        <SupportModal
          expression={activeExpression}
          step={supportModalStep}
          pendingType2Support={pendingType2Support}
          onClose={closeSupportModal}
          onReadPrompt={readPromptSupport}
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
              expression={activeExpression}
            />
          }
        />
      )}
    </div>
  );
}

function ExpressionCard({
  expression,
  assignedToken,
  disabled,
  selectedTokenId,
  onOpenSupport,
  onDrop,
  onDragOver,
  onSlotClick,
}: {
  expression: ExpressionItem;
  assignedToken: ResultToken | null;
  disabled: boolean;
  selectedTokenId: string | null;
  onOpenSupport: () => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onSlotClick: () => void;
}) {
  return (
    <div
      className="relative rounded-2xl border border-slate-200 bg-cover bg-center p-2 md:p-3 aspect-square flex flex-col"
      style={{ backgroundImage: `url(${expression.imageUrl})` }}
    >
      <div className="absolute top-3 left-3 z-10">
        <button
          type="button"
          onClick={onOpenSupport}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-700 text-xs md:text-sm font-semibold hover:bg-amber-100 inline-flex items-center gap-1"
        >
          <span aria-hidden="true">🛟</span>
          Hỗ trợ
        </button>
      </div>

      <div className="flex-1 flex items-end justify-center px-2 pb-1 md:pb-2">
        <span className="inline-block rounded-lg bg-white px-3 py-2 text-center text-[clamp(1.15rem,2.8vw,2rem)] md:text-4xl font-black font-mono text-slate-800 leading-none">
          {expression.firstNumber} {expression.operatorSymbol}{" "}
          {expression.secondNumber}
        </span>
      </div>

      <div className="pt-1 flex justify-center">
        <button
          type="button"
          onClick={onSlotClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          disabled={disabled}
          title={
            assignedToken
              ? "Bấm để bỏ đáp án"
              : "Thả đáp án vào đây hoặc chọn đáp án rồi bấm"
          }
          className={`h-14 min-w-14 rounded-xl border-2 border-dashed px-4 flex items-center justify-center text-2xl font-black ${
            assignedToken
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : selectedTokenId
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-slate-300 bg-white text-slate-400"
          } ${disabled ? "cursor-default" : "cursor-pointer"}`}
        >
          {assignedToken ? assignedToken.value : "?"}
        </button>
      </div>
    </div>
  );
}

function AnswerPool({
  tokens,
  selectedTokenId,
  disabled,
  onDragOver,
  onDrop,
  onTokenClick,
  onTokenDragStart,
  onTokenDragEnd,
}: {
  tokens: ResultToken[];
  selectedTokenId: string | null;
  disabled: boolean;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onTokenClick: (tokenId: string) => void;
  onTokenDragStart: (
    event: DragEvent<HTMLButtonElement>,
    tokenId: string,
  ) => void;
  onTokenDragEnd: () => void;
}) {
  return (
    <div className="min-h-90 relative" onDragOver={onDragOver} onDrop={onDrop}>
      <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-3 px-2 translate-y-5 md:translate-y-6">
        {tokens.length === 0 && !disabled && (
          <p className="w-full text-center text-xs text-slate-400">
            Kéo đáp án ra vùng trống ở giữa để trả về.
          </p>
        )}

        {tokens.map((token) => {
          const isSelected = selectedTokenId === token.id;
          const scatterStyle = getTokenScatterStyle(token.id);

          return (
            <button
              key={token.id}
              type="button"
              draggable={!disabled}
              onClick={() => onTokenClick(token.id)}
              onDragStart={(event) => onTokenDragStart(event, token.id)}
              onDragEnd={onTokenDragEnd}
              disabled={disabled}
              style={scatterStyle}
              className={`h-14 min-w-14 rounded-xl border-2 px-4 text-2xl font-black transition-colors ${
                isSelected
                  ? "border-orange-400 bg-orange-200 text-orange-800"
                  : "border-orange-300 bg-white text-orange-700 hover:bg-orange-100"
              } ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
            >
              {token.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SupportModal({
  expression,
  step,
  pendingType2Support,
  onClose,
  onReadPrompt,
  onSelectTypeTwo,
  onReadResult,
  onBack,
  onPreviewTypeTwo,
  previewContent,
}: {
  expression: ExpressionItem;
  step: SupportModalStep;
  pendingType2Support: Type2SupportMode;
  onClose: () => void;
  onReadPrompt: () => void;
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
            <Speak>{`Hỗ trợ cho ${expression.firstNumber} ${expression.operatorSymbol} ${expression.secondNumber}`}</Speak>
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
              title="Hỗ trợ bằng vật trực quan"
              colorClass="border-sky-200 bg-sky-50 hover:bg-sky-100"
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

function TypeTwoPreviewContent({
  mode,
  expression,
}: {
  mode: Type2SupportMode;
  expression: ExpressionItem;
}) {
  const supportBody =
    mode === "sticks" ? (
      <SticksSupport expression={expression} />
    ) : mode === "lego" ? (
      <LegoSupport expression={expression} />
    ) : mode === "number-table" ? (
      <NumberTableSupport expression={expression} />
    ) : (
      <NumberLineSupport expression={expression} />
    );

  return (
    <div className="space-y-3">
      <HorizontalExpression expression={expression} />
      {supportBody}
    </div>
  );
}

function HorizontalExpression({ expression }: { expression: ExpressionItem }) {
  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center justify-center gap-3 text-4xl md:text-5xl font-black font-mono">
        <span
          className="rounded-xl px-3 py-1 border"
          style={{
            backgroundColor: expression.firstStyle.bg,
            color: expression.firstStyle.text,
            borderColor: expression.firstStyle.border,
          }}
        >
          {expression.firstNumber}
        </span>
        <span className="text-orange-500">{expression.operatorSymbol}</span>
        <span
          className="rounded-xl px-3 py-1 border"
          style={{
            backgroundColor: expression.secondStyle.bg,
            color: expression.secondStyle.text,
            borderColor: expression.secondStyle.border,
          }}
        >
          {expression.secondNumber}
        </span>
        <span className="text-slate-500">=</span>
        <span className="rounded-xl px-3 py-1 border border-slate-300 bg-white text-slate-500">
          ?
        </span>
      </div>

      <p className="text-center text-xs text-slate-500 mt-2">
        {expression.expressionText}
      </p>
    </div>
  );
}

function SticksSupport({ expression }: { expression: ExpressionItem }) {
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
      <div className="flex items-start justify-center gap-3 flex-wrap md:flex-nowrap">
        <VisualCounterCard
          value={expression.firstNumber}
          style={expression.firstStyle}
          renderItem={(key, style) => <StickItem key={key} style={style} />}
        />

        <div className="text-4xl font-black text-sky-700 mt-8 px-1">
          {expression.operatorSymbol}
        </div>

        <VisualCounterCard
          value={expression.secondNumber}
          style={expression.secondStyle}
          renderItem={(key, style) => <StickItem key={key} style={style} />}
        />
      </div>

      <div className="pt-2 border-t border-sky-200 space-y-2">
        <div
          className="inline-block rounded-xl border p-2"
          style={{ borderColor: expression.resultStyle.border }}
        >
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: expression.result }).map((_, index) => (
              <StickItem
                key={`result-stick-${expression.id}-${index}`}
                style={expression.resultStyle}
              />
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

function LegoSupport({ expression }: { expression: ExpressionItem }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3">
      <div className="flex items-start justify-center gap-3 flex-wrap md:flex-nowrap">
        <VisualCounterCard
          value={expression.firstNumber}
          style={expression.firstStyle}
          renderItem={(key, style) => <LegoItem key={key} style={style} />}
        />

        <div className="text-4xl font-black text-violet-700 mt-8 px-1">
          {expression.operatorSymbol}
        </div>

        <VisualCounterCard
          value={expression.secondNumber}
          style={expression.secondStyle}
          renderItem={(key, style) => <LegoItem key={key} style={style} />}
        />
      </div>

      <div className="pt-2 border-t border-violet-200 space-y-2">
        <div
          className="inline-block rounded-xl border p-2"
          style={{ borderColor: expression.resultStyle.border }}
        >
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: expression.result }).map((_, index) => (
              <LegoItem
                key={`result-lego-${expression.id}-${index}`}
                style={expression.resultStyle}
              />
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
  renderItem,
}: {
  value: number;
  style: NumberStyle;
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
    </div>
  );
}

function NumberTableSupport({ expression }: { expression: ExpressionItem }) {
  const numbers = Array.from({ length: 20 }, (_, index) => index);
  const stepIndexByValue = new Map<number, number>();

  expression.stepMoves.forEach((move, index) => {
    stepIndexByValue.set(move.to, index);
  });

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <div className="grid grid-cols-10 gap-2">
        {numbers.map((value) => {
          const isStart = value === expression.firstNumber;
          const isTarget = value === expression.result;
          const stepIndex = stepIndexByValue.get(value);

          return (
            <div
              key={`table-${expression.id}-${value}`}
              className="relative h-16 rounded-lg border flex items-center justify-center font-bold overflow-hidden"
              style={{
                borderColor:
                  isStart || isTarget
                    ? expression.secondStyle.border
                    : "#cbd5e1",
                backgroundColor: isTarget
                  ? "#fde68a"
                  : isStart
                    ? expression.secondStyle.bg
                    : "#ffffff",
                color:
                  isStart || isTarget ? expression.secondStyle.text : "#334155",
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
                    {expression.stepMoves[stepIndex].label}
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

function NumberLineSupport({ expression }: { expression: ExpressionItem }) {
  const rangeMin = Math.max(
    0,
    Math.min(expression.firstNumber, expression.result) - 1,
  );
  const rangeMax = Math.min(
    19,
    Math.max(expression.firstNumber, expression.result) + 1,
  );
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
            id={`arrow-head-${expression.id}`}
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill={expression.secondStyle.border}
            />
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
          const isStart = value === expression.firstNumber;
          const isTarget = value === expression.result;

          return (
            <g key={`line-point-${expression.id}-${value}`}>
              <circle
                cx={x}
                cy={baselineY}
                r={isStart || isTarget ? 7 : 5}
                fill={
                  isStart || isTarget
                    ? expression.secondStyle.border
                    : "#94a3b8"
                }
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

        {expression.stepMoves.map((move, index) => {
          const x1 = getX(move.from);
          const x2 = getX(move.to);
          const mid = (x1 + x2) / 2;
          const arcHeight = 28 + (index % 2) * 10;
          const path = `M ${x1} ${baselineY} Q ${mid} ${arcHeight} ${x2} ${baselineY}`;
          const length = Math.abs(x2 - x1) * 1.9;

          return (
            <g
              key={`line-move-${expression.id}-${move.from}-${move.to}-${index}`}
            >
              <path
                d={path}
                fill="none"
                stroke={expression.secondStyle.border}
                strokeWidth="3"
                markerEnd={`url(#arrow-head-${expression.id})`}
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
                fill={expression.secondStyle.text}
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

function Feedback({
  result,
  isLocked,
  expressions,
  placements,
  tokenById,
  supportsByExpression,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  expressions: ExpressionItem[];
  placements: PlacementMap;
  tokenById: Map<string, ResultToken>;
  supportsByExpression: SupportMap;
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
          ? "Chính xác rồi!"
          : "Chưa đúng, kiểm tra lại các phép tính và đáp án đã ghép."}
      </p>

      <div className="mt-3 grid gap-2 text-left">
        {expressions.map((item) => {
          const tokenId = placements[item.id];
          const selectedValue = tokenId
            ? tokenById.get(tokenId)?.value
            : undefined;
          const isItemCorrect = selectedValue === item.result;
          const used = supportsByExpression[item.id] ?? [];

          return (
            <div
              key={`feedback-${item.id}`}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-700">
                  {item.firstNumber} {item.operatorSymbol} {item.secondNumber}
                </p>
                <span
                  className={`font-bold ${
                    isItemCorrect ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {isItemCorrect ? "Đúng" : "Sai"}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-600">
                Bạn chọn:{" "}
                <span className="font-bold">{selectedValue ?? "(trống)"}</span>
                {" · "}Đáp án đúng:{" "}
                <span className="font-bold">{item.result}</span>
              </p>

              {used.length > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Hỗ trợ đã dùng:{" "}
                  {used.map((support) => supportLabelMap[support]).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildExpressions(
  params: ArithmeticMatchWidgetParams,
): ExpressionItem[] {
  const expressionCount = clamp(params.expressionCount, 2, 6);

  const rawList = [
    { id: 1 as const, title: "Phép tính 1", settings: params.expression1 },
    { id: 2 as const, title: "Phép tính 2", settings: params.expression2 },
    { id: 3 as const, title: "Phép tính 3", settings: params.expression3 },
    { id: 4 as const, title: "Phép tính 4", settings: params.expression4 },
    { id: 5 as const, title: "Phép tính 5", settings: params.expression5 },
    { id: 6 as const, title: "Phép tính 6", settings: params.expression6 },
  ];

  return rawList.slice(0, expressionCount).map(({ id, title, settings }) => {
    const operation = settings.operation;

    const firstNumber =
      operation === "phép cộng"
        ? clamp(settings.addFirstNumber ?? 1, 1, 10)
        : clamp(settings.numberMax, 1, 10);

    const secondNumber =
      operation === "phép cộng"
        ? clamp(settings.addSecondNumber ?? 1, 1, 9)
        : clamp(settings.numberMin, 1, 9);

    const operatorSymbol: "+" | "-" = operation === "phép cộng" ? "+" : "-";
    const result =
      operation === "phép cộng"
        ? firstNumber + secondNumber
        : firstNumber - secondNumber;

    return {
      id,
      title,
      imageUrl:
        settings.imageUrl?.trim() || `https://picsum.photos/536/${353 + id}`,
      operation,
      operatorSymbol,
      firstNumber,
      secondNumber,
      result,
      expressionText: `${firstNumber} ${operatorSymbol} ${secondNumber}`,
      stepMoves: buildStepMoves(
        firstNumber,
        secondNumber,
        operation === "phép cộng" ? "add" : "subtract",
      ),
      firstStyle: getNumberStyle(firstNumber),
      secondStyle: getNumberStyle(secondNumber),
      resultStyle: getNumberStyle(result),
    };
  });
}

function buildResultTokens(expressions: ExpressionItem[]): ResultToken[] {
  const tokens = expressions.map((item) => ({
    id: `token-${item.id}`,
    value: item.result,
  }));

  const seed = expressions.reduce(
    (acc, item) =>
      acc * 31 + item.firstNumber * 13 + item.secondNumber * 7 + item.result,
    17,
  );

  return deterministicShuffle(tokens, seed);
}

function deterministicShuffle<T>(values: T[], seed: number): T[] {
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

function getTokenScatterStyle(tokenId: string) {
  const hash = tokenId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const rotate = (hash % 11) - 5;
  const offsetX = ((hash * 7) % 13) - 6;
  const offsetY = ((hash * 11) % 9) - 4;

  return {
    transform: `rotate(${rotate}deg) translate(${offsetX}px, ${offsetY}px)`,
  };
}

function serializePlacementMap(map: PlacementMap, ids: ExpressionId[]): string {
  const compact: Partial<Record<ExpressionId, string>> = {};

  ids.forEach((id) => {
    const tokenId = map[id];
    if (typeof tokenId === "string" && tokenId.length > 0) {
      compact[id] = tokenId;
    }
  });

  return JSON.stringify(compact);
}

function parsePlacementMap(
  raw: string,
  ids: ExpressionId[],
  tokenById?: Map<string, ResultToken>,
): PlacementMap {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const allowedIds = new Set(ids);
    const out: PlacementMap = {};

    Object.entries(parsed).forEach(([key, value]) => {
      const id = Number.parseInt(key, 10) as ExpressionId;
      if (!allowedIds.has(id)) return;
      if (typeof value !== "string" || value.length === 0) return;
      if (tokenById && !tokenById.has(value)) return;
      out[id] = value;
    });

    return out;
  } catch {
    return {};
  }
}

function serializeSupportMap(map: SupportMap, ids: ExpressionId[]): string {
  const compact: SupportMap = {};

  ids.forEach((id) => {
    const supports = map[id] ?? [];
    const unique = Array.from(new Set(supports));
    if (unique.length > 0) {
      compact[id] = unique;
    }
  });

  return JSON.stringify(compact);
}

function parseSupportMap(raw: string, ids: ExpressionId[]): SupportMap {
  if (!raw) return {};

  const allowedSupports: UsedSupport[] = [
    "read-prompt",
    "read-result",
    "sticks",
    "lego",
    "number-table",
    "number-line",
  ];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const allowedIds = new Set(ids);
    const out: SupportMap = {};

    Object.entries(parsed).forEach(([key, value]) => {
      const id = Number.parseInt(key, 10) as ExpressionId;
      if (!allowedIds.has(id)) return;
      if (!Array.isArray(value)) return;

      const filtered = value.filter(
        (item): item is UsedSupport =>
          typeof item === "string" &&
          allowedSupports.includes(item as UsedSupport),
      );

      const unique = Array.from(new Set(filtered));
      if (unique.length > 0) {
        out[id] = unique;
      }
    });

    return out;
  } catch {
    return {};
  }
}

function flattenSupportMap(map: SupportMap): UsedSupport[] {
  const values = Object.values(map).flatMap((supports) => supports ?? []);
  return Array.from(new Set(values));
}

function isPlacementMapEqual(a: PlacementMap, b: PlacementMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const id = Number.parseInt(key, 10) as ExpressionId;
    if ((a[id] ?? "") !== (b[id] ?? "")) {
      return false;
    }
  }
  return true;
}

function isSupportMapEqual(a: SupportMap, b: SupportMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    const id = Number.parseInt(key, 10) as ExpressionId;
    const left = a[id] ?? [];
    const right = b[id] ?? [];

    if (left.length !== right.length) {
      return false;
    }

    for (let i = 0; i < left.length; i += 1) {
      if (left[i] !== right[i]) {
        return false;
      }
    }
  }

  return true;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
  operation: OperationVi,
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

function playStepAudio(operation: OperationVi, step: number) {
  const word = stepWordMap[step];
  if (!word) return;

  const fileName =
    operation === "phép cộng" ? `add-${word}.wav` : `subtraction-${word}.wav`;

  const audioSrc = audioFileByName[fileName];
  if (!audioSrc) return;

  const audio = new Audio(audioSrc);
  void audio.play().catch(() => undefined);
}
