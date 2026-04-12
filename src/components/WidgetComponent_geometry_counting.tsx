import "../index.css";

import {
  Speak,
  VoiceNumberInput,
  WidgetRuntime,
  useSubmission,
  useWidgetParams,
} from "@moly-edu/widget-sdk";
import {
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type {
  GeometryCountingWidgetAnswer,
  GeometryCountingWidgetParams,
} from "../definition_geometry_counting";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type AnswerMethod = "voice" | "input" | "choice";
type SupportModalStep = "root" | "real-object-preview";
type UsedSupport =
  | "counting-guide"
  | "read-answer"
  | "real-object-illustration"
  | "shape-description";
type ShapeType = "rectangle" | "square" | "circle" | "triangle";
type SceneModel = "house" | "car" | "train" | "boat";
type ShapeTypeParam = GeometryCountingWidgetParams["targetShape"];
type SceneModelParam = GeometryCountingWidgetParams["sceneModel"];

type RectangleShape = {
  type: "rectangle" | "square";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
};

type CircleShape = {
  type: "circle";
  x: number;
  y: number;
  r: number;
  color: string;
};

type TriangleShape = {
  type: "triangle";
  p1: [number, number];
  p2: [number, number];
  p3: [number, number];
  color: string;
};

type SceneShape = RectangleShape | CircleShape | TriangleShape;

const shapeTypeOptions = ["rectangle", "square", "circle", "triangle"] as const;

const shapeLabelMap: Record<ShapeType, string> = {
  rectangle: "hình chữ nhật",
  square: "hình vuông",
  circle: "hình tròn",
  triangle: "hình tam giác",
};

const modelLabelMap: Record<SceneModel, string> = {
  house: "ngôi nhà",
  car: "ô tô",
  train: "tàu hỏa",
  boat: "con thuyền",
};

const supportLabelMap: Record<UsedSupport, string> = {
  "counting-guide": "Hỗ trợ đếm",
  "read-answer": "Hỗ trợ đọc đáp án",
  "real-object-illustration": "Hỗ trợ minh họa đồ vật thực tế",
  "shape-description": "Hỗ trợ miêu tả hình học",
};

const realObjectIllustrationByShape: Partial<Record<ShapeType, string>> = {
  rectangle: "https://ez-math.learning2ne1.com/anh/hcn.png",
  square: "https://ez-math.learning2ne1.com/anh/hv.png",
  triangle: "https://ez-math.learning2ne1.com/anh/htg.png",
};

const sceneModelData: Record<SceneModel, SceneShape[]> = {
  house: [
    { type: "rectangle", x: 150, y: 180, w: 300, h: 180, color: "#facc15" },
    { type: "rectangle", x: 260, y: 260, w: 80, h: 100, color: "#92400e" },
    { type: "square", x: 185, y: 220, w: 50, h: 50, color: "#7dd3fc" },
    { type: "square", x: 365, y: 220, w: 50, h: 50, color: "#7dd3fc" },
    {
      type: "triangle",
      p1: [140, 180],
      p2: [460, 180],
      p3: [300, 60],
      color: "#fb7185",
    },
    { type: "rectangle", x: 380, y: 80, w: 40, h: 60, color: "#94a3b8" },
    { type: "circle", x: 520, y: 70, r: 35, color: "#f59e0b" },
  ],
  car: [
    { type: "rectangle", x: 120, y: 220, w: 360, h: 100, color: "#3b82f6" },
    { type: "rectangle", x: 180, y: 150, w: 200, h: 80, color: "#60a5fa" },
    { type: "square", x: 200, y: 165, w: 50, h: 50, color: "#ffffff" },
    { type: "square", x: 300, y: 165, w: 50, h: 50, color: "#ffffff" },
    { type: "circle", x: 180, y: 320, r: 35, color: "#1f2937" },
    { type: "circle", x: 420, y: 320, r: 35, color: "#1f2937" },
    { type: "circle", x: 180, y: 320, r: 15, color: "#94a3b8" },
    { type: "circle", x: 420, y: 320, r: 15, color: "#94a3b8" },
    {
      type: "triangle",
      p1: [480, 260],
      p2: [480, 310],
      p3: [530, 310],
      color: "#ef4444",
    },
  ],
  train: [
    { type: "rectangle", x: 300, y: 150, w: 150, h: 150, color: "#ef4444" },
    { type: "rectangle", x: 80, y: 200, w: 200, h: 100, color: "#10b981" },
    { type: "square", x: 380, y: 170, w: 50, h: 50, color: "#ffffff" },
    { type: "square", x: 110, y: 215, w: 40, h: 40, color: "#ffffff" },
    { type: "square", x: 210, y: 215, w: 40, h: 40, color: "#ffffff" },
    { type: "rectangle", x: 320, y: 80, w: 40, h: 70, color: "#4b5563" },
    { type: "circle", x: 130, y: 320, r: 25, color: "#111827" },
    { type: "circle", x: 230, y: 320, r: 25, color: "#111827" },
    { type: "circle", x: 340, y: 320, r: 35, color: "#111827" },
    { type: "circle", x: 410, y: 320, r: 35, color: "#111827" },
    {
      type: "triangle",
      p1: [450, 220],
      p2: [450, 300],
      p3: [520, 300],
      color: "#f59e0b",
    },
  ],
  boat: [
    { type: "rectangle", x: 280, y: 150, w: 10, h: 150, color: "#6d4c41" },
    {
      type: "triangle",
      p1: [290, 150],
      p2: [290, 280],
      p3: [420, 280],
      color: "#f8fafc",
    },
    {
      type: "triangle",
      p1: [270, 170],
      p2: [270, 280],
      p3: [180, 280],
      color: "#e2e8f0",
    },
    { type: "rectangle", x: 150, y: 300, w: 300, h: 60, color: "#d97706" },
    {
      type: "triangle",
      p1: [150, 300],
      p2: [150, 360],
      p3: [80, 300],
      color: "#d97706",
    },
    {
      type: "triangle",
      p1: [450, 300],
      p2: [450, 360],
      p3: [520, 300],
      color: "#d97706",
    },
    { type: "circle", x: 220, y: 330, r: 15, color: "#ffffff" },
    { type: "circle", x: 300, y: 330, r: 15, color: "#ffffff" },
    { type: "circle", x: 380, y: 330, r: 15, color: "#ffffff" },
    { type: "square", x: 275, y: 120, w: 20, h: 20, color: "#ef4444" },
  ],
};

export function WidgetComponentGeometryCounting() {
  const params = useWidgetParams<GeometryCountingWidgetParams>();
  const targetShape = normalizeShapeType(params.targetShape);
  const sceneModel = normalizeSceneModel(params.sceneModel);

  const questionText = `Có bao nhiêu ${shapeLabelMap[targetShape]} trong ${modelLabelMap[sceneModel]}?`;

  const sceneShapes = sceneModelData[sceneModel];
  const matchedShapes = useMemo(
    () => sceneShapes.filter((shape) => isShapeMatch(targetShape, shape.type)),
    [sceneShapes, targetShape],
  );
  const correctAnswer = matchedShapes.length;

  const [answerMethod, setAnswerMethod] = useState<AnswerMethod>("input");
  const [answerMethodModalOpen, setAnswerMethodModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportModalStep, setSupportModalStep] =
    useState<SupportModalStep>("root");
  const [usedSupports, setUsedSupports] = useState<UsedSupport[]>([]);
  const [isCountingSupportSelected, setIsCountingSupportSelected] =
    useState(false);

  const [isHintMode, setIsHintMode] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const [hintRunning, setHintRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const doneTimerRef = useRef<number | null>(null);

  const maxShapeCount = useMemo(() => {
    const counts = shapeTypeOptions.map(
      (shape) =>
        sceneShapes.filter((item) => isShapeMatch(shape, item.type)).length,
    );
    return Math.max(...counts, 0);
  }, [sceneShapes]);

  const choiceRange = {
    min: 0,
    max: Math.max(6, maxShapeCount + 2),
  };

  const choiceOptions = useMemo(
    () =>
      buildChoiceOptions(
        correctAnswer,
        choiceRange.min,
        choiceRange.max,
        correctAnswer * 100 + maxShapeCount * 10 + hintIndex + 1,
      ),
    [choiceRange.max, choiceRange.min, correctAnswer, hintIndex, maxShapeCount],
  );

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<GeometryCountingWidgetAnswer>({
    evaluate: (ans) => {
      const selected = Number.parseInt(ans.value ?? "", 10);
      const isCorrect = Number.isFinite(selected) && selected === correctAnswer;
      const supports = parseUsedSupports(ans.usedSupports ?? "");
      const hasReadAnswerSupport = supports.includes("read-answer");
      const normalSupportCount = supports.filter(
        (item) => item !== "read-answer",
      ).length;

      let score = isCorrect ? Math.max(0, 100 - normalSupportCount * 10) : 0;
      if (score > 0 && hasReadAnswerSupport) {
        score = score * 0.5;
      }

      return {
        isCorrect,
        score: Math.max(0, score),
        maxScore: 100,
      };
    },
  });

  useEffect(() => {
    drawScene({
      canvas: canvasRef.current,
      shapes: sceneShapes,
      targetShape,
      isHintMode,
      hintIndex,
    });
  }, [hintIndex, isHintMode, sceneShapes, targetShape]);

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
    clearHintTimers(intervalRef, doneTimerRef);
    setIsHintMode(false);
    setHintIndex(-1);
    setHintRunning(false);
    setStatusMessage("");
    setSupportModalStep("root");
    setSupportModalOpen(false);
    setIsCountingSupportSelected(false);
  }, [sceneModel, targetShape]);

  useEffect(() => {
    return () => {
      clearHintTimers(intervalRef, doneTimerRef);
    };
  }, []);

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
    const cleaned = value.replace(/[^\d]/g, "");
    writeAnswer(cleaned);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canSubmit) {
      submit();
    }
  };

  const adjustAnswerBy = (delta: number) => {
    const current = Number.parseInt(answer?.value ?? "", 10);
    const base = Number.isFinite(current) ? current : choiceRange.min;
    const next = clamp(base + delta, choiceRange.min, choiceRange.max);
    writeAnswer(String(next));
  };

  const startHint = () => {
    if (hintRunning) return;

    if (matchedShapes.length === 0) {
      setStatusMessage(
        `Không có ${shapeLabelMap[targetShape]} nào trong ${modelLabelMap[sceneModel]}.`,
      );
      return;
    }

    markSupportUsed("counting-guide");
    clearHintTimers(intervalRef, doneTimerRef);

    setIsHintMode(true);
    setHintIndex(-1);
    setHintRunning(true);
    setStatusMessage(`Cùng đếm ${shapeLabelMap[targetShape]} nhé...`);

    let counter = 0;
    intervalRef.current = window.setInterval(() => {
      setHintIndex(counter);
      counter += 1;

      if (counter >= matchedShapes.length) {
        clearHintTimers(intervalRef, doneTimerRef);
        doneTimerRef.current = window.setTimeout(() => {
          setHintRunning(false);
          setStatusMessage(
            `Tìm thấy ${matchedShapes.length} ${shapeLabelMap[targetShape]}.`,
          );
          doneTimerRef.current = null;
        }, 800);
      }
    }, 900);
  };

  const resetView = () => {
    clearHintTimers(intervalRef, doneTimerRef);
    setIsHintMode(false);
    setHintIndex(-1);
    setHintRunning(false);
    setStatusMessage("");
  };

  const readAnswerSupport = () => {
    markSupportUsed("read-answer");
    const text =
      correctAnswer === 0
        ? `Trong ${modelLabelMap[sceneModel]} không có ${shapeLabelMap[targetShape]}.`
        : `Trong ${modelLabelMap[sceneModel]} có ${numberToVietnamese(correctAnswer)} ${shapeLabelMap[targetShape]}.`;

    speakVietnamese(text);
  };

  const applyCountingSupport = () => {
    setIsCountingSupportSelected(true);
    setSupportModalOpen(false);
    setSupportModalStep("root");
    startHint();
  };

  const applyReadAnswerSupport = () => {
    setSupportModalOpen(false);
    setSupportModalStep("root");
    readAnswerSupport();
  };

  const openRealObjectSupportPreview = () => {
    markSupportUsed("real-object-illustration");
    setSupportModalStep("real-object-preview");
  };

  const closeSupportModal = () => {
    setSupportModalOpen(false);
    setSupportModalStep("root");
  };

  const applyShapeDescriptionSupport = () => {
    markSupportUsed("shape-description");
    setSupportModalOpen(false);
    setSupportModalStep("root");
    speakVietnamese(buildShapeDescriptionSpeech(targetShape));
  };

  const usedSupportLabels = usedSupports.map((item) => supportLabelMap[item]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-slate-50 via-cyan-50 to-teal-50">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold mb-2">
                Đếm hình học tương tác
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">
                <Speak>{questionText}</Speak>
              </h2>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-2">
                {isCountingSupportSelected && (
                  <button
                    type="button"
                    onClick={resetView}
                    disabled={isLocked}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                  >
                    Xem lại hình
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSupportModalStep("root");
                    setSupportModalOpen(true);
                  }}
                  disabled={isLocked}
                  className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-cyan-700 text-sm font-semibold hover:bg-cyan-100 disabled:opacity-60"
                >
                  <span aria-hidden="true" className="mr-1">
                    🛟
                  </span>
                  Hỗ trợ
                </button>
              </div>

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

          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 md:p-4">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className="w-full max-w-140 mx-auto rounded-xl border-2 border-slate-200 bg-white"
            />
          </div>

          <p className="h-7 mt-3 text-center text-sm font-medium text-slate-600">
            {statusMessage}
          </p>

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
                selectedValue={Number(answer?.value ?? "NaN")}
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

      {supportModalOpen && (
        <SupportModal
          step={supportModalStep}
          targetShape={targetShape}
          onClose={closeSupportModal}
          onBack={() => setSupportModalStep("root")}
          onCountingSupport={applyCountingSupport}
          onReadAnswerSupport={applyReadAnswerSupport}
          onRealObjectSupport={openRealObjectSupportPreview}
          onShapeDescriptionSupport={applyShapeDescriptionSupport}
          countingDisabled={hintRunning}
        />
      )}
    </div>
  );
}

function drawScene({
  canvas,
  shapes,
  targetShape,
  isHintMode,
  hintIndex,
}: {
  canvas: HTMLCanvasElement | null;
  shapes: SceneShape[];
  targetShape: ShapeType;
  isHintMode: boolean;
  hintIndex: number;
}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const matchingShapes = shapes.filter((shape) =>
    isShapeMatch(targetShape, shape.type),
  );

  for (const shape of shapes) {
    drawShape(ctx, shape, isHintMode, false);
  }

  if (!isHintMode || hintIndex < 0) return;

  for (let index = 0; index <= hintIndex; index += 1) {
    const shape = matchingShapes[index];
    if (!shape) break;

    drawShape(ctx, shape, false, true);
    drawLabel(ctx, shape, index + 1);
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: SceneShape,
  isDimmed: boolean,
  forceFullColor: boolean,
) {
  ctx.save();
  const dimmed = isDimmed && !forceFullColor;

  ctx.fillStyle = dimmed ? "#f1f5f9" : shape.color;
  ctx.strokeStyle = dimmed ? "#cbd5e1" : "#334155";
  ctx.lineWidth = 2;

  switch (shape.type) {
    case "rectangle":
    case "square":
      ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      break;
    case "circle":
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(shape.p1[0], shape.p1[1]);
      ctx.lineTo(shape.p2[0], shape.p2[1]);
      ctx.lineTo(shape.p3[0], shape.p3[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  shape: SceneShape,
  count: number,
) {
  const center = getShapeCenter(shape);

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 20px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(count), center.x, center.y);
  ctx.restore();
}

function getShapeCenter(shape: SceneShape): { x: number; y: number } {
  switch (shape.type) {
    case "rectangle":
    case "square":
      return {
        x: shape.x + shape.w / 2,
        y: shape.y + shape.h / 2,
      };
    case "circle":
      return { x: shape.x, y: shape.y };
    case "triangle":
      return {
        x: (shape.p1[0] + shape.p2[0] + shape.p3[0]) / 3,
        y: (shape.p1[1] + shape.p2[1] + shape.p3[1]) / 3,
      };
  }
}

function clearHintTimers(
  intervalRef: MutableRefObject<number | null>,
  doneTimerRef: MutableRefObject<number | null>,
) {
  if (intervalRef.current !== null) {
    window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  if (doneTimerRef.current !== null) {
    window.clearTimeout(doneTimerRef.current);
    doneTimerRef.current = null;
  }
}

function buildChoiceOptions(
  correctValue: number,
  min: number,
  max: number,
  seed: number,
): number[] {
  const options = new Set<number>([correctValue]);

  const offsets = [-1, 1, -2, 2, -3, 3, -4, 4];
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

  for (let index = output.length - 1; index > 0; index -= 1) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const ratio = currentSeed / 233280;
    const swapIndex = Math.floor(ratio * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}

function speakVietnamese(text: string) {
  void WidgetRuntime.requestTtsSpeak({
    text,
    lang: "vi-VN",
    rate: 0.95,
    timeoutMs: 25000,
  }).catch(() => undefined);
}

function parseUsedSupports(raw: string): UsedSupport[] {
  if (!raw) return [];

  const parsed = raw
    .split("|")
    .map((item) => item.trim())
    .filter(
      (item): item is UsedSupport =>
        item === "counting-guide" ||
        item === "read-answer" ||
        item === "real-object-illustration" ||
        item === "shape-description",
    );

  return Array.from(new Set(parsed));
}

function serializeUsedSupports(items: UsedSupport[]): string {
  return Array.from(new Set(items)).join("|");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeShapeType(value: ShapeTypeParam | string): ShapeType {
  if (value === "hình chữ nhật" || value === "rectangle") {
    return "rectangle";
  }

  if (value === "hình vuông" || value === "square") {
    return "square";
  }

  if (value === "hình tròn" || value === "circle") {
    return "circle";
  }

  if (value === "hình tam giác" || value === "triangle") {
    return "triangle";
  }

  return "rectangle";
}

function normalizeSceneModel(value: SceneModelParam | string): SceneModel {
  if (value === "ngôi nhà" || value === "house") {
    return "house";
  }

  if (value === "ô tô" || value === "car") {
    return "car";
  }

  if (value === "tàu hỏa" || value === "train") {
    return "train";
  }

  if (value === "con thuyền" || value === "boat") {
    return "boat";
  }

  return "house";
}

function isShapeMatch(
  targetShape: ShapeType,
  actualShape: SceneShape["type"],
): boolean {
  if (targetShape === "rectangle") {
    return actualShape === "rectangle" || actualShape === "square";
  }

  return actualShape === targetShape;
}

function buildShapeDescriptionSpeech(shape: ShapeType): string {
  if (shape === "rectangle") {
    return "Hình chữ nhật có bốn cạnh và bốn góc vuông. Hai cặp cạnh đối diện song song và bằng nhau. Hình vuông cũng là một hình chữ nhật đặc biệt.";
  }

  if (shape === "square") {
    return "Hình vuông có bốn cạnh bằng nhau và bốn góc vuông.";
  }

  if (shape === "triangle") {
    return "Hình tam giác có ba cạnh và ba góc.";
  }

  return "Hình tròn không có cạnh và không có góc. Mọi điểm trên đường tròn cách đều tâm.";
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

function SupportModal({
  step,
  targetShape,
  onClose,
  onBack,
  onCountingSupport,
  onReadAnswerSupport,
  onRealObjectSupport,
  onShapeDescriptionSupport,
  countingDisabled,
}: {
  step: SupportModalStep;
  targetShape: ShapeType;
  onClose: () => void;
  onBack: () => void;
  onCountingSupport: () => void;
  onReadAnswerSupport: () => void;
  onRealObjectSupport: () => void;
  onShapeDescriptionSupport: () => void;
  countingDisabled: boolean;
}) {
  const imageUrl = realObjectIllustrationByShape[targetShape];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SupportOptionCard
              title="Hỗ trợ đếm"
              colorClass="border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
              onClick={onCountingSupport}
              disabled={countingDisabled}
              illustration={<SupportIllustration kind="counting" />}
            />

            <SupportOptionCard
              title="Hỗ trợ miêu tả hình học"
              colorClass="border-violet-200 bg-violet-50 hover:bg-violet-100"
              onClick={onShapeDescriptionSupport}
              illustration={<SupportIllustration kind="shape-description" />}
            />

            <SupportOptionCard
              title="Hỗ trợ minh họa đồ vật thực tế"
              colorClass="border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={onRealObjectSupport}
              illustration={<SupportIllustration kind="real-object" />}
            />

            <SupportOptionCard
              title="Hỗ trợ đọc đáp án"
              colorClass="border-amber-200 bg-amber-50 hover:bg-amber-100"
              onClick={onReadAnswerSupport}
              illustration={<SupportIllustration kind="read-answer" />}
            />
          </div>
        )}

        {step === "real-object-preview" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              Quay lại
            </button>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800 mb-2">
                Minh họa đồ vật thực tế cho {shapeLabelMap[targetShape]}
              </p>

              {imageUrl ? (
                <div className="rounded-lg border border-emerald-200 bg-white p-2 max-w-sm">
                  <img
                    src={imageUrl}
                    alt={`minh-hoa-${targetShape}`}
                    className="w-full h-auto rounded-md"
                    loading="lazy"
                  />
                </div>
              ) : (
                <p className="text-sm text-emerald-700">
                  Chưa có ảnh minh họa cho hình này.
                </p>
              )}
            </div>
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
  disabled = false,
}: {
  title: string;
  colorClass: string;
  onClick: () => void;
  illustration: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left rounded-xl border-2 p-4 ${colorClass} disabled:opacity-60`}
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
  kind: "counting" | "read-answer" | "real-object" | "shape-description";
}) {
  if (kind === "counting") {
    return (
      <svg width="64" height="46" viewBox="0 0 64 46" aria-hidden="true">
        <rect x="6" y="8" width="16" height="16" rx="3" fill="#22d3ee" />
        <rect x="24" y="8" width="16" height="16" rx="3" fill="#67e8f9" />
        <rect x="42" y="8" width="16" height="16" rx="3" fill="#a5f3fc" />
        <circle cx="14" cy="34" r="8" fill="#2563eb" />
        <text x="14" y="37" textAnchor="middle" fontSize="11" fill="#fff">
          1
        </text>
        <circle cx="32" cy="34" r="8" fill="#2563eb" />
        <text x="32" y="37" textAnchor="middle" fontSize="11" fill="#fff">
          2
        </text>
      </svg>
    );
  }

  if (kind === "read-answer") {
    return (
      <svg width="64" height="46" viewBox="0 0 64 46" aria-hidden="true">
        <polygon points="8,18 16,18 24,12 24,34 16,28 8,28" fill="#f59e0b" />
        <path
          d="M 30 16 Q 36 23 30 30"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 38 12 Q 48 23 38 34"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "shape-description") {
    return (
      <svg width="64" height="46" viewBox="0 0 64 46" aria-hidden="true">
        <rect x="6" y="8" width="52" height="30" rx="5" fill="#8b5cf6" />
        <rect x="10" y="12" width="44" height="22" rx="3" fill="#ede9fe" />
        <path
          d="M 16 19 H 48"
          stroke="#6d28d9"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 16 26 H 40"
          stroke="#7c3aed"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width="64" height="46" viewBox="0 0 64 46" aria-hidden="true">
      <rect x="6" y="8" width="52" height="30" rx="5" fill="#10b981" />
      <rect x="10" y="12" width="44" height="22" rx="3" fill="#d1fae5" />
      <circle cx="20" cy="23" r="5" fill="#059669" />
      <rect x="30" y="18" width="16" height="10" rx="2" fill="#34d399" />
    </svg>
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
