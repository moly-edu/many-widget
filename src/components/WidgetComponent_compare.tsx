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
  CompareWidgetAnswer,
  CompareWidgetParams,
} from "../definition_compare";
import { clamp, createLearningObjects } from "./learning-objects-data";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type CompareDraft = {
  leftValue: string;
  rightValue: string;
  signValue: "<" | "=" | ">" | "";
};

type UsedSupport =
  | "read-prompt"
  | "read-result"
  | "show-expression"
  | "visual-sign";
type SupportModalStep = "root" | "visual-preview";

const EMPTY_DRAFT: CompareDraft = {
  leftValue: "",
  rightValue: "",
  signValue: "",
};

const DEFAULT_LEFT_IMAGE = "https://picsum.photos/seed/compare-left/96/96";
const DEFAULT_RIGHT_IMAGE = "https://picsum.photos/seed/compare-right/96/96";

const GREATER_SIGN_IMAGE_URL =
  "https://ez-math.learning2ne1.com/uploads/lonhon.png";
const EQUAL_SIGN_IMAGE_URL =
  "https://png.pngtree.com/png-vector/20190223/ourmid/pngtree-equal-to-vector-icon-png-image_696414.jpg";

const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='16' fill='%23fde68a'/%3E%3Ccircle cx='48' cy='48' r='20' fill='%23f59e0b'/%3E%3C/svg%3E";

const supportLabelMap: Record<UsedSupport, string> = {
  "read-prompt": "Đọc đề bài",
  "read-result": "Đọc kết quả",
  "show-expression": "Hiển thị điền 2 số đầu vào",
  "visual-sign": "Hỗ trợ trực quan dấu so sánh",
};

export function WidgetComponentCompare() {
  const params = useWidgetParams<CompareWidgetParams>();

  const leftCount = clamp(params.leftCount, 1, 9);
  const rightCount = clamp(params.rightCount, 1, 9);
  const expectedSign = getCompareSign(leftCount, rightCount);

  const leftImageUrl = params.leftImageUrl?.trim() || DEFAULT_LEFT_IMAGE;
  const rightImageUrl = params.rightImageUrl?.trim() || DEFAULT_RIGHT_IMAGE;

  const leftObjects = useMemo(
    () => createLearningObjects(leftCount, "compare-left"),
    [leftCount],
  );

  const rightObjects = useMemo(
    () => createLearningObjects(rightCount, "compare-right"),
    [rightCount],
  );

  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportModalStep, setSupportModalStep] =
    useState<SupportModalStep>("root");
  const [usedSupports, setUsedSupports] = useState<UsedSupport[]>([]);

  const draftRef = useRef<CompareDraft>(EMPTY_DRAFT);
  const supportsRef = useRef<UsedSupport[]>([]);

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
      const draft = parseCompareDraft(ans.value ?? "");
      const leftInput = Number.parseInt(draft.leftValue, 10);
      const rightInput = Number.parseInt(draft.rightValue, 10);

      const isLeftCorrect =
        Number.isFinite(leftInput) && leftInput === leftCount;
      const isRightCorrect =
        Number.isFinite(rightInput) && rightInput === rightCount;
      const isSignCorrect = draft.signValue === expectedSign;

      const isCorrect = isLeftCorrect && isRightCorrect && isSignCorrect;
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
    () => parseCompareDraft(answer?.value ?? ""),
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

  const writeAnswer = (
    nextDraft: CompareDraft = draftRef.current,
    nextSupports: UsedSupport[] = supportsRef.current,
  ) => {
    setAnswer({
      value: serializeCompareDraft(nextDraft),
      usedSupports: serializeUsedSupports(nextSupports),
    });
  };

  const updateDraftField = (field: keyof CompareDraft, value: string) => {
    if (field === "signValue") {
      const sign = value === "<" || value === "=" || value === ">" ? value : "";
      const nextDraft: CompareDraft = {
        ...draftRef.current,
        signValue: sign,
      };
      draftRef.current = nextDraft;
      writeAnswer(nextDraft, supportsRef.current);
      return;
    }

    const clean = value.replace(/[^\d]/g, "").slice(0, 2);
    const nextDraft: CompareDraft = {
      ...draftRef.current,
      [field]: clean,
    };

    draftRef.current = nextDraft;
    writeAnswer(nextDraft, supportsRef.current);
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

  const openSupportModal = () => {
    setSupportModalOpen(true);
    setSupportModalStep("root");
  };

  const closeSupportModal = () => {
    setSupportModalOpen(false);
  };

  const readPromptSupport = () => {
    markSupportUsed("read-prompt");
    closeSupportModal();
    speakVietnamese(
      `Bên trái có số lượng là ${leftCount}, bên phải có số lượng là ${rightCount}.`,
    );
  };

  const readResultSupport = () => {
    markSupportUsed("read-result");
    closeSupportModal();
    speakVietnamese(buildReadResultSpeech(leftCount, rightCount, expectedSign));
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

    const nextDraft: CompareDraft = {
      ...draftRef.current,
      leftValue: String(leftCount),
      rightValue: String(rightCount),
    };

    draftRef.current = nextDraft;
    writeAnswer(nextDraft, nextSupports);
    closeSupportModal();
  };

  const openVisualSignSupport = () => {
    markSupportUsed("visual-sign");
    setSupportModalStep("visual-preview");
  };

  const isAnswerComplete =
    draft.leftValue !== "" && draft.rightValue !== "" && draft.signValue !== "";

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canSubmit && isAnswerComplete) {
      submit();
    }
  };

  const usedSupportLabels = useMemo(
    () => usedSupports.map((item) => supportLabelMap[item]),
    [usedSupports],
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-violet-50 via-fuchsia-50 to-pink-50">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold mb-2">
                ⚖️ So sánh trong phạm vi 10
              </div>
              <h2 className="text-xl font-black text-slate-800">
                <Speak>
                  Đếm số lượng hình ảnh và chọn dấu (&gt;, &lt;, =) đúng.
                </Speak>
              </h2>
            </div>

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DisplayBoard>
              <ImageOnlyGroup items={leftObjects} imageUrl={leftImageUrl} />
            </DisplayBoard>

            <DisplayBoard>
              <ImageOnlyGroup items={rightObjects} imageUrl={rightImageUrl} />
            </DisplayBoard>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <SmallCountInput
              value={draft.leftValue}
              onChange={(value) => updateDraftField("leftValue", value)}
              onKeyDown={onKeyDown}
              disabled={isLocked}
            />

            <SelectedSignBadge sign={draft.signValue} />

            <SmallCountInput
              value={draft.rightValue}
              onChange={(value) => updateDraftField("rightValue", value)}
              onKeyDown={onKeyDown}
              disabled={isLocked}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {[
              { sign: "<", label: "Bé hơn" },
              { sign: "=", label: "Bằng nhau" },
              { sign: ">", label: "Lớn hơn" },
            ].map((option) => (
              <button
                key={option.sign}
                type="button"
                onClick={() => updateDraftField("signValue", option.sign)}
                disabled={isLocked}
                className={`rounded-2xl border-2 px-3 py-3 transition-colors ${
                  draft.signValue === option.sign
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
              disabled={!isAnswerComplete || !canSubmit || isSubmitting}
              className="w-full mt-5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            expectedLeft={leftCount}
            expectedRight={rightCount}
            expectedSign={expectedSign}
            draft={draft}
            usedSupports={usedSupportLabels}
          />
        </div>
      </div>

      {supportModalOpen && (
        <SupportModal
          step={supportModalStep}
          onClose={closeSupportModal}
          onBack={() => setSupportModalStep("root")}
          onReadPrompt={readPromptSupport}
          onReadResult={readResultSupport}
          onShowExpression={applyShowExpressionSupport}
          onShowVisualSign={openVisualSignSupport}
          previewContent={
            <SignVisualPreview
              leftCount={leftCount}
              rightCount={rightCount}
              sign={expectedSign}
            />
          }
        />
      )}
    </div>
  );
}

function DisplayBoard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-cyan-100 bg-cyan-50/60 p-4 flex items-center justify-center min-h-56 w-full max-w-90 mx-auto">
      {children}
    </div>
  );
}

function ImageOnlyGroup({
  items,
  imageUrl,
}: {
  items: ReturnType<typeof createLearningObjects>;
  imageUrl: string;
}) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2 place-items-center justify-items-center">
        {items.map((item) => (
          <div
            key={item.id}
            className="h-22 w-22 rounded-xl border border-cyan-200 bg-white shadow-sm overflow-hidden"
          >
            <img
              src={imageUrl}
              alt="item"
              loading="lazy"
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
  );
}

function SmallCountInput({
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
      className="h-14 w-14 rounded-2xl border border-slate-300 bg-white text-center text-3xl font-black text-slate-700 focus:outline-none focus:border-slate-400 disabled:bg-slate-100"
    />
  );
}

function SelectedSignBadge({ sign }: { sign: CompareDraft["signValue"] }) {
  return (
    <div className="h-14 w-14 rounded-2xl border border-slate-300 bg-white flex items-center justify-center text-3xl font-black text-slate-700">
      {sign || "?"}
    </div>
  );
}

function SupportModal({
  step,
  onClose,
  onBack,
  onReadPrompt,
  onReadResult,
  onShowExpression,
  onShowVisualSign,
  previewContent,
}: {
  step: SupportModalStep;
  onClose: () => void;
  onBack: () => void;
  onReadPrompt: () => void;
  onReadResult: () => void;
  onShowExpression: () => void;
  onShowVisualSign: () => void;
  previewContent: ReactNode;
}) {
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
              title="Hiển thị điền 2 số đầu vào"
              colorClass="border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={onShowExpression}
              illustration={<SupportIllustration kind="show-expression" />}
            />

            <SupportOptionCard
              title="Hỗ trợ trực quan dấu so sánh"
              colorClass="border-rose-200 bg-rose-50 hover:bg-rose-100"
              onClick={onShowVisualSign}
              illustration={<SupportIllustration kind="visual-sign" />}
            />

            <SupportOptionCard
              title="Hỗ trợ đọc kết quả"
              colorClass="border-amber-200 bg-amber-50 hover:bg-amber-100"
              onClick={onReadResult}
              illustration={<SupportIllustration kind="read-result" />}
            />
          </div>
        )}

        {step === "visual-preview" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              Quay lại
            </button>

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
  kind: "read-prompt" | "read-result" | "show-expression" | "visual-sign";
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
      </svg>
    );
  }

  if (kind === "show-expression") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <rect x="6" y="10" width="20" height="14" rx="3" fill="#bfdbfe" />
        <rect x="46" y="10" width="20" height="14" rx="3" fill="#fecdd3" />
        <rect x="26" y="30" width="20" height="12" rx="3" fill="#bbf7d0" />
        <text x="16" y="20" fontSize="10" textAnchor="middle" fill="#1e3a8a">
          5
        </text>
        <text x="56" y="20" fontSize="10" textAnchor="middle" fill="#9f1239">
          3
        </text>
        <text x="36" y="39" fontSize="10" textAnchor="middle" fill="#065f46">
          =
        </text>
      </svg>
    );
  }

  return (
    <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
      <text x="14" y="30" fontSize="20" fontWeight="700" fill="#7c3aed">
        8
      </text>
      <text x="52" y="30" fontSize="20" fontWeight="700" fill="#be123c">
        6
      </text>
      <text x="36" y="30" fontSize="22" textAnchor="middle" fill="#f59e0b">
        &gt;
      </text>
    </svg>
  );
}

function SignVisualPreview({
  leftCount,
  rightCount,
  sign,
}: {
  leftCount: number;
  rightCount: number;
  sign: "<" | "=" | ">";
}) {
  const visual = getSignVisual(sign);

  return (
    <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
      <div className="flex items-center justify-center gap-3 md:gap-5">
        <div className="h-16 min-w-16 rounded-xl border border-amber-300 bg-amber-100 px-4 flex items-center justify-center text-3xl font-black text-amber-800">
          {leftCount}
        </div>

        <img
          src={visual.src}
          alt={visual.alt}
          className="h-14 w-14 object-contain"
          style={{ transform: visual.flipX ? "scaleX(-1)" : "none" }}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
          }}
        />

        <div className="h-16 min-w-16 rounded-xl border border-rose-300 bg-rose-100 px-4 flex items-center justify-center text-3xl font-black text-rose-800">
          {rightCount}
        </div>
      </div>
    </div>
  );
}

function Feedback({
  result,
  isLocked,
  expectedLeft,
  expectedRight,
  expectedSign,
  draft,
  usedSupports,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  expectedLeft: number;
  expectedRight: number;
  expectedSign: "<" | "=" | ">";
  draft: CompareDraft;
  usedSupports: string[];
}) {
  if (!result || !isLocked) return null;

  const left = Number.parseInt(draft.leftValue, 10);
  const right = Number.parseInt(draft.rightValue, 10);

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
          ? "Đúng rồi! Em đã điền đủ 2 số và chọn đúng dấu."
          : "Chưa đúng, kiểm tra lại 2 số lượng và dấu so sánh."}
      </p>

      <div className="mt-3 grid md:grid-cols-3 gap-2 text-left">
        <CheckRow
          label="Số bên trái"
          actual={Number.isFinite(left) ? left : null}
          expected={expectedLeft}
        />
        <CheckRow
          label="Số bên phải"
          actual={Number.isFinite(right) ? right : null}
          expected={expectedRight}
        />
        <CheckRow
          label="Dấu so sánh"
          actual={draft.signValue || null}
          expected={expectedSign}
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
  actual: number | string | null;
  expected: number | string;
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

function parseCompareDraft(raw: string): CompareDraft {
  if (!raw) return EMPTY_DRAFT;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_DRAFT;

    const draft = parsed as Partial<CompareDraft>;
    return {
      leftValue: sanitizeDraftValue(draft.leftValue),
      rightValue: sanitizeDraftValue(draft.rightValue),
      signValue:
        draft.signValue === "<" ||
        draft.signValue === "=" ||
        draft.signValue === ">"
          ? draft.signValue
          : "",
    };
  } catch {
    if (raw === "<" || raw === "=" || raw === ">") {
      return {
        ...EMPTY_DRAFT,
        signValue: raw,
      };
    }

    return EMPTY_DRAFT;
  }
}

function serializeCompareDraft(value: CompareDraft): string {
  return JSON.stringify(value);
}

function sanitizeDraftValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d]/g, "").slice(0, 2);
}

function parseUsedSupports(raw: string): UsedSupport[] {
  if (!raw) return [];

  const parsed = raw
    .split("|")
    .map((item) => item.trim())
    .filter(
      (item): item is UsedSupport =>
        item === "read-prompt" ||
        item === "read-result" ||
        item === "show-expression" ||
        item === "visual-sign",
    );

  return Array.from(new Set(parsed));
}

function serializeUsedSupports(items: UsedSupport[]): string {
  return Array.from(new Set(items)).join("|");
}

function getCompareSign(left: number, right: number): "<" | "=" | ">" {
  if (left < right) return "<";
  if (left > right) return ">";
  return "=";
}

function getSignVisual(sign: "<" | "=" | ">"): {
  src: string;
  flipX: boolean;
  alt: string;
} {
  if (sign === "=") {
    return {
      src: EQUAL_SIGN_IMAGE_URL,
      flipX: false,
      alt: "dấu bằng",
    };
  }

  return {
    src: GREATER_SIGN_IMAGE_URL,
    flipX: sign === "<",
    alt: sign === ">" ? "dấu lớn hơn" : "dấu bé hơn",
  };
}

function speakVietnamese(text: string) {
  void WidgetRuntime.requestTtsSpeak({
    text,
    lang: "vi-VN",
    rate: 0.95,
    timeoutMs: 25000,
  }).catch(() => undefined);
}

function buildReadResultSpeech(
  left: number,
  right: number,
  sign: "<" | "=" | ">",
): string {
  if (sign === ">") return `${left} lớn hơn ${right}.`;
  if (sign === "<") return `${left} nhỏ hơn ${right}.`;
  return `${left} bằng ${right}.`;
}
