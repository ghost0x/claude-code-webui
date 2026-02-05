import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUserQuestions } from "./useUserQuestions";
import type { UserQuestion } from "../../types";

describe("useUserQuestions", () => {
  const mockQuestions: UserQuestion[] = [
    {
      question: "Which framework do you prefer?",
      header: "Framework",
      options: [
        { label: "React", description: "A popular UI library" },
        { label: "Vue", description: "Progressive framework" },
        { label: "Angular", description: "Full-featured framework" },
      ],
      multiSelect: false,
    },
    {
      question: "Which features do you need?",
      header: "Features",
      options: [
        { label: "TypeScript", description: "Type safety" },
        { label: "Testing", description: "Unit tests" },
        { label: "SSR", description: "Server-side rendering" },
      ],
      multiSelect: true,
    },
  ];

  it("should initialize with null userQuestionRequest", () => {
    const { result } = renderHook(() => useUserQuestions());
    expect(result.current.userQuestionRequest).toBeNull();
    expect(result.current.isUserQuestionMode).toBe(false);
  });

  it("should show user question request", () => {
    const { result } = renderHook(() => useUserQuestions());

    act(() => {
      result.current.showUserQuestionRequest("tool-123", mockQuestions);
    });

    expect(result.current.userQuestionRequest).toEqual({
      isOpen: true,
      toolUseId: "tool-123",
      questions: mockQuestions,
    });
    expect(result.current.isUserQuestionMode).toBe(true);
  });

  it("should close user question request", () => {
    const { result } = renderHook(() => useUserQuestions());

    act(() => {
      result.current.showUserQuestionRequest("tool-123", mockQuestions);
    });

    expect(result.current.isUserQuestionMode).toBe(true);

    act(() => {
      result.current.closeUserQuestionRequest();
    });

    expect(result.current.userQuestionRequest).toBeNull();
    expect(result.current.isUserQuestionMode).toBe(false);
  });

  it("should format answers for single-select questions", () => {
    const { result } = renderHook(() => useUserQuestions());

    act(() => {
      result.current.showUserQuestionRequest("tool-123", mockQuestions);
    });

    const answers = {
      Framework: "React",
      Features: ["TypeScript", "Testing"],
    };

    const formatted = result.current.formatAnswersMessage(answers);
    expect(formatted).toBe("Framework: React\nFeatures: TypeScript, Testing");
  });

  it("should return empty string when no request is active", () => {
    const { result } = renderHook(() => useUserQuestions());

    const answers = {
      Framework: "React",
    };

    const formatted = result.current.formatAnswersMessage(answers);
    expect(formatted).toBe("");
  });

  it("should handle single question with other text", () => {
    const singleQuestion: UserQuestion[] = [
      {
        question: "What is your preference?",
        header: "Pref",
        options: [
          { label: "Option A", description: "First option" },
          { label: "Option B", description: "Second option" },
        ],
        multiSelect: false,
      },
    ];

    const { result } = renderHook(() => useUserQuestions());

    act(() => {
      result.current.showUserQuestionRequest("tool-456", singleQuestion);
    });

    const answers = {
      Pref: "Custom answer from Other",
    };

    const formatted = result.current.formatAnswersMessage(answers);
    expect(formatted).toBe("Pref: Custom answer from Other");
  });
});
