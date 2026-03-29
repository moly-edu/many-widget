import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const countingWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select(["count-choice", "drag-to-target"] as const, "count-choice")
      .label("Dạng bài")
      .description(
        "count-choice: đếm và chọn đáp án; drag-to-target: kéo thả đủ số lượng sang ô mục tiêu",
      )
      .random(),

    objectCount: param
      .number(6)
      .label("Số lượng đồ vật")
      .min(1)
      .max(10)
      .random(),

    targetMoveCount: param
      .number(3)
      .label("Số đồ vật cần kéo")
      .min(1)
      .max(10)
      .visibleIf(when("mode").equals("drag-to-target")),

    customPrompt: param
      .string("")
      .label("Đề bài tùy chỉnh")
      .description("Để trống sẽ dùng đề mặc định theo dạng bài"),

    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Chính xác! Em đếm rất tốt 🎉")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, em đếm lại thật chậm nhé 💪")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (_defaults, { randomInt }) => {
    const objectCount = randomInt(2, 10);

    return {
      objectCount,
      targetMoveCount: randomInt(1, objectCount),
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type CountingWidgetParams = ExtractParams<
  typeof countingWidgetDefinition
>;
export type CountingWidgetAnswer = ExtractAnswer<
  typeof countingWidgetDefinition
>;
