import "../index.css";

import {
  Speak,
  VoiceNumberInput,
  WidgetRuntime,
  useSubmission,
  useWidgetParams,
} from "@moly-edu/widget-sdk";
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type {
  Arithmetic99WidgetAnswer,
  Arithmetic99WidgetParams,
} from "../definition_arithmetic_99";

type SubmissionResult = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} | null;

type SupportMode = "none" | "column";
type Type2SupportMode = "sticks" | "lego" | "number-table" | "number-line";
type SupportModalStep = "root" | "type2-list" | "type2-preview";
type AnswerMethod = "voice" | "input" | "choice";
type UsedSupport = "column" | "read-prompt" | "read-result" | Type2SupportMode;
type Operation = "phép cộng" | "phép trừ";
type LayoutMode = "cột dọc" | "hàng ngang";
type StepperOrientation = "horizontal" | "vertical";

type PlaceRow = {
  placeLabel: string;
  first: number;
  second: number;
  result: number;
};

type StepMove = {
  from: number;
  to: number;
  label: string;
};

type DigitPair = {
  tens: number;
  units: number;
};

type NormalizedExpression = {
  operation: Operation;
  layout: LayoutMode;
  firstDigits: DigitPair;
  secondDigits: DigitPair;
  resultDigits: DigitPair;
  firstNumber: number;
  secondNumber: number;
  expectedResult: number;
  hideSecondTens: boolean;
};

const supportLabelMap: Record<UsedSupport, string> = {
  column: "Đặt tính theo cột",
  "read-prompt": "Đọc đề bài",
  "read-result": "Đọc kết quả",
  sticks: "Que tính",
  lego: "Lego",
  "number-table": "Bảng số",
  "number-line": "Tia số",
};

export function WidgetComponentArithmetic99() {
  const params = useWidgetParams<Arithmetic99WidgetParams>();
  const expression = useMemo(() => getNormalizedExpression(params), [params]);
  const {
    operation,
    layout,
    firstDigits,
    secondDigits,
    resultDigits,
    firstNumber,
    secondNumber,
    expectedResult,
    hideSecondTens,
  } = expression;

  const [supportMode, setSupportMode] = useState<SupportMode>("none");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportModalStep, setSupportModalStep] =
    useState<SupportModalStep>("root");
  const [pendingType2Support, setPendingType2Support] =
    useState<Type2SupportMode>("sticks");
  const [answerMethod, setAnswerMethod] = useState<AnswerMethod>("input");
  const [answerMethodModalOpen, setAnswerMethodModalOpen] = useState(false);
  const [usedSupports, setUsedSupports] = useState<UsedSupport[]>([]);
  const [columnTens, setColumnTens] = useState("");
  const [columnUnits, setColumnUnits] = useState("");

  const {
    answer,
    setAnswer,
    result,
    submit,
    isLocked,
    canSubmit,
    isSubmitting,
  } = useSubmission<Arithmetic99WidgetAnswer>({
    evaluate: (ans) => {
      const parsed = Number.parseInt(ans.value ?? "", 10);
      const isCorrect = Number.isFinite(parsed) && parsed === expectedResult;
      const used = parseUsedSupports(ans.usedSupports ?? "");
      const hasReadResultSupport = used.includes("read-result");
      const normalSupportCount = used.filter(
        (item) => item !== "read-result",
      ).length;

      let score = isCorrect ? Math.max(0, 100 - normalSupportCount * 10) : 0;
      if (score > 0 && hasReadResultSupport) {
        score = score * 0.5;
      }

      return {
        isCorrect,
        score,
        maxScore: 100,
      };
    },
  });

  useEffect(() => {
    const parsed = parseUsedSupports(answer?.usedSupports ?? "");
    if (parsed.length === 0) return;

    setUsedSupports((prev) => {
      const merged = Array.from(new Set<UsedSupport>([...prev, ...parsed]));
      if (merged.length === prev.length) return prev;
      return merged;
    });
  }, [answer?.usedSupports]);

  useEffect(() => {
    if (supportMode !== "column") return;

    const raw = (answer?.value ?? "").replace(/[^\d]/g, "").slice(-2);
    if (!raw) {
      setColumnTens("");
      setColumnUnits("");
      return;
    }

    if (raw.length === 1) {
      setColumnTens("");
      setColumnUnits(raw);
      return;
    }

    setColumnTens(raw[0]);
    setColumnUnits(raw[1]);
  }, [answer?.value, supportMode]);

  const operatorSymbol = operation === "phép cộng" ? "+" : "-";
  const opWord = operation === "phép cộng" ? "cộng" : "trừ";
  const questionText =
    operation === "phép cộng"
      ? layout === "hàng ngang"
        ? "Tính phép cộng 2 chữ số"
        : "Tính phép cộng 2 chữ số"
      : layout === "hàng ngang"
        ? "Tính phép trừ 2 chữ số"
        : "Tính phép trừ 2 chữ số";

  const placeRows = useMemo<PlaceRow[]>(
    () => [
      {
        placeLabel: "Hàng chục",
        first: firstDigits.tens,
        second: secondDigits.tens,
        result: resultDigits.tens,
      },
      {
        placeLabel: "Hàng đơn vị",
        first: firstDigits.units,
        second: secondDigits.units,
        result: resultDigits.units,
      },
    ],
    [firstDigits, secondDigits, resultDigits],
  );

  const choiceOptions = useMemo(
    () =>
      buildChoiceOptions(
        expectedResult,
        0,
        99,
        firstNumber * 10000 + secondNumber * 100 + expectedResult,
      ),
    [expectedResult, firstNumber, secondNumber],
  );

  const effectiveAnswerMethod: AnswerMethod =
    supportMode === "column" ? "input" : answerMethod;
  const usedSupportLabels = useMemo(
    () => usedSupports.map((item) => supportLabelMap[item]),
    [usedSupports],
  );
  const secondDisplay = hideSecondTens
    ? String(secondDigits.units)
    : String(secondNumber);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canSubmit) {
      submit();
    }
  };

  const openSupportModal = () => {
    setSupportModalOpen(true);
    setSupportModalStep("root");
  };

  const closeSupportModal = () => {
    setSupportModalOpen(false);
  };

  const applyTypeOneSupport = () => {
    markSupportUsed("column");
    setSupportMode("column");
    setAnswerMethod("input");
    closeSupportModal();
  };

  const previewTypeTwoSupport = (mode: Type2SupportMode) => {
    markSupportUsed(mode);
    setPendingType2Support(mode);
    setSupportModalStep("type2-preview");
  };

  const readPromptSupport = () => {
    markSupportUsed("read-prompt");
    closeSupportModal();
    speakVietnamese(`${firstNumber} ${opWord} ${secondNumber} bằng bao nhiêu`);
  };

  const readResultSupport = () => {
    markSupportUsed("read-result");
    closeSupportModal();
    speakVietnamese(
      `${firstNumber} ${opWord} ${secondNumber} bằng ${expectedResult}`,
    );
  };

  const writeAnswer = (nextValue: string, supports = usedSupports) => {
    setAnswer({
      value: nextValue,
      usedSupports: serializeUsedSupports(supports),
    });
  };

  const markSupportUsed = (support: UsedSupport) => {
    setUsedSupports((prev) => {
      if (prev.includes(support)) return prev;
      const next = [...prev, support];
      writeAnswer(answer?.value ?? "", next);
      return next;
    });
  };

  const onAnswerChange = (value: string) => {
    writeAnswer(value.replace(/[^\d]/g, "").slice(0, 2));
  };

  const stepperRange = { min: 0, max: 99 };

  const adjustAnswerBy = (delta: number) => {
    const current = Number.parseInt(answer?.value ?? "", 10);
    const base = Number.isFinite(current) ? current : stepperRange.min;
    const next = clamp(base + delta, stepperRange.min, stepperRange.max);
    writeAnswer(String(next));
  };

  const updateColumnAnswer = (part: "tens" | "units", value: string) => {
    const clean = value.replace(/[^\d]/g, "").slice(-1);
    const nextTens = part === "tens" ? clean : columnTens;
    const nextUnits = part === "units" ? clean : columnUnits;

    if (part === "tens") setColumnTens(clean);
    if (part === "units") setColumnUnits(clean);

    const merged =
      nextTens === "" && nextUnits === ""
        ? ""
        : nextTens === ""
          ? nextUnits
          : `${nextTens}${nextUnits}`;

    writeAnswer(merged);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-rose-50 via-orange-50 to-amber-50">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-lg border border-orange-100 p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold mb-2">
                Cộng trừ 2 chữ số (phạm vi 99)
              </div>
              <h2 className="text-xl font-black text-slate-800">
                <Speak>{questionText}</Speak>
              </h2>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <button
                type="button"
                onClick={openSupportModal}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-700 text-sm font-semibold hover:bg-amber-100"
              >
                <span aria-hidden="true" className="mr-1">
                  🛟
                </span>
                Hỗ trợ
              </button>

              <button
                type="button"
                onClick={() => setAnswerMethodModalOpen(true)}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-indigo-700 text-sm font-semibold hover:bg-indigo-100"
              >
                <span aria-hidden="true" className="mr-1">
                  ⌨️
                </span>
                Phương thức điền
              </button>

              {supportMode !== "none" && (
                <button
                  type="button"
                  onClick={() => setSupportMode("none")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Tắt hỗ trợ
                </button>
              )}
            </div>
          </div>

          {supportMode === "column" ? (
            <ColumnSupportBoard
              firstDigits={firstDigits}
              secondDigits={secondDigits}
              hideSecondTens={hideSecondTens}
              operatorSymbol={operatorSymbol}
              tensValue={columnTens}
              unitValue={columnUnits}
              onTensChange={(value) => updateColumnAnswer("tens", value)}
              onUnitsChange={(value) => updateColumnAnswer("units", value)}
              onKeyDown={onKeyDown}
              disabled={isLocked}
            />
          ) : layout === "hàng ngang" ? (
            <div className="space-y-4">
              <HorizontalMathBoard
                firstNumber={firstNumber}
                secondDisplay={secondDisplay}
                operatorSymbol={operatorSymbol}
                answerArea={
                  effectiveAnswerMethod === "voice" ? (
                    <VoiceNumberInput
                      value={answer?.value ?? ""}
                      onValueChange={(cleaned) => onAnswerChange(cleaned)}
                      onKeyDown={onKeyDown}
                      disabled={isLocked}
                      lang="vi-VN"
                      timeoutMs={10000}
                      showMic="auto"
                      micButtonLabel="Trả lời bằng giọng nói"
                      stopButtonLabel="Dừng nghe"
                      placeholder="?"
                      className="w-full h-14 rounded-lg border-2 border-orange-200 text-right px-3 text-4xl font-bold text-slate-700 bg-white focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
                    />
                  ) : effectiveAnswerMethod === "input" ? (
                    <AnswerInput
                      value={answer?.value ?? ""}
                      onChange={onAnswerChange}
                      onKeyDown={onKeyDown}
                      disabled={isLocked}
                      showStepper={true}
                      stepperOrientation="vertical"
                      onIncrement={() => adjustAnswerBy(1)}
                      onDecrement={() => adjustAnswerBy(-1)}
                    />
                  ) : (
                    <div className="h-14 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-2xl font-bold">
                      ?
                    </div>
                  )
                }
              />

              {effectiveAnswerMethod === "choice" && (
                <ChoiceAnswerBoard
                  options={choiceOptions}
                  selectedValue={answer?.value ?? ""}
                  onSelect={(value) => writeAnswer(String(value))}
                  disabled={isLocked}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <VerticalMathBoard
                firstDigits={firstDigits}
                secondDigits={secondDigits}
                hideSecondTens={hideSecondTens}
                operatorSymbol={operatorSymbol}
                answerArea={
                  effectiveAnswerMethod === "voice" ? (
                    <VoiceNumberInput
                      value={answer?.value ?? ""}
                      onValueChange={(cleaned) => onAnswerChange(cleaned)}
                      onKeyDown={onKeyDown}
                      disabled={isLocked}
                      lang="vi-VN"
                      timeoutMs={10000}
                      showMic="auto"
                      micButtonLabel="Trả lời bằng giọng nói"
                      stopButtonLabel="Dừng nghe"
                      placeholder="?"
                      className="w-full h-14 rounded-lg border-2 border-orange-200 text-right px-3 text-4xl font-bold text-slate-700 bg-white focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
                    />
                  ) : effectiveAnswerMethod === "input" ? (
                    <AnswerInput
                      value={answer?.value ?? ""}
                      onChange={onAnswerChange}
                      onKeyDown={onKeyDown}
                      disabled={isLocked}
                      showStepper={true}
                      stepperOrientation="horizontal"
                      onIncrement={() => adjustAnswerBy(1)}
                      onDecrement={() => adjustAnswerBy(-1)}
                    />
                  ) : (
                    <div className="h-14 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-2xl font-bold">
                      ?
                    </div>
                  )
                }
              />

              {effectiveAnswerMethod === "choice" && (
                <ChoiceAnswerBoard
                  options={choiceOptions}
                  selectedValue={answer?.value ?? ""}
                  onSelect={(value) => writeAnswer(String(value))}
                  disabled={isLocked}
                />
              )}
            </div>
          )}

          {!isLocked && (
            <button
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="w-full mt-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-3 font-semibold disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          )}

          <Feedback
            result={result}
            isLocked={isLocked}
            expectedResult={expectedResult}
            usedSupports={usedSupportLabels}
          />
        </div>
      </div>

      {supportModalOpen && (
        <SupportModal
          step={supportModalStep}
          pendingType2Support={pendingType2Support}
          onClose={closeSupportModal}
          onReadPrompt={readPromptSupport}
          onSelectTypeOne={applyTypeOneSupport}
          onSelectTypeTwo={() => setSupportModalStep("type2-list")}
          onReadResult={readResultSupport}
          onBack={() =>
            setSupportModalStep((prev) =>
              prev === "type2-preview" ? "type2-list" : "root",
            )
          }
          onPreviewTypeTwo={previewTypeTwoSupport}
          previewContent={
            <TypeTwoPreviewContent
              mode={pendingType2Support}
              operation={operation}
              firstNumber={firstNumber}
              secondDisplay={secondDisplay}
              operatorSymbol={operatorSymbol}
              placeRows={placeRows}
            />
          }
        />
      )}

      {answerMethodModalOpen && (
        <AnswerMethodModal
          selectedMethod={answerMethod}
          onClose={() => setAnswerMethodModalOpen(false)}
          onSelect={(method) => {
            setAnswerMethod(method);
            setAnswerMethodModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function VerticalMathBoard({
  firstDigits,
  secondDigits,
  hideSecondTens,
  operatorSymbol,
  answerArea,
}: {
  firstDigits: DigitPair;
  secondDigits: DigitPair;
  hideSecondTens: boolean;
  operatorSymbol: string;
  answerArea: ReactNode;
}) {
  return (
    <div className="mx-auto w-40 rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
      <div className="font-mono text-5xl leading-tight text-slate-800">
        <div className="grid grid-cols-[2rem_2.4rem_2.4rem] items-center gap-x-1 justify-center">
          <span className="text-center text-slate-500">&nbsp;</span>
          <span className="text-center">{firstDigits.tens}</span>
          <span className="text-center">{firstDigits.units}</span>

          <span className="text-center">{operatorSymbol}</span>
          <span className="text-center">
            {hideSecondTens ? "" : secondDigits.tens}
          </span>
          <span className="text-center">{secondDigits.units}</span>
        </div>

        <div className="h-1 rounded-full bg-slate-700 mt-3 mb-2" />

        <div className="text-base leading-normal">{answerArea}</div>
      </div>
    </div>
  );
}

function HorizontalMathBoard({
  firstNumber,
  secondDisplay,
  operatorSymbol,
  answerArea,
}: {
  firstNumber: number;
  secondDisplay: string;
  operatorSymbol: string;
  answerArea: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
      <div className="font-mono text-4xl md:text-5xl leading-tight text-slate-800">
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <span>{firstNumber}</span>
          <span className="text-orange-500">{operatorSymbol}</span>
          <span>{secondDisplay}</span>
          <span className="text-slate-500">=</span>

          <div className="w-32 md:w-36 text-base leading-normal font-sans">
            {answerArea}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerInput({
  value,
  onChange,
  onKeyDown,
  disabled,
  showStepper = false,
  stepperOrientation = "horizontal",
  onIncrement,
  onDecrement,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  showStepper?: boolean;
  stepperOrientation?: StepperOrientation;
  onIncrement?: () => void;
  onDecrement?: () => void;
}) {
  if (showStepper && stepperOrientation === "vertical") {
    return (
      <div className="mx-auto w-28 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled}
          className="h-10 w-full rounded-lg border-2 border-orange-200 bg-white text-2xl font-black text-orange-600 hover:bg-orange-50 disabled:opacity-60"
        >
          +
        </button>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          inputMode="numeric"
          placeholder="?"
          className="w-full h-14 rounded-lg border-2 border-orange-200 bg-white text-center px-3 text-4xl font-bold text-slate-700 focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
        />

        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled}
          className="h-10 w-full rounded-lg border-2 border-orange-200 bg-white text-2xl font-black text-orange-600 hover:bg-orange-50 disabled:opacity-60"
        >
          -
        </button>
      </div>
    );
  }

  if (showStepper) {
    return (
      <div className="relative w-full">
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled}
          className="absolute top-1/2 -translate-y-1/2 -left-18 h-12 w-12 rounded-lg border-2 border-orange-200 bg-white text-2xl font-black text-orange-600 hover:bg-orange-50 disabled:opacity-60"
        >
          -
        </button>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          inputMode="numeric"
          placeholder="?"
          className="w-full h-14 rounded-lg border-2 border-orange-200 bg-white text-right px-3 text-4xl font-bold text-slate-700 focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
        />

        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled}
          className="absolute top-1/2 -translate-y-1/2 -right-18 h-12 w-12 rounded-lg border-2 border-orange-200 bg-white text-2xl font-black text-orange-600 hover:bg-orange-50 disabled:opacity-60"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      inputMode="numeric"
      placeholder="?"
      className="w-full h-14 rounded-lg border-2 border-orange-200 bg-white text-right px-3 text-4xl font-bold text-slate-700 focus:outline-none focus:border-orange-400 disabled:bg-slate-100"
    />
  );
}

function ColumnSupportBoard({
  firstDigits,
  secondDigits,
  hideSecondTens,
  operatorSymbol,
  tensValue,
  unitValue,
  onTensChange,
  onUnitsChange,
  onKeyDown,
  disabled,
}: {
  firstDigits: DigitPair;
  secondDigits: DigitPair;
  hideSecondTens: boolean;
  operatorSymbol: string;
  tensValue: string;
  unitValue: string;
  onTensChange: (value: string) => void;
  onUnitsChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  const tensStyle = {
    bg: "#dbeafe",
    border: "#60a5fa",
    text: "#1e3a8a",
  };
  const unitsStyle = {
    bg: "#fef3c7",
    border: "#f59e0b",
    text: "#92400e",
  };

  return (
    <div className="mx-auto w-80 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
      <div className="grid grid-cols-[2.2rem_2.8rem_2.8rem] gap-1 font-mono text-5xl justify-center">
        <div className="rounded-lg h-16 flex items-center justify-center text-xl font-bold text-slate-500 bg-slate-100">
          &nbsp;
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: tensStyle.bg,
            color: tensStyle.text,
            borderColor: tensStyle.border,
          }}
        >
          {firstDigits.tens}
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: unitsStyle.bg,
            color: unitsStyle.text,
            borderColor: unitsStyle.border,
          }}
        >
          {firstDigits.units}
        </div>

        <div className="rounded-lg h-16 flex items-center justify-center text-3xl font-bold text-orange-600 bg-orange-100">
          {operatorSymbol}
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: tensStyle.bg,
            color: tensStyle.text,
            borderColor: tensStyle.border,
          }}
        >
          {hideSecondTens ? "" : secondDigits.tens}
        </div>

        <div
          className="rounded-lg h-16 flex items-center justify-center border"
          style={{
            backgroundColor: unitsStyle.bg,
            color: unitsStyle.text,
            borderColor: unitsStyle.border,
          }}
        >
          {secondDigits.units}
        </div>
      </div>

      <div className="h-1 rounded-full bg-slate-700" />

      <div className="mx-auto grid grid-cols-[2.2rem_2.8rem_2.8rem] gap-1 justify-center">
        <div className="h-14" />

        <input
          value={tensValue}
          onChange={(event) => onTensChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          inputMode="numeric"
          className="h-14 rounded-lg border-2 text-center text-3xl font-bold focus:outline-none disabled:bg-slate-100"
          style={{
            backgroundColor: tensStyle.bg,
            color: tensStyle.text,
            borderColor: tensStyle.border,
          }}
        />

        <input
          value={unitValue}
          onChange={(event) => onUnitsChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          inputMode="numeric"
          className="h-14 rounded-lg border-2 text-center text-3xl font-bold focus:outline-none disabled:bg-slate-100"
          style={{
            backgroundColor: unitsStyle.bg,
            color: unitsStyle.text,
            borderColor: unitsStyle.border,
          }}
        />
      </div>
    </div>
  );
}

function ChoiceAnswerBoard({
  options,
  selectedValue,
  onSelect,
  disabled,
}: {
  options: number[];
  selectedValue: string;
  onSelect: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const isSelected = selectedValue === String(option);

        return (
          <button
            key={`option-${option}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option)}
            className={`rounded-xl border-2 py-4 text-2xl font-black transition-colors ${
              isSelected
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function HorizontalExpression({
  firstNumber,
  secondDisplay,
  operatorSymbol,
}: {
  firstNumber: number;
  secondDisplay: string;
  operatorSymbol: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center justify-center gap-3 text-4xl md:text-5xl font-black font-mono">
        <span className="rounded-xl px-3 py-1 border border-orange-300 bg-white text-slate-700">
          {firstNumber}
        </span>
        <span className="text-orange-500">{operatorSymbol}</span>
        <span className="rounded-xl px-3 py-1 border border-orange-300 bg-white text-slate-700">
          {secondDisplay}
        </span>
        <span className="text-slate-500">=</span>
        <span className="rounded-xl px-3 py-1 border border-slate-300 bg-white text-slate-500">
          ?
        </span>
      </div>
    </div>
  );
}

function PlaceExpressionCards({
  rows,
  operation,
}: {
  rows: PlaceRow[];
  operation: Operation;
}) {
  const symbol = operation === "phép cộng" ? "+" : "-";

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.placeLabel}
          className="rounded-lg border border-cyan-300 bg-white px-3 py-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
            {row.placeLabel}
          </p>
          <p className="text-2xl font-black text-slate-700 font-mono">
            {row.first} {symbol} {row.second} = {row.result}
          </p>
        </div>
      ))}
    </div>
  );
}

function PlaceItemsSupport({
  rows,
  operation,
  mode,
}: {
  rows: PlaceRow[];
  operation: Operation;
  mode: "sticks" | "lego";
}) {
  const borderClass =
    mode === "sticks"
      ? "border-sky-200 bg-sky-50"
      : "border-violet-200 bg-violet-50";
  const symbolClass = mode === "sticks" ? "text-sky-700" : "text-violet-700";

  return (
    <div className={`rounded-2xl border ${borderClass} p-4 space-y-3`}>
      {rows.map((row) => (
        <div
          key={`row-items-${row.placeLabel}`}
          className="rounded-xl bg-white/80 border border-white p-3"
        >
          <p className="text-xs font-semibold text-slate-600 mb-2">
            {row.placeLabel}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <VisualCount value={row.first} mode={mode} />
            <span className={`text-3xl font-black ${symbolClass}`}>
              {operation === "phép cộng" ? "+" : "-"}
            </span>
            <VisualCount value={row.second} mode={mode} />
            <span className="text-3xl font-black text-slate-500">=</span>
            <VisualCount value={row.result} mode={mode} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VisualCount({
  value,
  mode,
}: {
  value: number;
  mode: "sticks" | "lego";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 min-w-28">
      <div className="text-sm font-bold text-slate-600 mb-1">{value}</div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: value }).map((_, index) =>
          mode === "sticks" ? (
            <StickItem key={`stick-${value}-${index}`} />
          ) : (
            <LegoItem key={`lego-${value}-${index}`} />
          ),
        )}
      </div>
    </div>
  );
}

function StickItem() {
  return (
    <svg width="12" height="40" viewBox="0 0 12 40" aria-hidden="true">
      <rect x="2" y="1" width="8" height="38" rx="3" fill="#38bdf8" />
      <rect x="3" y="2" width="6" height="36" rx="2" fill="#e0f2fe" />
    </svg>
  );
}

function LegoItem() {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true">
      <rect x="1" y="5" width="18" height="10" rx="2" fill="#a78bfa" />
      <circle cx="7" cy="5" r="2" fill="#a78bfa" />
      <circle cx="13" cy="5" r="2" fill="#a78bfa" />
      <rect x="2" y="6" width="16" height="8" rx="2" fill="#ede9fe" />
    </svg>
  );
}

function NumberTableSupport({
  rows,
  operation,
}: {
  rows: PlaceRow[];
  operation: Operation;
}) {
  const op = operation === "phép cộng" ? "add" : "subtract";

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3">
      {rows.map((row) => {
        const moves = buildStepMoves(row.first, row.second, op);
        const stepIndexByValue = new Map<number, number>();
        moves.forEach((move, index) => {
          stepIndexByValue.set(move.to, index);
        });

        return (
          <div
            key={`table-${row.placeLabel}`}
            className="rounded-xl border border-rose-200 bg-white p-3"
          >
            <p className="text-xs font-semibold text-rose-700 mb-2">
              {row.placeLabel}
            </p>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, value) => {
                const isStart = value === row.first;
                const isTarget = value === row.result;
                const stepIndex = stepIndexByValue.get(value);

                return (
                  <div
                    key={`cell-${row.placeLabel}-${value}`}
                    className="h-12 rounded-lg border flex items-center justify-center font-bold relative"
                    style={{
                      borderColor: isStart || isTarget ? "#f43f5e" : "#cbd5e1",
                      backgroundColor: isTarget
                        ? "#fde68a"
                        : isStart
                          ? "#ffe4e6"
                          : "#ffffff",
                    }}
                  >
                    <span>{value}</span>
                    {typeof stepIndex === "number" && (
                      <span className="absolute -bottom-1 text-[10px] font-black text-rose-600">
                        {moves[stepIndex].label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NumberLineSupport({
  rows,
  operation,
}: {
  rows: PlaceRow[];
  operation: Operation;
}) {
  const op = operation === "phép cộng" ? "add" : "subtract";

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 space-y-3">
      {rows.map((row) => {
        const moves = buildStepMoves(row.first, row.second, op);
        const width = 430;
        const height = 120;
        const baselineY = 72;
        const leftPadding = 20;
        const rightPadding = 20;
        const xStep = (width - leftPadding - rightPadding) / 9;
        const getX = (value: number) => leftPadding + value * xStep;

        return (
          <div
            key={`line-${row.placeLabel}`}
            className="rounded-xl border border-cyan-200 bg-white p-3 overflow-x-auto"
          >
            <p className="text-xs font-semibold text-cyan-700 mb-2">
              {row.placeLabel}
            </p>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="min-w-[420px] w-full"
            >
              <line
                x1={leftPadding}
                y1={baselineY}
                x2={width - rightPadding}
                y2={baselineY}
                stroke="#64748b"
                strokeWidth="3"
              />

              {Array.from({ length: 10 }, (_, value) => {
                const x = getX(value);
                const isStart = value === row.first;
                const isTarget = value === row.result;

                return (
                  <g key={`point-${row.placeLabel}-${value}`}>
                    <circle
                      cx={x}
                      cy={baselineY}
                      r={isStart || isTarget ? 6 : 4}
                      fill={isStart || isTarget ? "#06b6d4" : "#94a3b8"}
                    />
                    <text
                      x={x}
                      y={baselineY + 18}
                      fontSize="14"
                      fontWeight="700"
                      textAnchor="middle"
                      fill="#334155"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {moves.map((move, index) => {
                const x1 = getX(move.from);
                const x2 = getX(move.to);
                const mid = (x1 + x2) / 2;
                const arcHeight = 34 + (index % 2) * 8;
                const path = `M ${x1} ${baselineY} Q ${mid} ${arcHeight} ${x2} ${baselineY}`;

                return (
                  <g key={`move-${row.placeLabel}-${index}`}>
                    <path
                      d={path}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                    />
                    <text
                      x={mid}
                      y={arcHeight - 6}
                      fontSize="11"
                      fontWeight="800"
                      textAnchor="middle"
                      fill="#0e7490"
                    >
                      {move.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function TypeTwoPreviewContent({
  mode,
  operation,
  firstNumber,
  secondDisplay,
  operatorSymbol,
  placeRows,
}: {
  mode: Type2SupportMode;
  operation: Operation;
  firstNumber: number;
  secondDisplay: string;
  operatorSymbol: string;
  placeRows: PlaceRow[];
}) {
  return (
    <div className="space-y-3">
      <HorizontalExpression
        firstNumber={firstNumber}
        secondDisplay={secondDisplay}
        operatorSymbol={operatorSymbol}
      />

      <PlaceExpressionCards rows={placeRows} operation={operation} />

      {mode === "sticks" && (
        <PlaceItemsSupport
          rows={placeRows}
          operation={operation}
          mode="sticks"
        />
      )}

      {mode === "lego" && (
        <PlaceItemsSupport rows={placeRows} operation={operation} mode="lego" />
      )}

      {mode === "number-table" && (
        <NumberTableSupport rows={placeRows} operation={operation} />
      )}

      {mode === "number-line" && (
        <NumberLineSupport rows={placeRows} operation={operation} />
      )}
    </div>
  );
}

function SupportModal({
  step,
  pendingType2Support,
  onClose,
  onReadPrompt,
  onSelectTypeOne,
  onSelectTypeTwo,
  onReadResult,
  onBack,
  onPreviewTypeTwo,
  previewContent,
}: {
  step: SupportModalStep;
  pendingType2Support: Type2SupportMode;
  onClose: () => void;
  onReadPrompt: () => void;
  onSelectTypeOne: () => void;
  onSelectTypeTwo: () => void;
  onReadResult: () => void;
  onBack: () => void;
  onPreviewTypeTwo: (mode: Type2SupportMode) => void;
  previewContent: ReactNode;
}) {
  const previewLabelMap: Record<Type2SupportMode, string> = {
    sticks: "que tính",
    lego: "lego",
    "number-table": "bảng số",
    "number-line": "tia số",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            <Speak>Chọn chế độ hỗ trợ</Speak>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        {step === "root" && (
          <div className="grid md:grid-cols-2 gap-3">
            <SupportOptionCard
              title="Hỗ trợ đọc đề bài"
              colorClass="border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
              onClick={onReadPrompt}
              illustration={<SupportIllustration kind="read-prompt" />}
            />

            <SupportOptionCard
              title="Hỗ trợ đặt tính theo cột"
              colorClass="border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={onSelectTypeOne}
              illustration={<SupportIllustration kind="column" />}
            />

            <SupportOptionCard
              title="Hỗ trợ bằng tia số hoặc bảng số"
              colorClass="border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
              onClick={onSelectTypeTwo}
              illustration={<SupportIllustration kind="number-line" />}
            />

            <SupportOptionCard
              title="Hỗ trợ đọc kết quả"
              colorClass="border-rose-200 bg-rose-50 hover:bg-rose-100"
              onClick={onReadResult}
              illustration={<SupportIllustration kind="read-result" />}
            />
          </div>
        )}

        {step === "type2-list" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              Quay lại
            </button>

            <div className="grid md:grid-cols-2 gap-3">
              <SupportOptionCard
                title="Hỗ trợ que tính"
                colorClass="border-sky-200 bg-sky-50 hover:bg-sky-100"
                onClick={() => onPreviewTypeTwo("sticks")}
                illustration={<SupportIllustration kind="sticks" />}
              />

              <SupportOptionCard
                title="Hỗ trợ lego"
                colorClass="border-violet-200 bg-violet-50 hover:bg-violet-100"
                onClick={() => onPreviewTypeTwo("lego")}
                illustration={<SupportIllustration kind="lego" />}
              />

              <SupportOptionCard
                title="Hỗ trợ bảng số"
                colorClass="border-rose-200 bg-rose-50 hover:bg-rose-100"
                onClick={() => onPreviewTypeTwo("number-table")}
                illustration={<SupportIllustration kind="number-table" />}
              />

              <SupportOptionCard
                title="Hỗ trợ tia số"
                colorClass="border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
                onClick={() => onPreviewTypeTwo("number-line")}
                illustration={<SupportIllustration kind="number-line" />}
              />
            </div>
          </div>
        )}

        {step === "type2-preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>

              <div className="text-sm text-slate-600">
                Đang xem trước:{" "}
                <span className="font-semibold">
                  <Speak>{previewLabelMap[pendingType2Support]}</Speak>
                </span>
              </div>
            </div>

            {previewContent}
          </div>
        )}
      </div>
    </div>
  );
}

function SupportOptionCard({
  title,
  colorClass,
  onClick,
  illustration,
}: {
  title: string;
  colorClass: string;
  onClick: () => void;
  illustration: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 ${colorClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-800 text-base">
          <Speak>{title}</Speak>
        </p>
        <div className="shrink-0">{illustration}</div>
      </div>
    </button>
  );
}

function SupportIllustration({
  kind,
}: {
  kind:
    | "column"
    | "sticks"
    | "lego"
    | "number-table"
    | "number-line"
    | "read-prompt"
    | "read-result";
}) {
  if (kind === "read-prompt" || kind === "read-result") {
    const waveColor = kind === "read-result" ? "#fb7185" : "#22d3ee";
    const bodyColor = kind === "read-result" ? "#f43f5e" : "#06b6d4";

    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <polygon
          points="10,19 20,19 30,11 30,37 20,29 10,29"
          fill={bodyColor}
        />
        <path
          d="M 36 18 Q 42 24 36 30"
          fill="none"
          stroke={waveColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 42 14 Q 52 24 42 34"
          fill="none"
          stroke={waveColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "column") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <rect x="4" y="6" width="20" height="16" rx="3" fill="#dbeafe" />
        <rect x="26" y="6" width="20" height="16" rx="3" fill="#fef3c7" />
        <rect x="4" y="24" width="20" height="16" rx="3" fill="#dbeafe" />
        <rect x="26" y="24" width="20" height="16" rx="3" fill="#fef3c7" />
        <rect x="50" y="6" width="18" height="34" rx="4" fill="#bbf7d0" />
      </svg>
    );
  }

  if (kind === "sticks") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`s-${i}`}
            x={8 + i * 8}
            y="6"
            width="5"
            height="34"
            rx="2"
            fill="#38bdf8"
          />
        ))}
      </svg>
    );
  }

  if (kind === "lego") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        <rect x="8" y="18" width="24" height="16" rx="3" fill="#60a5fa" />
        <circle cx="16" cy="18" r="3" fill="#60a5fa" />
        <circle cx="24" cy="18" r="3" fill="#60a5fa" />
        <rect x="40" y="12" width="24" height="22" rx="3" fill="#f472b6" />
      </svg>
    );
  }

  if (kind === "number-table") {
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect
              key={`t-${r}-${c}`}
              x={6 + c * 16}
              y={6 + r * 12}
              width="14"
              height="10"
              rx="2"
              fill={r === 1 && c === 2 ? "#fde68a" : "#fff"}
              stroke="#fda4af"
            />
          )),
        )}
      </svg>
    );
  }

  return (
    <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true">
      <line x1="6" y1="30" x2="66" y2="30" stroke="#0ea5e9" strokeWidth="2" />
      <circle cx="16" cy="30" r="3" fill="#0ea5e9" />
      <circle cx="34" cy="30" r="3" fill="#0ea5e9" />
      <circle cx="52" cy="30" r="3" fill="#0ea5e9" />
      <path
        d="M 16 30 Q 25 12 34 30"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
      />
    </svg>
  );
}

function AnswerMethodModal({
  selectedMethod,
  onClose,
  onSelect,
}: {
  selectedMethod: AnswerMethod;
  onClose: () => void;
  onSelect: (method: AnswerMethod) => void;
}) {
  const methodOptions: Array<{
    method: AnswerMethod;
    title: string;
    icon: string;
  }> = [
    { method: "voice", title: "Thu âm để điền", icon: "🎤" },
    { method: "input", title: "Điền bằng ô nhập", icon: "⌨️" },
    { method: "choice", title: "Chọn 1 trong 4 đáp án", icon: "🔘" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            <Speak>Chọn phương thức điền đáp án</Speak>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        <div className="space-y-2">
          {methodOptions.map((option) => {
            const isActive = option.method === selectedMethod;

            return (
              <button
                key={option.method}
                type="button"
                onClick={() => onSelect(option.method)}
                className={`w-full rounded-xl border-2 px-4 py-3 flex items-center justify-between text-left ${
                  isActive
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold text-slate-800">
                  <Speak>{option.title}</Speak>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  {option.icon}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Feedback({
  result,
  isLocked,
  expectedResult,
  usedSupports,
}: {
  result: SubmissionResult;
  isLocked: boolean;
  expectedResult: number;
  usedSupports: string[];
}) {
  if (!result || !isLocked) return null;

  return (
    <div
      className={`mt-4 p-4 rounded-xl border-2 text-center ${
        result.isCorrect
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <p
        className={`font-semibold ${
          result.isCorrect ? "text-green-700" : "text-red-700"
        }`}
      >
        {result.isCorrect
          ? "Chính xác rồi!"
          : `Chưa đúng, đáp án đúng là ${expectedResult}.`}
      </p>

      {usedSupports.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            Hỗ trợ đã dùng
          </p>
          <ul className="mt-1 text-sm text-amber-800 list-disc pl-5">
            {usedSupports.map((item) => (
              <li key={`used-support-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getNormalizedExpression(
  params: Arithmetic99WidgetParams,
): NormalizedExpression {
  const operation: Operation = params.operation ?? "phép cộng";
  const layout: LayoutMode = params.layout ?? "cột dọc";

  if (operation === "phép cộng") {
    const firstTens = clamp(params.addFirstTens ?? 1, 1, 9);
    const firstUnits = clamp(params.addFirstUnits ?? 0, 0, 9);
    const resultTens = Math.max(
      firstTens,
      clamp(params.addResultTens ?? 1, 1, 9),
    );
    const resultUnits = Math.max(
      firstUnits,
      clamp(params.addResultUnits ?? 0, 0, 9),
    );

    const secondTens = clamp(resultTens - firstTens, 0, 9);
    const secondUnits = clamp(resultUnits - firstUnits, 0, 9);

    const firstNumber = firstTens * 10 + firstUnits;
    const secondNumber = secondTens * 10 + secondUnits;
    const expectedResult = resultTens * 10 + resultUnits;

    return {
      operation,
      layout,
      firstDigits: { tens: firstTens, units: firstUnits },
      secondDigits: { tens: secondTens, units: secondUnits },
      resultDigits: { tens: resultTens, units: resultUnits },
      firstNumber,
      secondNumber,
      expectedResult,
      hideSecondTens: secondTens === 0,
    };
  }

  const firstTens = clamp(params.subFirstTens ?? 8, 1, 9);
  const firstUnits = clamp(params.subFirstUnits ?? 7, 0, 9);
  const secondTens = clamp(params.subSecondTens ?? 3, 0, firstTens);
  const secondUnits = clamp(params.subSecondUnits ?? 4, 0, firstUnits);

  const firstNumber = firstTens * 10 + firstUnits;
  const secondNumber = secondTens * 10 + secondUnits;
  const expectedResult = firstNumber - secondNumber;

  return {
    operation,
    layout,
    firstDigits: { tens: firstTens, units: firstUnits },
    secondDigits: { tens: secondTens, units: secondUnits },
    resultDigits: {
      tens: Math.floor(expectedResult / 10),
      units: expectedResult % 10,
    },
    firstNumber,
    secondNumber,
    expectedResult,
    hideSecondTens: secondTens === 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildChoiceOptions(
  correct: number,
  min: number,
  max: number,
  seed: number,
): number[] {
  const optionSet = new Set<number>();
  optionSet.add(correct);

  const offsets = [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -10, 10];
  for (const offset of offsets) {
    if (optionSet.size >= 4) break;
    const candidate = correct + offset;
    if (candidate >= min && candidate <= max) {
      optionSet.add(candidate);
    }
  }

  for (let value = min; value <= max && optionSet.size < 4; value += 1) {
    optionSet.add(value);
  }

  return deterministicShuffle(Array.from(optionSet).slice(0, 4), seed);
}

function deterministicShuffle(values: number[], seed: number): number[] {
  const output = [...values];
  let currentSeed = seed || 1;

  for (let i = output.length - 1; i > 0; i -= 1) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const ratio = currentSeed / 233280;
    const j = Math.floor(ratio * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }

  return output;
}

function buildStepMoves(
  start: number,
  distance: number,
  operation: "add" | "subtract",
): StepMove[] {
  const direction = operation === "add" ? 1 : -1;
  const moves: StepMove[] = [];
  const normalizedDistance = clamp(distance, 0, 9);

  for (let step = 1; step <= normalizedDistance; step += 1) {
    const from = start + direction * (step - 1);
    const to = start + direction * step;
    const sign = direction > 0 ? "+" : "-";
    moves.push({ from, to, label: `${sign}${step}` });
  }

  return moves;
}

function speakVietnamese(text: string) {
  void WidgetRuntime.requestTtsSpeak({
    text,
    lang: "vi-VN",
    rate: 0.95,
    timeoutMs: 25000,
  }).catch(() => undefined);
}

function serializeUsedSupports(items: UsedSupport[]): string {
  return Array.from(new Set(items)).join("|");
}

function parseUsedSupports(raw: string): UsedSupport[] {
  if (!raw) return [];

  const parsed = raw
    .split("|")
    .map((item) => item.trim())
    .filter((item): item is UsedSupport =>
      [
        "column",
        "read-prompt",
        "read-result",
        "sticks",
        "lego",
        "number-table",
        "number-line",
      ].includes(item),
    );

  return Array.from(new Set(parsed));
}
