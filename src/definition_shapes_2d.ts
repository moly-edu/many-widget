import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const shape2DWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select(["single-choice-4", "multi-select"] as const, "single-choice-4")
      .label("Dạng bài")
      .description("single-choice-4: chọn 1 trong 4, multi-select: chọn tất cả")
      .random(),

    targetShape: param
      .select(
        ["triangle", "rectangle", "circle", "square"] as const,
        "triangle",
      )
      .label("Hình mục tiêu")
      .description("Hình cần học nhận dạng")
      .random(),

    customPrompt: param
      .string("")
      .label("Đề bài tùy chỉnh")
      .description("Để trống sẽ dùng đề mặc định theo dạng bài"),

    singleSettings: folder("Cài đặt - Chọn 1 trong 4", {
      shuffleOptions: param.boolean(true).label("Xáo trộn đáp án"),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("single-choice-4")),

    multiSettings: folder("Cài đặt - Chọn nhiều đáp án", {
      totalItems: param.number(12).label("Tổng số hình").min(6).max(24),

      minTargetCount: param
        .number(3)
        .label("Số hình mục tiêu nhỏ nhất")
        .min(1)
        .max(12),

      maxTargetCount: param
        .number(6)
        .label("Số hình mục tiêu lớn nhất")
        .min(1)
        .max(16),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("multi-select")),

    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Chính xác! Bạn nhìn hình rất tốt 🎉")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, cùng quan sát kỹ lại nhé 💪")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (_defaults, { randomInt }) => {
    const shapes = ["triangle", "rectangle", "circle", "square"] as const;
    return {
      targetShape: shapes[randomInt(0, shapes.length - 1)],
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type Shape2DWidgetParams = ExtractParams<typeof shape2DWidgetDefinition>;
export type Shape2DWidgetAnswer = ExtractAnswer<typeof shape2DWidgetDefinition>;
