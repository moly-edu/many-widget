import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const evenOddWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select(
        ["pick-parity", "sort-baskets", "judge-parity"] as const,
        "pick-parity",
      )
      .label("Dạng bài")
      .description(
        "pick-parity: chọn số chẵn/lẻ, sort-baskets: phân loại vào giỏ, judge-parity: đúng/sai nhanh",
      )
      .random(),

    customPrompt: param
      .string("")
      .label("Đề bài tùy chỉnh")
      .description("Để trống sẽ dùng đề bài mặc định theo dạng bài"),

    targetParity: param
      .select(["odd", "even"] as const, "odd")
      .label("Kiểu số mục tiêu")
      .description("Dùng cho dạng chọn tất cả")
      .visibleIf(when("mode").equals("pick-parity"))
      .random(),

    // Phạm vi mặc định: 0..10
    numberMin: param.number(0).label("Số nhỏ nhất").min(0).max(10),
    numberMax: param.number(10).label("Số lớn nhất").min(0).max(10),

    pickSettings: folder("Cài đặt - Dạng 1", {
      totalNumbers: param.number(12).label("Tổng số ô").min(6).max(24),

      minTargetCount: param
        .number(3)
        .label("Số mục tiêu nhỏ nhất")
        .min(1)
        .max(12),

      maxTargetCount: param
        .number(6)
        .label("Số mục tiêu lớn nhất")
        .min(1)
        .max(16),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("pick-parity")),

    sortSettings: folder("Cài đặt - Dạng 2", {
      totalNumbers: param
        .number(8)
        .label("Số lượng thẻ cần phân loại")
        .min(4)
        .max(10),

      uniqueNumbers: param
        .boolean(true)
        .label("Không lặp số")
        .description("Bật để mỗi thẻ là một số khác nhau"),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("sort-baskets")),

    judgeSettings: folder("Cài đặt - Dạng 3", {
      totalRoundsHint: param
        .number(1)
        .label("Số câu mỗi lượt")
        .description("Hiện tại mỗi lượt chỉ có 1 câu hỏi nhanh")
        .min(1)
        .max(1),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("judge-parity")),

    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Giỏi lắm! Bạn phân biệt đúng rồi 🎉")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, thử lại nhé 💪")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (defaults, { randomInt }) => {
    const min = Math.min(defaults.numberMin, defaults.numberMax);
    const max = Math.max(defaults.numberMin, defaults.numberMax);

    return {
      targetParity: randomInt(0, 1) === 0 ? "odd" : "even",
      numberMin: min,
      numberMax: max,
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type EvenOddWidgetParams = ExtractParams<typeof evenOddWidgetDefinition>;
export type EvenOddWidgetAnswer = ExtractAnswer<typeof evenOddWidgetDefinition>;
