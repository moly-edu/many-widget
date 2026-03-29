import {
  defineWidget,
  folder,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

export const compareWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select(["pick-sign", "drag-expression"] as const, "pick-sign")
      .label("Dạng bài")
      .description(
        "pick-sign: điền dấu < > =; drag-expression: kéo từ ô 1 sang ô 2 để thỏa biểu thức",
      )
      .random(),

    leftCount: param
      .number(5)
      .label("Số lượng ô 1")
      .min(0)
      .max(10)
      .visibleIf(when("mode").equals("pick-sign"))
      .random(),

    rightCount: param
      .number(4)
      .label("Số lượng ô 2")
      .min(0)
      .max(10)
      .visibleIf(when("mode").equals("pick-sign"))
      .random(),

    dragGoal: param
      .select(["equal", "left-greater", "left-less"] as const, "equal")
      .label("Biểu thức cần đạt")
      .description(
        "equal: bằng nhau, left-greater: ô 1 nhiều hơn, left-less: ô 1 ít hơn",
      )
      .visibleIf(when("mode").equals("drag-expression"))
      .random(),

    customPrompt: param
      .string("")
      .label("Đề bài tùy chỉnh")
      .description("Để trống sẽ dùng đề mặc định theo dạng bài"),

    feedback: folder("Phản hồi", {
      showFeedback: param.boolean(true).label("Hiển thị phản hồi"),
      feedbackCorrect: param
        .string("Tuyệt vời! Em so sánh đúng rồi 🌟")
        .label("Khi đúng")
        .visibleIf(when("feedback.showFeedback").equals(true)),
      feedbackIncorrect: param
        .string("Chưa đúng, nhìn lại số lượng hai ô nhé 💡")
        .label("Khi sai")
        .visibleIf(when("feedback.showFeedback").equals(true)),
    }).expanded(false),
  },

  deriveDefaults: (defaults, { randomInt }) => {
    if (defaults.mode === "drag-expression") {
      const generated = generateDragSetup(defaults.dragGoal, randomInt);

      return {
        leftCount: generated.leftCount,
        rightCount: generated.rightCount,
      };
    }

    const leftCount = randomInt(0, 10);
    const rightCount = randomInt(0, 10);

    return {
      leftCount,
      rightCount,
    };
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type CompareWidgetParams = ExtractParams<typeof compareWidgetDefinition>;
export type CompareWidgetAnswer = ExtractAnswer<typeof compareWidgetDefinition>;

function generateDragSetup(
  goal: "equal" | "left-greater" | "left-less",
  randomInt: (min: number, max: number) => number,
): { leftCount: number; rightCount: number } {
  if (goal === "equal") {
    const total = randomInt(1, 5) * 2;
    let leftCount = randomInt(0, total);

    // Keep starting state different from the target so learners must interact.
    while (leftCount * 2 === total) {
      leftCount = randomInt(0, total);
    }

    return {
      leftCount,
      rightCount: total - leftCount,
    };
  }

  const total = randomInt(2, 10);
  const targetLeftMin = goal === "left-greater" ? Math.floor(total / 2) + 1 : 0;
  const targetLeftMax = goal === "left-less" ? Math.ceil(total / 2) - 1 : total;

  let leftCount = randomInt(0, total);
  let guard = 0;

  while (
    leftCount >= targetLeftMin &&
    leftCount <= targetLeftMax &&
    guard < 20
  ) {
    leftCount = randomInt(0, total);
    guard += 1;
  }

  return {
    leftCount,
    rightCount: total - leftCount,
  };
}
