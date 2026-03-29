import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const shape3DWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select(
        ["single-choice-4", "multi-select", "net-match"] as const,
        "single-choice-4",
      )
      .label("Dạng bài")
      .description(
        "single-choice-4: chọn 1 trong 4, multi-select: chọn tất cả, net-match: nhận dạng lưới phẳng",
      )
      .random(),

    targetSolid: param
      .select(["cuboid", "cube", "cone", "cylinder"] as const, "cube")
      .label("Khối mục tiêu")
      .description("Khối cần học nhận dạng")
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
      totalItems: param.number(10).label("Tổng số khối").min(6).max(20),

      minTargetCount: param
        .number(2)
        .label("Số khối mục tiêu nhỏ nhất")
        .min(1)
        .max(10),

      maxTargetCount: param
        .number(5)
        .label("Số khối mục tiêu lớn nhất")
        .min(1)
        .max(12),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("multi-select")),

    netSettings: folder("Cài đặt - Lưới phẳng", {
      optionCount: param.number(4).label("Số đáp án").min(3).max(4),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("net-match")),

    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Xuất sắc! Bạn nhận ra khối rất nhanh 🌟")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, cùng xem kỹ các mặt của khối nhé 💪")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (_defaults, { randomInt }) => {
    const solids = ["cuboid", "cube", "cone", "cylinder"] as const;
    return {
      targetSolid: solids[randomInt(0, solids.length - 1)],
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type Shape3DWidgetParams = ExtractParams<typeof shape3DWidgetDefinition>;
export type Shape3DWidgetAnswer = ExtractAnswer<typeof shape3DWidgetDefinition>;
