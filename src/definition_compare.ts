import {
  defineWidget,
  param,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const compareWidgetDefinition = defineWidget({
  parameters: {
    leftCount: param.number(5).label("Số lượng ô 1").min(1).max(9),

    rightCount: param.number(4).label("Số lượng ô 2").min(1).max(9),

    leftImageUrl: param
      .string("https://picsum.photos/seed/compare-left/96/96")
      .label("Ảnh minh họa ô trái")
      .description("URL ảnh dùng để lặp theo số lượng ở ô bên trái"),

    rightImageUrl: param
      .string("https://picsum.photos/seed/compare-right/96/96")
      .label("Ảnh minh họa ô phải")
      .description("URL ảnh dùng để lặp theo số lượng ở ô bên phải"),
  },

  deriveDefaults: (_, { randomInt }) => {
    const leftCount = randomInt(1, 9);
    const rightCount = randomInt(1, 9);

    return {
      leftCount,
      rightCount,
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
    usedSupports: param.string("").label("Các hỗ trợ đã dùng"),
  },
});

export type CompareWidgetParams = ExtractParams<typeof compareWidgetDefinition>;
export type CompareWidgetAnswer = ExtractAnswer<typeof compareWidgetDefinition>;
