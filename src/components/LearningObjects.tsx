import { type DragEventHandler } from "react";
import type {
  LearningObjectItem,
  LearningObjectKind,
} from "./learning-objects-data";

interface TokenProps {
  item: LearningObjectItem;
  size?: number;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  className?: string;
}

const TOKEN_SURFACE: Record<LearningObjectKind, string> = {
  apple: "from-rose-50 to-red-100",
  fish: "from-cyan-50 to-sky-100",
  bird: "from-amber-50 to-yellow-100",
  flower: "from-fuchsia-50 to-pink-100",
  car: "from-indigo-50 to-blue-100",
};

export function LearningObjectToken({
  item,
  size = 58,
  draggable = false,
  onDragStart,
  onDragEnd,
  className = "",
}: TokenProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-2xl border border-white bg-linear-to-b ${TOKEN_SURFACE[item.kind]} shadow-sm ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${className}`}
      style={{ width: size, height: size }}
      aria-label={getObjectLabel(item.kind)}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-1">
        {item.kind === "apple" && <AppleSvg />}
        {item.kind === "fish" && <FishSvg />}
        {item.kind === "bird" && <BirdSvg />}
        {item.kind === "flower" && <FlowerSvg />}
        {item.kind === "car" && <CarSvg />}
      </svg>
    </div>
  );
}

function getObjectLabel(kind: LearningObjectKind): string {
  if (kind === "apple") return "Qua tao";
  if (kind === "fish") return "Con ca";
  if (kind === "bird") return "Con chim";
  if (kind === "flower") return "Bong hoa";
  return "Xe";
}

function AppleSvg() {
  return (
    <>
      <ellipse
        cx="50"
        cy="58"
        rx="28"
        ry="26"
        fill="#ef4444"
        stroke="#be123c"
        strokeWidth="4"
      />
      <ellipse cx="36" cy="48" rx="10" ry="8" fill="#fca5a5" opacity="0.7" />
      <path
        d="M50 18 C54 26, 56 30, 56 38"
        fill="none"
        stroke="#7c2d12"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse
        cx="63"
        cy="24"
        rx="10"
        ry="6"
        transform="rotate(24 63 24)"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="3"
      />
    </>
  );
}

function FishSvg() {
  return (
    <>
      <ellipse
        cx="48"
        cy="52"
        rx="30"
        ry="18"
        fill="#06b6d4"
        stroke="#0e7490"
        strokeWidth="4"
      />
      <polygon
        points="72,52 92,38 92,66"
        fill="#0891b2"
        stroke="#0e7490"
        strokeWidth="4"
      />
      <circle cx="38" cy="48" r="4" fill="#0f172a" />
      <path
        d="M22 54 Q34 62 44 54"
        fill="none"
        stroke="#e0f2fe"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M52 40 Q58 46 52 52"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
}

function BirdSvg() {
  return (
    <>
      <ellipse
        cx="48"
        cy="56"
        rx="22"
        ry="18"
        fill="#f59e0b"
        stroke="#b45309"
        strokeWidth="4"
      />
      <circle
        cx="66"
        cy="44"
        r="12"
        fill="#fbbf24"
        stroke="#b45309"
        strokeWidth="4"
      />
      <polygon
        points="78,44 90,48 78,52"
        fill="#f97316"
        stroke="#c2410c"
        strokeWidth="2"
      />
      <circle cx="70" cy="42" r="2.5" fill="#0f172a" />
      <path
        d="M36 58 Q48 38 58 58"
        fill="#fef3c7"
        stroke="#d97706"
        strokeWidth="3"
      />
      <path
        d="M40 72 L36 82 M50 72 L48 82"
        fill="none"
        stroke="#92400e"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
}

function FlowerSvg() {
  return (
    <>
      <ellipse
        cx="50"
        cy="50"
        rx="10"
        ry="10"
        fill="#f59e0b"
        stroke="#b45309"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="30"
        r="12"
        fill="#ec4899"
        stroke="#be185d"
        strokeWidth="3"
      />
      <circle
        cx="68"
        cy="40"
        r="12"
        fill="#f472b6"
        stroke="#be185d"
        strokeWidth="3"
      />
      <circle
        cx="68"
        cy="60"
        r="12"
        fill="#ec4899"
        stroke="#be185d"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="70"
        r="12"
        fill="#f472b6"
        stroke="#be185d"
        strokeWidth="3"
      />
      <circle
        cx="32"
        cy="60"
        r="12"
        fill="#ec4899"
        stroke="#be185d"
        strokeWidth="3"
      />
      <circle
        cx="32"
        cy="40"
        r="12"
        fill="#f472b6"
        stroke="#be185d"
        strokeWidth="3"
      />
      <path
        d="M50 80 L50 97"
        stroke="#16a34a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse
        cx="58"
        cy="88"
        rx="8"
        ry="4"
        transform="rotate(-20 58 88)"
        fill="#22c55e"
      />
    </>
  );
}

function CarSvg() {
  return (
    <>
      <rect
        x="18"
        y="44"
        width="64"
        height="24"
        rx="8"
        fill="#6366f1"
        stroke="#3730a3"
        strokeWidth="4"
      />
      <path
        d="M30 44 L42 30 H62 L72 44"
        fill="#818cf8"
        stroke="#3730a3"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="72" r="8" fill="#1e293b" />
      <circle cx="68" cy="72" r="8" fill="#1e293b" />
      <circle cx="32" cy="72" r="3" fill="#cbd5e1" />
      <circle cx="68" cy="72" r="3" fill="#cbd5e1" />
      <rect
        x="44"
        y="34"
        width="14"
        height="10"
        rx="2"
        fill="#dbeafe"
        stroke="#1e40af"
        strokeWidth="2"
      />
    </>
  );
}
