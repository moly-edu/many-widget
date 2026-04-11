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
    // ---- Chọn dạng bài ----
    mode: param
      .select(
        ["find-one", "select-all-ones", "count-ones", "judge-count"] as const,
        "find-one",
      )
      .label("Dạng bài")
      .description(
        "find-one: tìm 1 số, select-all-ones: chọn tất cả số mục tiêu, count-ones: đếm số lượng, judge-count: đúng/sai",
      )
      .random(),

    difficulty: param
      .select(["easy", "medium", "hard"] as const, "medium")
      .label("Độ khó")
      .description(
        "Host sẽ đồng bộ 2 chiều giữa độ khó và các tham số chi tiết để test trước khi tích hợp DB.",
      ),

    // ---- Chung cho mọi dạng ----
    targetNumber: param
      .number(1)
      .label("Số mục tiêu")
      .description("Nên để random để luyện nhận dạng số từ 1 đến 9")
      .min(1)
      .max(9)
      // .minFrom("boardNumberMin")
      // .maxFrom("boardNumberMax")
      .random(),

    customPrompt: param
      .string("")
      .label("Đề bài tùy chỉnh")
      .description("Để trống sẽ dùng đề bài mặc định theo dạng bài"),

    boardNumberMin: param
      .number(1)
      .label("Số nhỏ nhất trong bảng")
      .min(1)
      .max(9)
      .maxFrom("boardNumberMax"),
    boardNumberMax: param
      .number(9)
      .label("Số lớn nhất trong bảng")
      .min(1)
      .max(9)
      .minFrom("boardNumberMin"),

    // ---- Dạng 1: Đâu là số mục tiêu ----
    findOneSettings: folder("Cài đặt - Dạng 1", {
      distractorCount: param
        .number(3)
        .label("Số lượng đáp án gây nhiễu")
        .min(1)
        .max(8),

      shuffleOptions: param.boolean(true).label("Xáo trộn đáp án"),

      enableTimePressure: param.boolean(false).label("Bật áp lực thời gian"),

      optionStyle: param
        .select(["classic", "mixed", "camouflage", "noisy"] as const, "mixed")
        .label("Kiểu đáp án")
        .description(
          "classic: dễ phân biệt, mixed/camouflage/noisy: nhiễu tăng dần",
        ),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("find-one")),

    // ---- Dạng 2: Chọn tất cả số mục tiêu ----
    selectAllSettings: folder("Cài đặt - Dạng 2", {
      totalDigits: param
        .number(14)
        .label("Tổng số ký tự trong bảng")
        .min(6)
        .max(30),

      minTargetCount: param
        .number(2)
        .label("Số mục tiêu nhỏ nhất")
        .min(1)
        .max(10),

      maxTargetCount: param
        .number(5)
        .label("Số mục tiêu lớn nhất")
        .min(1)
        .max(12),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("select-all-ones")),

    // ---- Dạng 3: Đếm số mục tiêu ----
    countSettings: folder("Cài đặt - Dạng 3", {
      totalDigits: param
        .number(15)
        .label("Tổng số ký tự trong bảng")
        .min(6)
        .max(30),

      minTargetCount: param
        .number(2)
        .label("Số mục tiêu nhỏ nhất")
        .min(1)
        .max(10),

      maxTargetCount: param
        .number(6)
        .label("Số mục tiêu lớn nhất")
        .min(1)
        .max(12),

      showPlaceholder: param.boolean(true).label("Hiện placeholder"),
      placeholder: param
        .string("Nhập số lượng...")
        .label("Placeholder")
        .visibleIf(when("countSettings.showPlaceholder").equals(true)),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("count-ones")),

    // ---- Dạng 4: Đúng/Sai số lượng (sáng tạo thêm) ----
    judgeSettings: folder("Cài đặt - Dạng 4", {
      totalDigits: param
        .number(12)
        .label("Tổng số ký tự trong bảng")
        .min(6)
        .max(30),

      minTargetCount: param
        .number(2)
        .label("Số mục tiêu nhỏ nhất")
        .min(1)
        .max(10),

      maxTargetCount: param
        .number(6)
        .label("Số mục tiêu lớn nhất")
        .min(1)
        .max(12),

      maxOffset: param
        .number(2)
        .label("Sai lệch tối đa của mệnh đề")
        .description("Dùng khi tạo mệnh đề sai")
        .min(1)
        .max(4),
    })
      .expanded(false)
      .visibleIf(when("mode").equals("judge-count")),

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
    const min = Math.min(defaults.boardNumberMin, defaults.boardNumberMax);
    const max = Math.max(defaults.boardNumberMin, defaults.boardNumberMax);
    return {
      targetNumber: randomInt(min, max),
    };
  },

  difficultySync: {
    difficultyPath: "difficulty",
    rules: [
      {
        when: when("mode").equals("find-one"),
        dimensions: [
          {
            path: "findOneSettings.distractorCount",
            weight: 1,
            levels: {
              easy: { min: 1, max: 2, preset: 2 },
              medium: { min: 3, max: 5, preset: 4 },
              hard: { min: 6, max: 8, preset: 7 },
            },
          },
          {
            path: "findOneSettings.enableTimePressure",
            weight: 0.4,
            levels: {
              easy: { type: "boolean", equals: false, preset: false },
              medium: { type: "boolean", equals: true, preset: true },
              hard: { type: "boolean", equals: true, preset: true },
            },
          },
          {
            path: "findOneSettings.optionStyle",
            weight: 0.6,
            levels: {
              easy: { type: "select", in: [] },
              medium: { type: "select", in: ["classic"], preset: "classic" },
              hard: {
                type: "select",
                in: ["mixed", "camouflage", "noisy"],
                preset: "mixed",
              },
            },
          },
        ],
      },
      {
        when: when("mode").equals("select-all-ones"),
        dimensions: [
          {
            path: "selectAllSettings.totalDigits",
            weight: 0.5,
            levels: {
              easy: { min: 6, max: 12, preset: 10 },
              medium: { min: 13, max: 20, preset: 16 },
              hard: { min: 21, max: 30, preset: 24 },
            },
          },
          {
            path: "selectAllSettings.minTargetCount",
            weight: 0.2,
            levels: {
              easy: { min: 1, max: 2, preset: 1 },
              medium: { min: 3, max: 5, preset: 3 },
              hard: { min: 6, max: 10, preset: 6 },
            },
          },
          {
            path: "selectAllSettings.maxTargetCount",
            weight: 0.3,
            levels: {
              easy: { min: 2, max: 4, preset: 3 },
              medium: { min: 5, max: 8, preset: 6 },
              hard: { min: 9, max: 12, preset: 9 },
            },
          },
        ],
      },
      {
        when: when("mode").equals("count-ones"),
        dimensions: [
          {
            path: "countSettings.totalDigits",
            weight: 0.5,
            levels: {
              easy: { min: 6, max: 12, preset: 10 },
              medium: { min: 13, max: 20, preset: 16 },
              hard: { min: 21, max: 30, preset: 24 },
            },
          },
          {
            path: "countSettings.minTargetCount",
            weight: 0.2,
            levels: {
              easy: { min: 1, max: 2, preset: 1 },
              medium: { min: 3, max: 5, preset: 3 },
              hard: { min: 6, max: 10, preset: 6 },
            },
          },
          {
            path: "countSettings.maxTargetCount",
            weight: 0.3,
            levels: {
              easy: { min: 2, max: 4, preset: 3 },
              medium: { min: 5, max: 8, preset: 6 },
              hard: { min: 9, max: 12, preset: 9 },
            },
          },
        ],
      },
      {
        when: when("mode").equals("judge-count"),
        dimensions: [
          {
            path: "judgeSettings.totalDigits",
            weight: 0.5,
            levels: {
              easy: { min: 6, max: 12, preset: 10 },
              medium: { min: 13, max: 20, preset: 16 },
              hard: { min: 21, max: 30, preset: 24 },
            },
          },
          {
            path: "judgeSettings.minTargetCount",
            weight: 0.2,
            levels: {
              easy: { min: 1, max: 2, preset: 1 },
              medium: { min: 3, max: 5, preset: 3 },
              hard: { min: 6, max: 10, preset: 6 },
            },
          },
          {
            path: "judgeSettings.maxTargetCount",
            weight: 0.3,
            levels: {
              easy: { min: 2, max: 4, preset: 3 },
              medium: { min: 5, max: 8, preset: 6 },
              hard: { min: 9, max: 12, preset: 9 },
            },
          },
        ],
      },
    ],
  },

  answer: {
    value: param.string("").label("Đáp án"),
  },
});

export type WidgetParams = ExtractParams<typeof widgetDefinition>;
export type WidgetAnswer = ExtractAnswer<typeof widgetDefinition>;
