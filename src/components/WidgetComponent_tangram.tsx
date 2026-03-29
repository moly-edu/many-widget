import "../index.css";

import { Speak, useSubmission } from "@moly-edu/widget-sdk";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TangramWidgetAnswer } from "../definition_tangram";

type PieceId = "L1" | "L2" | "M" | "S1" | "S2" | "SQ" | "P";
type AnswerStatus = "in-progress" | "solved";

interface PieceDef {
  id: PieceId;
  points: string;
  fill: string;
  stroke: string;
  label: string;
}

interface PieceState {
  pieceId: PieceId;
  x: number;
  y: number;
  rotation: number;
  snapped: boolean;
}

interface SlotTransform {
  pieceId: PieceId;
  x: number;
  y: number;
  rotation: number;
}

interface TangramTarget {
  id: "rooster" | "shape2" | "shape3";
  title: string;
  subtitle: string;
  slots: SlotTransform[];
}

interface DraggingState {
  pieceId: PieceId;
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

const ROTATE_STEP = 45;
const SNAP_DISTANCE = 26;
const SNAP_ROTATION_GAP = 16;

// ─── Symmetry & interchangeable groups ───────────────────────────────────────

// Các nhóm mảnh có thể hoán đổi slot cho nhau (cùng hình, khác màu)
const INTERCHANGEABLE_GROUPS: PieceId[][] = [
  ["L1", "L2"],
  ["S1", "S2"],
];

// Chu kỳ đối xứng: xoay thêm bao nhiêu độ thì hình trùng lại
const PIECE_SYMMETRY: Partial<Record<PieceId, number>> = {
  SQ: 90, // hình vuông: 90°, 180°, 270° đều như nhau
  P: 180, // hình bình hành: 180° trùng lại
};

function rotationMatches(
  actual: number,
  target: number,
  pieceId: PieceId,
): boolean {
  const symmetry = PIECE_SYMMETRY[pieceId];
  if (!symmetry) {
    return angleDifference(actual, target) <= SNAP_ROTATION_GAP;
  }
  for (let offset = 0; offset < 360; offset += symmetry) {
    if (angleDifference(actual, target + offset) <= SNAP_ROTATION_GAP)
      return true;
  }
  return false;
}

function getInterchangeGroup(pieceId: PieceId): PieceId[] {
  return INTERCHANGEABLE_GROUPS.find((g) => g.includes(pieceId)) ?? [pieceId];
}

// ─── Piece definitions ────────────────────────────────────────────────────────

const PIECES: PieceDef[] = [
  {
    id: "L1",
    points: "-70,70 70,70 -70,-70",
    fill: "#1e3a5f",
    stroke: "#0f2040",
    label: "Tam giác lớn A",
  },
  {
    id: "L2",
    points: "-70,70 70,70 -70,-70",
    fill: "#8b1a1a",
    stroke: "#5c1010",
    label: "Tam giác lớn B",
  },
  {
    id: "M",
    points: "-50,50 50,50 -50,-50",
    fill: "#2a7f6f",
    stroke: "#1a5040",
    label: "Tam giác vừa",
  },
  {
    id: "S1",
    points: "-35,35 35,35 -35,-35",
    fill: "#5daa2a",
    stroke: "#3a7018",
    label: "Tam giác nhỏ 1",
  },
  {
    id: "S2",
    points: "-35,35 35,35 -35,-35",
    fill: "#e8a020",
    stroke: "#b07010",
    label: "Tam giác nhỏ 2",
  },
  {
    id: "SQ",
    points: "-35,-35 35,-35 35,35 -35,35",
    fill: "#2aaecc",
    stroke: "#1a8090",
    label: "Hình vuông",
  },
  {
    id: "P",
    points: "70,35 0,35 -70,-35 0,-35",
    fill: "#e05a10",
    stroke: "#a03808",
    label: "Hình bình hành lớn",
  },
];

// ─── Target shapes ────────────────────────────────────────────────────────────

const TARGETS: TangramTarget[] = [
  {
    id: "rooster",
    title: "Đà Điểu",
    subtitle: "7 mảnh ghép tạo thành hình đà điểu",
    slots: [
      { pieceId: "L2", x: 286, y: 145, rotation: 315 },
      { pieceId: "L1", x: 438, y: 195, rotation: 45 },
      { pieceId: "SQ", x: 338, y: 248, rotation: 45 },
      { pieceId: "S2", x: 440, y: 294, rotation: 225 },
      { pieceId: "S1", x: 328, y: 310, rotation: 270 },
      { pieceId: "P", x: 191, y: 107, rotation: 180 },
      { pieceId: "M", x: 124, y: 67, rotation: 135 },
    ],
  },
  {
    id: "shape2",
    title: "Tên Lửa",
    subtitle: "7 mảnh ghép tạo thành tên lửa",
    slots: [
      { pieceId: "L1", x: 315, y: 119, rotation: 45 },
      { pieceId: "L2", x: 317, y: 120, rotation: 225 },
      { pieceId: "M", x: 368, y: 69, rotation: 180 },
      { pieceId: "SQ", x: 239, y: 194, rotation: 315 },
      { pieceId: "P", x: 162, y: 168, rotation: 315 },
      { pieceId: "S1", x: 289, y: 247, rotation: 45 },
      { pieceId: "S2", x: 239, y: 299, rotation: 225 },
    ],
  },
  {
    id: "shape3",
    title: "Gà Trống",
    subtitle: "7 mảnh ghép tạo thành hình gà trống",
    slots: [
      { pieceId: "L2", x: 180, y: 212, rotation: 180 },
      { pieceId: "L1", x: 320, y: 269, rotation: 90 },
      { pieceId: "M", x: 180, y: 141, rotation: 135 },
      { pieceId: "SQ", x: 357, y: 163, rotation: 180 },
      { pieceId: "S2", x: 367, y: 125, rotation: 135 },
      { pieceId: "P", x: 108, y: 178, rotation: 180 },
      { pieceId: "S1", x: 347, y: 295, rotation: 45 },
    ],
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function WidgetComponentTangram() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [selectedTargetId, setSelectedTargetId] = useState<
    TangramTarget["id"] | null
  >(null);
  const [pieceStates, setPieceStates] = useState<PieceState[]>(
    createIdlePieceStates,
  );
  const [selectedPieceId, setSelectedPieceId] = useState<PieceId | null>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);

  const pieceStatesRef = useRef<PieceState[]>(pieceStates);
  useEffect(() => {
    pieceStatesRef.current = pieceStates;
  }, [pieceStates]);

  const { setAnswer, result, submit, isLocked, canSubmit, isSubmitting } =
    useSubmission<TangramWidgetAnswer>({
      evaluate: (ans) => {
        const parsed = parseAnswer(ans.value ?? "");
        return {
          isCorrect: parsed.status === "solved",
          score: parsed.status === "solved" ? 100 : 0,
          maxScore: 100,
        };
      },
    });

  const selectedTarget = useMemo(
    () => TARGETS.find((t) => t.id === selectedTargetId) ?? null,
    [selectedTargetId],
  );

  const selectedPieceState = useMemo(
    () => pieceStates.find((p) => p.pieceId === selectedPieceId) ?? null,
    [pieceStates, selectedPieceId],
  );

  const isSolved = useMemo(
    () =>
      selectedTarget ? areAllPiecesSnapped(pieceStates, selectedTarget) : false,
    [pieceStates, selectedTarget],
  );

  const orderedPieces = useMemo(
    () =>
      [...pieceStates].sort((a, b) => {
        if (a.pieceId === selectedPieceId) return 1;
        if (b.pieceId === selectedPieceId) return -1;
        return 0;
      }),
    [pieceStates, selectedPieceId],
  );

  const updateProgress = useCallback(
    (nextStates: PieceState[], target: TangramTarget) => {
      pieceStatesRef.current = nextStates;
      setPieceStates(nextStates);
      const solved = areAllPiecesSnapped(nextStates, target);
      setAnswer({
        value: encodeAnswer(target.id, solved ? "solved" : "in-progress"),
      });
    },
    [setAnswer],
  );

  // ─── Pointer events ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dragging || !selectedTarget || isLocked) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId) return;
      const point = clientToSvgPoint(
        svgRef.current,
        event.clientX,
        event.clientY,
      );
      if (!point) return;
      setPieceStates((prev) => {
        const next = prev.map((p) =>
          p.pieceId === dragging.pieceId
            ? {
                ...p,
                x: point.x - dragging.offsetX,
                y: point.y - dragging.offsetY,
              }
            : p,
        );
        pieceStatesRef.current = next;
        return next;
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId) return;
      const snapped = snapPieceIfClose(
        pieceStatesRef.current,
        dragging.pieceId,
        selectedTarget,
      );
      setDragging(null);
      updateProgress(snapped, selectedTarget);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, isLocked, selectedTarget, updateProgress]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const chooseTarget = (target: TangramTarget) => {
    if (isLocked) return;
    setSelectedTargetId(target.id);
    setSelectedPieceId(null);
    setDragging(null);
    const scrambled = createScrambledPieceStates(target);
    updateProgress(scrambled, target);
  };

  const goBackToMenu = () => {
    if (isLocked) return;
    setSelectedTargetId(null);
    setSelectedPieceId(null);
    setDragging(null);
    const idle = createIdlePieceStates();
    pieceStatesRef.current = idle;
    setPieceStates(idle);
  };

  const rotateSelectedPiece = (direction: "cw" | "ccw") => {
    if (!selectedTarget || !selectedPieceId || isLocked) return;
    const delta = direction === "cw" ? ROTATE_STEP : -ROTATE_STEP;
    const next = pieceStates.map((p) =>
      p.pieceId === selectedPieceId
        ? { ...p, rotation: normalizeAngle(p.rotation + delta), snapped: false }
        : p,
    );
    updateProgress(next, selectedTarget);
  };

  const onPiecePointerDown = (
    pieceId: PieceId,
    event: ReactPointerEvent<SVGGElement>,
  ) => {
    if (!selectedTarget || isLocked) return;
    const currentPiece = pieceStatesRef.current.find(
      (p) => p.pieceId === pieceId,
    );
    if (!currentPiece) return;
    const point = clientToSvgPoint(
      svgRef.current,
      event.clientX,
      event.clientY,
    );
    if (!point) return;
    event.preventDefault();
    setSelectedPieceId(pieceId);
    setDragging({
      pieceId,
      pointerId: event.pointerId,
      offsetX: point.x - currentPiece.x,
      offsetY: point.y - currentPiece.y,
    });
    setPieceStates((prev) => {
      const next = prev.map((p) =>
        p.pieceId === pieceId ? { ...p, snapped: false } : p,
      );
      pieceStatesRef.current = next;
      return next;
    });
  };

  // const logCurrentSlots = useCallback(() => {
  //   const lines = pieceStates.map((p) => {
  //     const piece = PIECES.find((pc) => pc.id === p.pieceId);
  //     return `  { pieceId: "${p.pieceId}", x: ${Math.round(p.x)}, y: ${Math.round(p.y)}, rotation: ${Math.round(p.rotation)} }, // ${piece?.label ?? ""}`;
  //   });
  //   const output = `slots: [\n${lines.join("\n")}\n]`;
  //   console.log(
  //     `\n=== [${selectedTarget?.title}] Current slots ===\n${output}`,
  //   );
  // }, [pieceStates, selectedTarget]);

  // ─── Menu screen ───────────────────────────────────────────────────────────

  if (!selectedTarget) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-slate-50 to-slate-100">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 mb-2">
              🧩 Tangram
            </div>
            <h2 className="text-2xl font-black text-slate-800">
              Chọn hình mục tiêu
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Xếp 7 mảnh ghép để tạo thành hình bóng mờ phía dưới.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {TARGETS.map((target) => (
              <button
                key={target.id}
                onClick={() => chooseTarget(target)}
                disabled={isLocked}
                className={`rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:shadow-md ${
                  isLocked ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <div className="text-sm font-bold text-slate-800 mb-2">
                  {target.title}
                </div>
                <TargetSilhouette target={target} />
                <div className="text-xs text-indigo-600 font-semibold mt-2">
                  Chơi hình này →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Game screen ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-5xl">
        {isLocked && <ReviewBadge />}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 mb-1">
                🧩 Tangram
              </div>
              <h2 className="text-xl font-black text-slate-800">
                <Speak>Ghép thành: {selectedTarget.title}</Speak>
              </h2>
              <p className="text-sm text-slate-500">
                Kéo và xoay các mảnh để khớp với bóng mờ
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={goBackToMenu}
                disabled={isLocked}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-default text-sm"
              >
                ← Đổi hình
              </button>
              {!isLocked && (
                <>
                  {/* <button
                    onClick={logCurrentSlots}
                    className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-semibold"
                  >
                    📋 Log vị trí
                  </button> */}
                  <button
                    onClick={submit}
                    disabled={!canSubmit || isSubmitting}
                    className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 disabled:bg-slate-300 text-sm"
                  >
                    {isSubmitting ? "Đang nộp..." : "Nộp bài"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <svg
              ref={svgRef}
              viewBox="0 0 520 360"
              className="w-full rounded-xl bg-white"
              style={{ touchAction: "none", maxHeight: "420px" }}
              aria-label="Khu vực ghép hình Tangram"
            >
              {/* Background */}
              <rect
                x="12"
                y="12"
                width="496"
                height="336"
                rx="16"
                fill="#f8fafc"
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />

              {/* Target silhouette guide */}
              <TargetGuide target={selectedTarget} variant="guide" />

              {/* Puzzle pieces */}
              {orderedPieces.map((pieceState) => {
                const piece = PIECES.find((p) => p.id === pieceState.pieceId);
                if (!piece) return null;
                const isSelected = selectedPieceId === pieceState.pieceId;
                return (
                  <g
                    key={`piece-${pieceState.pieceId}`}
                    transform={`translate(${pieceState.x} ${pieceState.y}) rotate(${pieceState.rotation})`}
                    onPointerDown={(e) =>
                      onPiecePointerDown(pieceState.pieceId, e)
                    }
                    style={{ cursor: isLocked ? "default" : "grab" }}
                  >
                    <polygon
                      points={piece.points}
                      fill={piece.fill}
                      stroke={isSelected ? "#ffffff" : piece.stroke}
                      strokeWidth={isSelected ? 4 : 2}
                      opacity={pieceState.snapped ? 0.9 : 1}
                    />
                  </g>
                );
              })}

              {/* Rotate buttons */}
              {!isLocked && selectedPieceState && (
                <>
                  <RotateButton
                    x={Math.max(40, Math.min(480, selectedPieceState.x - 75))}
                    y={Math.max(30, Math.min(330, selectedPieceState.y))}
                    label="↺"
                    onRotate={() => rotateSelectedPiece("ccw")}
                  />
                  <RotateButton
                    x={Math.max(40, Math.min(480, selectedPieceState.x + 75))}
                    y={Math.max(30, Math.min(330, selectedPieceState.y))}
                    label="↻"
                    onRotate={() => rotateSelectedPiece("cw")}
                  />
                </>
              )}
            </svg>
          </div>

          <p className="text-xs text-slate-400 mt-2 text-center">
            Chạm mảnh → hiện nút xoay ↺ ↻ ở hai bên · Kéo vào vị trí bóng mờ để
            snap
          </p>

          <FeedbackPanel
            result={result}
            isLocked={isLocked}
            solved={isSolved}
            targetTitle={selectedTarget.title}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RotateButton({
  x,
  y,
  label,
  onRotate,
}: {
  x: number;
  y: number;
  label: string;
  onRotate: () => void;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRotate();
      }}
      style={{ cursor: "pointer" }}
    >
      <circle
        cx="0"
        cy="0"
        r="22"
        fill="rgba(255,255,255,0.85)"
        stroke="#64748b"
        strokeWidth="1.5"
      />
      <text
        x="0"
        y="7"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fill="#334155"
      >
        {label}
      </text>
    </g>
  );
}

function TargetSilhouette({ target }: { target: TangramTarget }) {
  // Bán kính xấp xỉ của từng mảnh để tính bounding box
  const PIECE_RADIUS: Record<PieceId, number> = {
    L1: 100,
    L2: 100,
    M: 72,
    S1: 50,
    S2: 50,
    SQ: 50,
    P: 75,
  };
  const PAD = 18;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const slot of target.slots) {
    const r = PIECE_RADIUS[slot.pieceId];
    minX = Math.min(minX, slot.x - r);
    minY = Math.min(minY, slot.y - r);
    maxX = Math.max(maxX, slot.x + r);
    maxY = Math.max(maxY, slot.y + r);
  }

  const vx = minX - PAD;
  const vy = minY - PAD;
  const vw = maxX - minX + PAD * 2;
  const vh = maxY - minY + PAD * 2;

  return (
    <svg
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      className="w-full rounded-xl border border-slate-100 bg-slate-50"
      style={{ aspectRatio: `${vw} / ${vh}` }}
    >
      <TargetGuide target={target} variant="preview" />
    </svg>
  );
}

function TargetGuide({
  target,
  variant,
}: {
  target: TangramTarget;
  variant: "preview" | "guide";
}) {
  const isGuide = variant === "guide";
  return (
    <g opacity={isGuide ? 0.28 : 1}>
      {target.slots.map((slot) => {
        const piece = PIECES.find((p) => p.id === slot.pieceId);
        if (!piece) return null;
        return (
          <g
            key={`${variant}-${slot.pieceId}`}
            transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rotation})`}
          >
            <polygon
              points={piece.points}
              fill={isGuide ? "#94a3b8" : piece.fill}
              stroke={isGuide ? "#64748b" : piece.stroke}
              strokeWidth={isGuide ? 1.5 : 2.5}
              strokeDasharray={isGuide ? "5 4" : undefined}
            />
          </g>
        );
      })}
    </g>
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

function FeedbackPanel({
  result,
  isLocked,
  solved,
  targetTitle,
}: {
  result: { isCorrect: boolean } | null;
  isLocked: boolean;
  solved: boolean;
  targetTitle: string;
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
      <div className="text-3xl mb-1">{result.isCorrect ? "🎉" : "💪"}</div>
      <div
        className={`text-lg font-bold ${result.isCorrect ? "text-green-700" : "text-red-700"}`}
      >
        {result.isCorrect
          ? "Xuất sắc! Bạn đã ghép đúng!"
          : "Chưa khớp, thử lại nhé!"}
      </div>
      <div className="text-sm text-slate-500 mt-1">
        {solved
          ? `${targetTitle} đã ghép đúng vị trí.`
          : "Kéo mảnh vào đúng bóng mờ."}
      </div>
    </div>
  );
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function createIdlePieceStates(): PieceState[] {
  return PIECES.map((piece, i) => ({
    pieceId: piece.id,
    x: 68 + (i % 4) * 102,
    y: 290 + Math.floor(i / 4) * 58,
    rotation: randomInt(0, 7) * 45,
    snapped: false,
  }));
}

function createScrambledPieceStates(target: TangramTarget): PieceState[] {
  const xs = target.slots.map((s) => s.x);
  const ys = target.slots.map((s) => s.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  const count = target.slots.length;
  const baseRadius = 155;

  // Chia đều 360° thành `count` sector, jitter ngẫu nhiên trong mỗi sector
  const sectorSize = 360 / count;
  const angles = Array.from({ length: count }, (_, i) => {
    const base = i * sectorSize;
    return base + randomInt(10, sectorSize - 10);
  });

  // Shuffle để mảnh nào rơi vào góc nào là ngẫu nhiên
  const shuffledAngles = shuffleArray([...angles]);

  return target.slots.map((slot, i) => {
    const angleDeg = shuffledAngles[i];
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = baseRadius + randomInt(-20, 20);

    const rawX = centerX + r * Math.cos(angleRad);
    const rawY = centerY + r * Math.sin(angleRad);

    // Clamp trong viewBox 520×360
    const x = Math.max(30, Math.min(490, rawX));
    const y = Math.max(25, Math.min(335, rawY));

    return {
      pieceId: slot.pieceId,
      x,
      y,
      rotation: randomInt(0, 7) * 45,
      snapped: false,
    };
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function snapPieceIfClose(
  states: PieceState[],
  pieceId: PieceId,
  target: TangramTarget,
): PieceState[] {
  const piece = states.find((p) => p.pieceId === pieceId);
  if (!piece) return states;

  const group = getInterchangeGroup(pieceId);

  // Tập các slot đang bị chiếm bởi mảnh khác đã snap
  const occupiedSlotPieceIds = new Set(
    states
      .filter((p) => p.snapped && p.pieceId !== pieceId)
      .map((p) => {
        // Tìm slot mà mảnh đó đang snap vào (dựa theo vị trí khớp chính xác)
        const matchedSlot = target.slots.find(
          (s) =>
            getInterchangeGroup(s.pieceId).includes(p.pieceId) &&
            Math.hypot(p.x - s.x, p.y - s.y) < 1,
        );
        return matchedSlot?.pieceId ?? null;
      })
      .filter((id): id is PieceId => id !== null),
  );

  // Tìm slot tốt nhất: cùng nhóm, đủ gần, đúng góc, chưa bị chiếm
  let bestSlot: SlotTransform | null = null;
  let bestDist = Infinity;

  for (const slot of target.slots) {
    if (!group.includes(slot.pieceId)) continue;
    if (occupiedSlotPieceIds.has(slot.pieceId)) continue;

    const dist = Math.hypot(piece.x - slot.x, piece.y - slot.y);
    if (
      dist <= SNAP_DISTANCE &&
      rotationMatches(piece.rotation, slot.rotation, pieceId)
    ) {
      if (dist < bestDist) {
        bestDist = dist;
        bestSlot = slot;
      }
    }
  }

  if (!bestSlot) {
    return states.map((p) =>
      p.pieceId === pieceId ? { ...p, snapped: false } : p,
    );
  }

  const targetSlot = bestSlot;

  // Nếu có mảnh cùng nhóm đang giữ slot này thì unsnap nó ra
  return states.map((p) => {
    if (p.pieceId === pieceId) {
      return {
        ...p,
        x: targetSlot.x,
        y: targetSlot.y,
        rotation: normalizeAngle(targetSlot.rotation),
        snapped: true,
      };
    }
    // Unsnap mảnh khác trong group nếu nó đang ở đúng slot này
    if (
      p.snapped &&
      getInterchangeGroup(p.pieceId).includes(targetSlot.pieceId) &&
      Math.hypot(p.x - targetSlot.x, p.y - targetSlot.y) < 1
    ) {
      return { ...p, snapped: false };
    }
    return p;
  });
}

function areAllPiecesSnapped(
  states: PieceState[],
  target: TangramTarget,
): boolean {
  // Mỗi slot phải được cover bởi đúng 1 mảnh trong cùng nhóm, đã snap, đúng vị trí & góc
  return target.slots.every((slot) => {
    const group = getInterchangeGroup(slot.pieceId);
    return group.some((pid) => {
      const p = states.find((s) => s.pieceId === pid);
      return (
        p?.snapped &&
        Math.hypot(p.x - slot.x, p.y - slot.y) < 1 &&
        rotationMatches(p.rotation, slot.rotation, pid)
      );
    });
  });
}

function encodeAnswer(
  targetId: TangramTarget["id"],
  status: AnswerStatus,
): string {
  return `${targetId}|${status}`;
}

function parseAnswer(value: string): { status: AnswerStatus } {
  const [, statusRaw] = value.split("|");
  return { status: statusRaw === "solved" ? "solved" : "in-progress" };
}

function clientToSvgPoint(
  svg: SVGSVGElement | null,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (!svg) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const t = point.matrixTransform(matrix.inverse());
  return { x: t.x, y: t.y };
}

function normalizeAngle(value: number): number {
  return ((value % 360) + 360) % 360;
}

function angleDifference(a: number, b: number): number {
  const na = normalizeAngle(a),
    nb = normalizeAngle(b);
  return Math.abs(((na - nb + 540) % 360) - 180);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
