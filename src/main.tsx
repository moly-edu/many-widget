import { createWidget } from "@moly-edu/widget-sdk";
import { widgetDefinition } from "./definition";
import { WidgetComponent } from "./components/WidgetComponent";
import { evenOddWidgetDefinition } from "./definition_even_odd";
import { WidgetComponentEvenOdd } from "./components/WidgetComponent_even_odd";
import { shape2DWidgetDefinition } from "./definition_shapes_2d";
import { WidgetComponentShape2D } from "./components/WidgetComponent_shapes_2d";
import { shape3DWidgetDefinition } from "./definition_shapes_3d";
import { WidgetComponentShape3D } from "./components/WidgetComponent_shapes_3d";
import { tangramWidgetDefinition } from "./definition_tangram";
import { WidgetComponentTangram } from "./components/WidgetComponent_tangram";
import { countingWidgetDefinition } from "./definition_counting";
import { WidgetComponentCounting } from "./components/WidgetComponent_counting";
import { compareWidgetDefinition } from "./definition_compare";
import { WidgetComponentCompare } from "./components/WidgetComponent_compare";
import { arithmeticWidgetDefinition } from "./definition_arithmetic";
import { WidgetComponentArithmetic } from "./components/WidgetComponent_arithmetic";
import { arithmeticGapFillWidgetDefinition } from "./definition_arithmetic_gap_fill";
import { WidgetComponentArithmeticGapFill } from "./components/WidgetComponent_arithmetic_gap_fill";
import { arithmeticMatchWidgetDefinition } from "./definition_arithmetic_match";
import { WidgetComponentArithmeticMatch } from "./components/WidgetComponent_arithmetic_match";
import { dragDropCompareWidgetDefinition } from "./definition_drag_drop_compare";
import { WidgetComponentDragDropCompare } from "./components/WidgetComponent_drag_drop_compare";

type ActiveWidget =
  | "number-recognition"
  | "even-odd"
  | "shape-2d"
  | "shape-3d"
  | "tangram"
  | "counting-10"
  | "compare-10"
  | "drag-drop-compare"
  | "arithmetic-1-9"
  | "arithmetic-gap-fill"
  | "arithmetic-match";

// Đổi bằng env khi chạy dev/build, ví dụ: VITE_ACTIVE_WIDGET=tangram
const envWidget = import.meta.env.VITE_ACTIVE_WIDGET;

const activeWidget: ActiveWidget =
  envWidget === "number-recognition" ||
  envWidget === "even-odd" ||
  envWidget === "shape-2d" ||
  envWidget === "shape-3d" ||
  envWidget === "tangram" ||
  envWidget === "counting-10" ||
  envWidget === "compare-10" ||
  envWidget === "drag-drop-compare" ||
  envWidget === "arithmetic-1-9" ||
  envWidget === "arithmetic-gap-fill" ||
  envWidget === "arithmetic-match"
    ? envWidget
    : "drag-drop-compare";

if (activeWidget === "number-recognition") {
  createWidget({
    definition: widgetDefinition,
    component: WidgetComponent,
  });
} else if (activeWidget === "even-odd") {
  createWidget({
    definition: evenOddWidgetDefinition,
    component: WidgetComponentEvenOdd,
  });
} else if (activeWidget === "shape-2d") {
  createWidget({
    definition: shape2DWidgetDefinition,
    component: WidgetComponentShape2D,
  });
} else if (activeWidget === "shape-3d") {
  createWidget({
    definition: shape3DWidgetDefinition,
    component: WidgetComponentShape3D,
  });
} else if (activeWidget === "tangram") {
  createWidget({
    definition: tangramWidgetDefinition,
    component: WidgetComponentTangram,
  });
} else if (activeWidget === "counting-10") {
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
} else if (activeWidget === "arithmetic-match") {
  createWidget({
    definition: arithmeticMatchWidgetDefinition,
    component: WidgetComponentArithmeticMatch,
  });
} else {
  createWidget({
    definition: arithmeticWidgetDefinition,
    component: WidgetComponentArithmetic,
  });
}
