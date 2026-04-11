import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

function createExpressionFolder(
  label: string,
  rootPath: string,
  defaultImageUrl: string,
) {
  return folder(label, {
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
      .random()
      .visibleIf(when(`${rootPath}.operation`).equals("phép cộng")),

    addSecondNumber: param
      .number(5)
      .label("Số thứ hai")
      .min(1)
      .max(9)
      .random()
      .visibleIf(when(`${rootPath}.operation`).equals("phép cộng")),

    numberMax: param
      .number(9)
      .label("Số thứ nhất")
      .min(1)
      .max(10)
      .minFrom(`${rootPath}.numberMin`)
      .visibleIf(when(`${rootPath}.operation`).equals("phép trừ")),

    numberMin: param
      .number(1)
      .label("Số thứ hai")
      .min(1)
      .max(9)
      .maxFrom(`${rootPath}.numberMax`)
      .visibleIf(when(`${rootPath}.operation`).equals("phép trừ")),

    imageUrl: param
      .string(defaultImageUrl)
      .label("Ảnh nền")
      .description("URL ảnh nền cho ô phép tính"),
  }).expanded(false);
}

function normalizeSubtractionRange(settings: {
  numberMin: number;
  numberMax: number;
}) {
  const min = Math.min(settings.numberMin, settings.numberMax);
  const max = Math.max(settings.numberMin, settings.numberMax);
  return {
    numberMin: min,
    numberMax: max,
  };
}

export const arithmeticMatchWidgetDefinition = defineWidget({
  parameters: {
    expressionCount: param
      .number(3)
      .label("Số lượng phép tính")
      .description("Chọn từ 2 đến 6 phép tính")
      .min(2)
      .max(6),

    expression1: createExpressionFolder(
      "Phép tính 1",
      "expression1",
      "https://picsum.photos/536/354",
    ),

    expression2: createExpressionFolder(
      "Phép tính 2",
      "expression2",
      "https://picsum.photos/536/355",
    ),

    expression3: createExpressionFolder(
      "Phép tính 3",
      "expression3",
      "https://picsum.photos/536/356",
    ).visibleIf(when("expressionCount").gte(3)),

    expression4: createExpressionFolder(
      "Phép tính 4",
      "expression4",
      "https://picsum.photos/536/357",
    ).visibleIf(when("expressionCount").gte(4)),

    expression5: createExpressionFolder(
      "Phép tính 5",
      "expression5",
      "https://picsum.photos/536/358",
    ).visibleIf(when("expressionCount").gte(5)),

    expression6: createExpressionFolder(
      "Phép tính 6",
      "expression6",
      "https://picsum.photos/536/359",
    ).visibleIf(when("expressionCount").gte(6)),
  },

  deriveDefaults: (defaults) => ({
    expressionCount: Math.max(2, Math.min(6, defaults.expressionCount)),
    expression1: {
      ...defaults.expression1,
      imageUrl:
        defaults.expression1.imageUrl || "https://picsum.photos/536/354",
      ...normalizeSubtractionRange(defaults.expression1),
    },
    expression2: {
      ...defaults.expression2,
      imageUrl:
        defaults.expression2.imageUrl || "https://picsum.photos/536/355",
      ...normalizeSubtractionRange(defaults.expression2),
    },
    expression3: {
      ...defaults.expression3,
      imageUrl:
        defaults.expression3.imageUrl || "https://picsum.photos/536/356",
      ...normalizeSubtractionRange(defaults.expression3),
    },
    expression4: {
      ...defaults.expression4,
      imageUrl:
        defaults.expression4.imageUrl || "https://picsum.photos/536/357",
      ...normalizeSubtractionRange(defaults.expression4),
    },
    expression5: {
      ...defaults.expression5,
      imageUrl:
        defaults.expression5.imageUrl || "https://picsum.photos/536/358",
      ...normalizeSubtractionRange(defaults.expression5),
    },
    expression6: {
      ...defaults.expression6,
      imageUrl:
        defaults.expression6.imageUrl || "https://picsum.photos/536/359",
      ...normalizeSubtractionRange(defaults.expression6),
    },
  }),

  answer: {
    value: param.string("").label("Ghép phép tính - đáp án"),
    usedSupports: param.string("").label("Hỗ trợ đã dùng"),
  },
});

export type ArithmeticMatchWidgetParams = ExtractParams<
  typeof arithmeticMatchWidgetDefinition
>;
export type ArithmeticMatchWidgetAnswer = ExtractAnswer<
  typeof arithmeticMatchWidgetDefinition
>;
