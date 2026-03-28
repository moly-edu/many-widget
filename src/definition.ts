import {
  defineWidget,
  param,
  folder,
  when,
  type ExtractParams,
  type ExtractAnswer,
} from "@moly-edu/widget-sdk";

export const widgetDefinition = defineWidget({
  parameters: {
    // ---- Mode switch ----
    mode: param
      .select(["fill", "choice"] as const, "fill")
      .label("Giao diện")
      .description("fill = Điền đáp án, choice = Chọn đáp án")
      .random(),

    // ---- Chung cho cả 2 mode ----
    question: param.string("Tính kết quả phép cộng sau:").label("Đề bài"),

    num1: param.number(0).label("Số thứ nhất").min(1).max(999).random(),
    num2: param.number(0).label("Số thứ hai").min(1).max(999).random(),

    // ---- Riêng mode FILL ----
    fillSettings: folder("Cài đặt - Điền đáp án", {
      showPlaceholder: param.boolean(true).label("Hiện placeholder"),
      placeholder: param
        .string("Nhập đáp án...")
        .label("Placeholder")
        .visibleIf(when("fillSettings.showPlaceholder").equals(true)),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("fill")),

    // ---- Riêng mode CHOICE ----
    choiceSettings: folder("Cài đặt - Chọn đáp án", {
      numberOfOptions: param.number(4).label("Số lượng đáp án").min(2).max(6),
      shuffleOptions: param.boolean(true).label("Xáo trộn đáp án"),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("choice")),

    // ---- Phản hồi ----
    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Chính xác! 🎉")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, thử lại nhé! 💪")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (defaults, { randomInt }) => {
    const max = defaults.mode === "choice" ? 50 : 200;
    return {
      num1: randomInt(1, max),
      num2: randomInt(1, max),
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type WidgetParams = ExtractParams<typeof widgetDefinition>;
export type WidgetAnswer = ExtractAnswer<typeof widgetDefinition>;
