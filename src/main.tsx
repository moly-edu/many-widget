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
import { additionWidgetDefinition } from "./definition_addition";
import { WidgetComponentAddition } from "./components/WidgetComponent_addition";
import { subtractionWidgetDefinition } from "./definition_subtraction";
import { WidgetComponentSubtraction } from "./components/WidgetComponent_subtraction";

type ActiveWidget =
  | "number-recognition"
  | "even-odd"
  | "shape-2d"
  | "shape-3d"
  | "tangram"
  | "counting-10"
  | "compare-10"
  | "addition-10"
  | "subtraction-10";

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
  envWidget === "addition-10" ||
  envWidget === "subtraction-10"
    ? envWidget
    : "addition-10";

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
} else if (activeWidget === "addition-10") {
  createWidget({
    definition: additionWidgetDefinition,
    component: WidgetComponentAddition,
  });
} else {
  createWidget({
    definition: subtractionWidgetDefinition,
    component: WidgetComponentSubtraction,
  });
}
