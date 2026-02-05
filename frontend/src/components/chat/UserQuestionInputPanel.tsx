import { useState, useEffect, useCallback, useRef } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import type { UserQuestion } from "../../types";

interface UserQuestionInputPanelProps {
  questions: UserQuestion[];
  onSubmit: (answers: Record<string, string | string[]>) => void;
  onDismiss: () => void;
}

export function UserQuestionInputPanel({
  questions,
  onSubmit,
  onDismiss,
}: UserQuestionInputPanelProps) {
  // Track answers for each question by header
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  // Track which questions have "Other" selected
  const [otherSelected, setOtherSelected] = useState<Record<string, boolean>>(
    {},
  );
  // Track custom "Other" text for each question
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  // Track focused question for keyboard navigation
  const [focusedQuestionIndex, setFocusedQuestionIndex] = useState(0);

  const otherInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Initialize default selections (first option for single-select, empty for multi-select)
  useEffect(() => {
    const initialAnswers: Record<string, string | string[]> = {};
    questions.forEach((q) => {
      if (q.multiSelect) {
        initialAnswers[q.header] = [];
      } else if (q.options.length > 0) {
        initialAnswers[q.header] = q.options[0].label;
      }
    });
    setAnswers(initialAnswers);
  }, [questions]);

  // Handle single-select option change
  const handleSingleSelect = useCallback(
    (header: string, optionLabel: string) => {
      setAnswers((prev) => ({ ...prev, [header]: optionLabel }));
      setOtherSelected((prev) => ({ ...prev, [header]: false }));
    },
    [],
  );

  // Handle multi-select option toggle
  const handleMultiSelect = useCallback(
    (header: string, optionLabel: string) => {
      setAnswers((prev) => {
        const current = (prev[header] as string[]) || [];
        if (current.includes(optionLabel)) {
          return {
            ...prev,
            [header]: current.filter((l) => l !== optionLabel),
          };
        } else {
          return { ...prev, [header]: [...current, optionLabel] };
        }
      });
    },
    [],
  );

  // Handle "Other" option selection
  const handleOtherSelect = useCallback(
    (header: string, isMultiSelect: boolean) => {
      if (isMultiSelect) {
        // For multi-select, toggle the "Other" state
        setOtherSelected((prev) => {
          const newValue = !prev[header];
          // Focus the input when selecting Other
          if (newValue) {
            setTimeout(() => otherInputRefs.current[header]?.focus(), 0);
          }
          return { ...prev, [header]: newValue };
        });
      } else {
        // For single-select, select "Other" as the answer
        setOtherSelected((prev) => ({ ...prev, [header]: true }));
        setAnswers((prev) => ({ ...prev, [header]: "" })); // Clear the preset answer
        setTimeout(() => otherInputRefs.current[header]?.focus(), 0);
      }
    },
    [],
  );

  // Handle "Other" text input change
  const handleOtherTextChange = useCallback(
    (header: string, text: string, isMultiSelect: boolean) => {
      setOtherText((prev) => ({ ...prev, [header]: text }));
      if (!isMultiSelect) {
        // For single-select, the "Other" text IS the answer
        setAnswers((prev) => ({ ...prev, [header]: text }));
      }
    },
    [],
  );

  // Build final answers including "Other" text
  const buildFinalAnswers = useCallback(() => {
    const finalAnswers: Record<string, string | string[]> = {};

    questions.forEach((q) => {
      const header = q.header;
      if (q.multiSelect) {
        const selected = (answers[header] as string[]) || [];
        if (otherSelected[header] && otherText[header]?.trim()) {
          finalAnswers[header] = [...selected, otherText[header].trim()];
        } else {
          finalAnswers[header] = selected;
        }
      } else {
        if (otherSelected[header]) {
          finalAnswers[header] = otherText[header]?.trim() || "";
        } else {
          finalAnswers[header] = answers[header] || "";
        }
      }
    });

    return finalAnswers;
  }, [answers, otherSelected, otherText, questions]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    onSubmit(buildFinalAnswers());
  }, [onSubmit, buildFinalAnswers]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      } else if (e.key === "Enter" && !e.shiftKey) {
        // Only submit via Enter if NOT focused on any form input
        // This prevents accidental submission when pressing Enter on radio/checkbox/text
        const activeElement = document.activeElement as HTMLInputElement;
        const isInFormInput =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";

        if (!isInFormInput) {
          e.preventDefault();
          // handleSubmit will be called, button disabled state handles validation
          handleSubmit();
        }
      } else if (e.key === "Tab") {
        // Allow natural tab navigation
      } else if (e.key === "ArrowDown" && questions.length > 1) {
        e.preventDefault();
        setFocusedQuestionIndex((prev) => (prev + 1) % questions.length);
      } else if (e.key === "ArrowUp" && questions.length > 1) {
        e.preventDefault();
        setFocusedQuestionIndex(
          (prev) => (prev - 1 + questions.length) % questions.length,
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss, handleSubmit, questions.length]);

  // Check if we can submit (at least one answer per question or allow empty for multiSelect)
  const canSubmit = questions.every((q) => {
    if (q.multiSelect) {
      const selected = (answers[q.header] as string[]) || [];
      const hasOther = otherSelected[q.header] && otherText[q.header]?.trim();
      return selected.length > 0 || hasOther;
    } else {
      if (otherSelected[q.header]) {
        return otherText[q.header]?.trim();
      }
      return answers[q.header];
    }
  });

  return (
    <div className="flex-shrink-0 px-4 py-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl backdrop-blur-sm shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <QuestionMarkCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Claude has a question
        </h3>
      </div>

      {/* Questions */}
      <div className="space-y-6 mb-4">
        {questions.map((question, qIndex) => (
          <div
            key={question.header}
            className={`${
              qIndex === focusedQuestionIndex
                ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800 rounded-lg p-3 -m-3"
                : ""
            }`}
          >
            {/* Question header chip and text */}
            <div className="flex items-start gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 whitespace-nowrap">
                {question.header}
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-sm">
                {question.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2 ml-4">
              {question.options.map((option) => {
                const isSelected = question.multiSelect
                  ? ((answers[question.header] as string[]) || []).includes(
                      option.label,
                    )
                  : answers[question.header] === option.label &&
                    !otherSelected[question.header];

                return (
                  <label
                    key={option.label}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400"
                        : "border-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <input
                      type={question.multiSelect ? "checkbox" : "radio"}
                      name={question.header}
                      checked={isSelected}
                      onChange={() =>
                        question.multiSelect
                          ? handleMultiSelect(question.header, option.label)
                          : handleSingleSelect(question.header, option.label)
                      }
                      className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
                    />
                    <div className="flex-1">
                      <span
                        className={`text-sm font-medium ${
                          isSelected
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {option.label}
                      </span>
                      {option.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}

              {/* "Other" option - always available per SDK spec */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  otherSelected[question.header]
                    ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400"
                    : "border-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <input
                  type={question.multiSelect ? "checkbox" : "radio"}
                  name={question.header}
                  checked={otherSelected[question.header] || false}
                  onChange={() =>
                    handleOtherSelect(question.header, question.multiSelect)
                  }
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
                />
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium ${
                      otherSelected[question.header]
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Other
                  </span>
                  {otherSelected[question.header] && (
                    <input
                      ref={(el) => {
                        otherInputRefs.current[question.header] = el;
                      }}
                      type="text"
                      value={otherText[question.header] || ""}
                      onChange={(e) =>
                        handleOtherTextChange(
                          question.header,
                          e.target.value,
                          question.multiSelect,
                        )
                      }
                      placeholder="Enter your answer..."
                      className="other-input mt-2 w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                      autoFocus
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {questions.length > 1
          ? "Answer all questions and press Enter to submit, or ESC to dismiss"
          : "Select an option and press Enter to submit, or ESC to dismiss"}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            canSubmit
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
              : "bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          }`}
        >
          Submit
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-all duration-200"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
