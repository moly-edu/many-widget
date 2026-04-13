import {
  defineWidget,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const arithmetic99WidgetDefinition = defineWidget({
  parameters: {
    operation: param
      .select(["phép cộng", "phép trừ"] as const, "phép cộng")
      .label("Phép tính")
      .description("add: phép cộng, subtract: phép trừ")
      .random(),

    layout: param
      .select(["cột dọc", "hàng ngang"] as const, "cột dọc")
      .label("Kiểu hiển thị phép tính"),

    addFirstTens: param
      .number(1)
      .label("Cộng - hàng chục số thứ nhất")
      .min(1)
      .max(9)
      .visibleIf(when("operation").equals("phép cộng")),

    addFirstUnits: param
      .number(5)
      .label("Cộng - hàng đơn vị số thứ nhất")
      .min(0)
      .max(9)
      .visibleIf(when("operation").equals("phép cộng")),

    addResultTens: param
      .number(3)
      .label("Cộng - hàng chục của tổng")
      .min(1)
      .max(9)
      .minFrom("addFirstTens")
      .visibleIf(when("operation").equals("phép cộng")),

    addResultUnits: param
      .number(8)
      .label("Cộng - hàng đơn vị của tổng")
      .min(0)
      .max(9)
      .minFrom("addFirstUnits")
      .visibleIf(when("operation").equals("phép cộng")),

    subFirstTens: param
      .number(8)
      .label("Trừ - hàng chục số thứ nhất")
      .min(1)
      .max(9)
      .visibleIf(when("operation").equals("phép trừ")),

    subFirstUnits: param
      .number(7)
      .label("Trừ - hàng đơn vị số thứ nhất")
      .min(0)
      .max(9)
      .visibleIf(when("operation").equals("phép trừ")),

    subSecondTens: param
      .number(3)
      .label("Trừ - hàng chục số thứ hai")
      .min(0)
      .max(9)
      .maxFrom("subFirstTens")
      .visibleIf(when("operation").equals("phép trừ")),

    subSecondUnits: param
      .number(4)
      .label("Trừ - hàng đơn vị số thứ hai")
      .min(0)
      .max(9)
      .maxFrom("subFirstUnits")
      .visibleIf(when("operation").equals("phép trừ")),
  },

  answer: {
    value: param.string("").label("Đáp án"),
    usedSupports: param.string("").label("Các hỗ trợ đã dùng"),
  },
});

export type Arithmetic99WidgetParams = ExtractParams<
  typeof arithmetic99WidgetDefinition
>;
export type Arithmetic99WidgetAnswer = ExtractAnswer<
  typeof arithmetic99WidgetDefinition
>;
