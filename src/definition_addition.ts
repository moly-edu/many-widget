import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const additionWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select(["object-addition", "balance-scale"] as const, "object-addition")
      .label("Dạng bài")
      .description(
        "object-addition: cộng bằng 2 nhóm đồ vật, balance-scale: cân bằng quả cân",
      )
      .random(),

    leftCount: param
      .number(3)
      .label("Số lượng nhóm 1")
      .min(0)
      .max(10)
      .visibleIf(when("mode").equals("object-addition"))
      .random(),

    rightCount: param
      .number(2)
      .label("Số lượng nhóm 2")
      .min(0)
      .max(10)
      .visibleIf(when("mode").equals("object-addition"))
      .random(),

    target: param
      .number(10)
      .label("Trọng lượng cần đạt (kg)")
      .description("Dùng cho dạng cân bằng")
      .min(1)
      .max(20)
      .visibleIf(when("mode").equals("balance-scale"))
      .random(),

    customPrompt: param
      .string("")
      .label("Đề bài tùy chỉnh")
      .description("Để trống sẽ dùng đề mặc định"),

    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Đúng rồi! Em cộng rất nhanh 🎉")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, thử đếm lại cả hai nhóm nhé ✨")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (defaults, { randomInt }) => {
    if (defaults.mode === "balance-scale") {
      return {
        target: randomInt(2, 20),
      };
    }

    const leftCount = randomInt(0, 10);
    const rightCount = randomInt(0, 10 - leftCount);

    return {
      leftCount,
      rightCount,
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type AdditionWidgetParams = ExtractParams<
  typeof additionWidgetDefinition
>;
export type AdditionWidgetAnswer = ExtractAnswer<
  typeof additionWidgetDefinition
>;
