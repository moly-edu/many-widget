import {
  defineWidget,
  param,
  type ExtractAnswer,
  type ExtractParams,
} from "@moly-edu/widget-sdk";

const shapeTypeOptions = [
  "hình chữ nhật",
  "hình vuông",
  "hình tròn",
  "hình tam giác",
] as const;
const sceneModelOptions = [
  "ngôi nhà",
  "ô tô",
  "tàu hỏa",
  "con thuyền",
] as const;

export const geometryCountingWidgetDefinition = defineWidget({
  parameters: {
    targetShape: param
      .select(Array.from(shapeTypeOptions), "hình chữ nhật")
      .label("Loại hình cần đếm")
      .description("Chọn loại hình để học sinh luyện đếm")
      .random(),

    sceneModel: param
      .select(Array.from(sceneModelOptions), "ngôi nhà")
      .label("Mẫu hình hiển thị")
      .description("Chọn mẫu cảnh để hiển thị")
      .random(),
  },

  answer: {
    value: param.string("").label("Đáp án"),
    usedSupports: param.string("").label("Các hỗ trợ đã dùng"),
  },
});

export type GeometryCountingWidgetParams = ExtractParams<
  typeof geometryCountingWidgetDefinition
>;
export type GeometryCountingWidgetAnswer = ExtractAnswer<
  typeof geometryCountingWidgetDefinition
>;
