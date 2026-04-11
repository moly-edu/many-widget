import {
  defineWidget,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const arithmeticGapFillWidgetDefinition = defineWidget({
  parameters: {
    operation: param
      .select(["phép cộng", "phép trừ"] as const, "phép cộng")
      .label("Phép tính")
      .description("add: phép cộng, subtract: phép trừ")
      .random(),

    addFirstNumber: param
      .number(4)
      .label("Số thứ nhất")
      .min(1)
      .max(10)
      .visibleIf(when("operation").equals("phép cộng")),

    addSecondNumber: param
      .number(5)
      .label("Số thứ hai")
      .min(1)
      .max(9)
      .visibleIf(when("operation").equals("phép cộng")),

    numberMax: param
      .number(9)
      .label("Số thứ nhất")
      .min(1)
      .max(10)
      .minFrom("numberMin")
      .visibleIf(when("operation").equals("phép trừ")),

    numberMin: param
      .number(1)
      .label("Số thứ hai")
      .min(1)
      .max(9)
      .maxFrom("numberMax")
      .visibleIf(when("operation").equals("phép trừ")),

    firstImageUrl: param
      .string("https://picsum.photos/536/354")
      .label("Ảnh minh họa số thứ nhất")
      .description("URL ảnh dùng để lặp theo số lượng của số thứ nhất"),

    secondImageUrl: param
      .string("https://picsum.photos/536/358")
      .label("Ảnh minh họa số thứ hai")
      .description("URL ảnh dùng để lặp theo số lượng của số thứ hai"),
  },

  answer: {
    value: param.string("").label("Đáp án"),
    usedSupports: param.string("").label("Các hỗ trợ đã dùng"),
  },
});

export type ArithmeticGapFillWidgetParams = ExtractParams<
  typeof arithmeticGapFillWidgetDefinition
>;
export type ArithmeticGapFillWidgetAnswer = ExtractAnswer<
  typeof arithmeticGapFillWidgetDefinition
>;
