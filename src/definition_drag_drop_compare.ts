import {
  defineWidget,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

const MODE_NORMAL = "Kéo thả ảnh bình thường";
const MODE_COMPARE = "Kéo thả có so sánh";

export const dragDropCompareWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select([MODE_NORMAL, MODE_COMPARE] as const, MODE_NORMAL)
      .label("Dạng bài")
      .description(
        "Kéo số lượng ảnh yêu cầu hoặc kéo để hai ô thỏa dấu so sánh",
      )
      .random(),

    normalTotalCount: param
      .number(9)
      .label("Tổng số ảnh ban đầu ở ô 1")
      .min(1)
      .max(9)
      .visibleIf(when("mode").equals(MODE_NORMAL)),

    normalMoveCount: param
      .number(3)
      .label("Số ảnh cần kéo sang ô 2")
      .min(1)
      .max(9)
      .maxFrom("normalTotalCount")
      .visibleIf(when("mode").equals(MODE_NORMAL)),

    compareSign: param
      .select([">", "<", "="] as const, ">")
      .label("Dấu so sánh")
      .description(">: ô 1 lớn hơn ô 2, <: ô 1 nhỏ hơn ô 2, =: hai ô bằng nhau")
      .visibleIf(when("mode").equals(MODE_COMPARE)),

    compareMinMoveCount: param
      .number(3)
      .label("Số lượng cần kéo ít nhất")
      .description("Số lượng kéo tối thiểu để thỏa mãn dấu so sánh")
      .min(1)
      .max(4)
      .visibleIf(when("mode").equals(MODE_COMPARE)),

    imageUrl: param
      .string("https://picsum.photos/seed/drag-shared/96/96")
      .label("Ảnh minh họa")
      .description("URL ảnh dùng chung để lặp trong cả 2 ô"),

    scenarioSeed: param
      .number(1)
      .hidden()
      .random(({ randomInt }) => randomInt(1, 9999)),
  },

  answer: {
    value: param.string("").label("Trạng thái kéo thả"),
  },
});

export type DragDropCompareWidgetParams = ExtractParams<
  typeof dragDropCompareWidgetDefinition
>;
export type DragDropCompareWidgetAnswer = ExtractAnswer<
  typeof dragDropCompareWidgetDefinition
>;
