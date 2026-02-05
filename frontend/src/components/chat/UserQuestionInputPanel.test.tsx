import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserQuestionInputPanel } from "./UserQuestionInputPanel";
import type { UserQuestion } from "../../types";

describe("UserQuestionInputPanel", () => {
  const singleSelectQuestion: UserQuestion = {
    question: "Which framework do you prefer?",
    header: "Framework",
    options: [
      { label: "React", description: "A popular UI library" },
      { label: "Vue", description: "Progressive framework" },
    ],
    multiSelect: false,
  };

  const multiSelectQuestion: UserQuestion = {
    question: "Which features do you need?",
    header: "Features",
    options: [
      { label: "TypeScript", description: "Type safety" },
      { label: "Testing", description: "Unit tests" },
    ],
    multiSelect: true,
  };

  it("should render single-select question with options", () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();

    render(
      <UserQuestionInputPanel
        questions={[singleSelectQuestion]}
        onSubmit={onSubmit}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Claude has a question")).toBeInTheDocument();
    expect(screen.getByText("Framework")).toBeInTheDocument();
    expect(
      screen.getByText("Which framework do you prefer?"),
    ).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Vue")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("should select an option and submit", () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();

    render(
      <UserQuestionInputPanel
        questions={[singleSelectQuestion]}
        onSubmit={onSubmit}
        onDismiss={onDismiss}
      />,
    );

    // Click on Vue option
    const vueLabel = screen.getByText("Vue").closest("label")!;
    fireEvent.click(vueLabel);

    // Submit
    fireEvent.click(screen.getByText("Submit"));

    expect(onSubmit).toHaveBeenCalledWith({ Framework: "Vue" });
  });

  it("should render multi-select question with checkboxes", () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();

    render(
      <UserQuestionInputPanel
        questions={[multiSelectQuestion]}
        onSubmit={onSubmit}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Which features do you need?")).toBeInTheDocument();

    // Check that checkboxes are rendered (multi-select)
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(3); // 2 options + 1 Other
  });

  it("should allow multiple selections for multi-select questions", () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();

    render(
      <UserQuestionInputPanel
        questions={[multiSelectQuestion]}
        onSubmit={onSubmit}
        onDismiss={onDismiss}
      />,
    );

    // Click on TypeScript
    const tsLabel = screen.getByText("TypeScript").closest("label")!;
    fireEvent.click(tsLabel);

    // Click on Testing
    const testingLabel = screen.getByText("Testing").closest("label")!;
    fireEvent.click(testingLabel);

    // Submit
    fireEvent.click(screen.getByText("Submit"));

    expect(onSubmit).toHaveBeenCalledWith({
      Features: ["TypeScript", "Testing"],
    });
  });

  it("should call onDismiss when Dismiss button is clicked", () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();

    render(
      <UserQuestionInputPanel
        questions={[singleSelectQuestion]}
        onSubmit={onSubmit}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByText("Dismiss"));

    expect(onDismiss).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should show Other input when Other is selected for single-select", () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();

    render(
      <UserQuestionInputPanel
        questions={[singleSelectQuestion]}
        onSubmit={onSubmit}
        onDismiss={onDismiss}
      />,
    );

    // Click on Other
    const otherLabel = screen.getByText("Other").closest("label")!;
    fireEvent.click(otherLabel);

    // Check that text input appears
    const input = screen.getByPlaceholderText("Enter your answer...");
    expect(input).toBeInTheDocument();

    // Type custom answer
    fireEvent.change(input, { target: { value: "Svelte" } });

    // Submit
    fireEvent.click(screen.getByText("Submit"));

    expect(onSubmit).toHaveBeenCalledWith({ Framework: "Svelte" });
  });

  it("should render multiple questions", () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();

    render(
      <UserQuestionInputPanel
        questions={[singleSelectQuestion, multiSelectQuestion]}
        onSubmit={onSubmit}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Framework")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Answer all questions and press Enter to submit, or ESC to dismiss",
      ),
    ).toBeInTheDocument();
  });
});
