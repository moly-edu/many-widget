import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const subtractionWidgetDefinition = defineWidget({
  parameters: {
    totalCount: param
      .number(8)
      .label("Số lượng ban đầu")
      .min(0)
      .max(10)
      .random(),

    takeAwayCount: param
      .number(3)
      .label("Số lượng bớt đi")
      .min(0)
      .max(10)
      .random(),

    customPrompt: param
      .string("")
      .label("Đề bài tùy chỉnh")
      .description("Để trống sẽ dùng đề mặc định"),

    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Chính xác! Em trừ rất tốt 🎯")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, thử đếm lại số còn lại nhé 💪")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (_defaults, { randomInt }) => {
    const totalCount = randomInt(1, 10);

    return {
      totalCount,
      takeAwayCount: randomInt(0, totalCount),
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type SubtractionWidgetParams = ExtractParams<
  typeof subtractionWidgetDefinition
>;
export type SubtractionWidgetAnswer = ExtractAnswer<
  typeof subtractionWidgetDefinition
>;
