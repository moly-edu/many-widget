import { createWidget } from "@moly-edu/widget-sdk";
import { countingWidgetDefinition } from "./definition_counting";
import { WidgetComponentCounting } from "./components/WidgetComponent_counting";
import { compareWidgetDefinition } from "./definition_compare";
import { WidgetComponentCompare } from "./components/WidgetComponent_compare";
import { arithmeticWidgetDefinition } from "./definition_arithmetic";
import { WidgetComponentArithmetic } from "./components/WidgetComponent_arithmetic";
import { arithmetic99WidgetDefinition } from "./definition_arithmetic_99";
import { WidgetComponentArithmetic99 } from "./components/WidgetComponent_arithmetic_99";
import { arithmeticGapFillWidgetDefinition } from "./definition_arithmetic_gap_fill";
import { WidgetComponentArithmeticGapFill } from "./components/WidgetComponent_arithmetic_gap_fill";
import { arithmeticMatchWidgetDefinition } from "./definition_arithmetic_match";
import { WidgetComponentArithmeticMatch } from "./components/WidgetComponent_arithmetic_match";
import { dragDropCompareWidgetDefinition } from "./definition_drag_drop_compare";
import { WidgetComponentDragDropCompare } from "./components/WidgetComponent_drag_drop_compare";
import { geometryCountingWidgetDefinition } from "./definition_geometry_counting";
import { WidgetComponentGeometryCounting } from "./components/WidgetComponent_geometry_counting";

type ActiveWidget =
  | "counting-10"
  | "compare-10"
  | "drag-drop-compare"
  | "arithmetic-1-9"
  | "arithmetic-99"
  | "arithmetic-gap-fill"
  | "arithmetic-match"
  | "geometry-counting";

// Đổi bằng env khi chạy dev/build, ví dụ: VITE_ACTIVE_WIDGET=tangram
const envWidget = import.meta.env.VITE_ACTIVE_WIDGET;

const activeWidget: ActiveWidget =
  envWidget === "counting-10" ||
  envWidget === "compare-10" ||
  envWidget === "drag-drop-compare" ||
  envWidget === "arithmetic-1-9" ||
  envWidget === "arithmetic-99" ||
  envWidget === "arithmetic-gap-fill" ||
  envWidget === "arithmetic-match" ||
  envWidget === "geometry-counting"
    ? envWidget
    : "arithmetic-99";

if (activeWidget === "counting-10") {
  createWidget({
    definition: countingWidgetDefinition,
    component: WidgetComponentCounting,
  });
} else if (activeWidget === "compare-10") {
  createWidget({
    definition: compareWidgetDefinition,
    component: WidgetComponentCompare,
  });
} else if (activeWidget === "drag-drop-compare") {
  createWidget({
    definition: dragDropCompareWidgetDefinition,
    component: WidgetComponentDragDropCompare,
  });
} else if (activeWidget === "arithmetic-gap-fill") {
  createWidget({
    definition: arithmeticGapFillWidgetDefinition,
    component: WidgetComponentArithmeticGapFill,
  });
} else if (activeWidget === "arithmetic-99") {
  createWidget({
    definition: arithmetic99WidgetDefinition,
    component: WidgetComponentArithmetic99,
  });
} else if (activeWidget === "arithmetic-match") {
  createWidget({
    definition: arithmeticMatchWidgetDefinition,
    component: WidgetComponentArithmeticMatch,
  });
} else if (activeWidget === "geometry-counting") {
  createWidget({
    definition: geometryCountingWidgetDefinition,
    component: WidgetComponentGeometryCounting,
  });
} else {
  createWidget({
    definition: arithmeticWidgetDefinition,
    component: WidgetComponentArithmetic,
  });
}
