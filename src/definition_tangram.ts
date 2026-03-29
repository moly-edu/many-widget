import {
  defineWidget,
  param,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const tangramWidgetDefinition = defineWidget({
  parameters: {},

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type TangramWidgetParams = ExtractParams<typeof tangramWidgetDefinition>;
export type TangramWidgetAnswer = ExtractAnswer<typeof tangramWidgetDefinition>;
