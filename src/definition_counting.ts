import {
  defineWidget,
  param,
  when,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

const countingModes = [
  "Hiển thị số lượng ảnh",
  "Hiển thị 1 ảnh có số",
  "Hiển thị chữ xong đánh vần",
  "Đếm số có 2 chữ số (phạm vi 100)",
];

const oneToNineOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const countingWidgetDefinition = defineWidget({
  parameters: {
    mode: param
      .select(countingModes, "Hiển thị số lượng ảnh")
      .label("Dạng bài")
      .description(
        "Mode 1: hiển thị nhiều ảnh; Mode 2: hiển thị nhiều thẻ số; Mode 3: hiển thị chữ của một số",
      )
      .random(),

    objectCount: param
      .number(6)
      .label("Số lượng hiển thị")
      .min(1)
      .max(10)
      .random()
      .visibleIf(
        when("mode").in(["Hiển thị số lượng ảnh", "Hiển thị 1 ảnh có số"]),
      ),

    imageUrl: param
      .string("https://picsum.photos/536/354")
      .label("Ảnh minh họa")
      .description("URL ảnh dùng để lặp theo số lượng")
      .visibleIf(when("mode").equals("Hiển thị số lượng ảnh")),

    numberToken: param
      .select(oneToNineOptions, "3")
      .label("Chữ số hiển thị")
      .description("Chọn chữ số từ 1 đến 9 để hiển thị lặp lại")
      .visibleIf(when("mode").equals("Hiển thị 1 ảnh có số")),

    spellingNumber: param
      .select(oneToNineOptions, "5")
      .label("Số hiển thị dạng chữ")
      .description("Chọn số từ 1 đến 9 để hiển thị dạng chữ")
      .visibleIf(when("mode").equals("Hiển thị chữ xong đánh vần")),

    twoDigitNumber: param
      .number(24)
      .label("Số có 2 chữ số")
      .description(
        "Số dùng để mô phỏng bằng các khối ở hàng chục và hàng đơn vị",
      )
      .min(10)
      .max(99)
      .visibleIf(when("mode").equals("Đếm số có 2 chữ số (phạm vi 100)")),
  },

  answer: {
    value: param.string("").label("Đáp án"),
    usedSupports: param.string("").label("Các hỗ trợ đã dùng"),
  },
});

export type CountingWidgetParams = ExtractParams<
  typeof countingWidgetDefinition
>;
export type CountingWidgetAnswer = ExtractAnswer<
  typeof countingWidgetDefinition
>;
