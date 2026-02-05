import { useState, useCallback } from "react";
import type { UserQuestion } from "../../types";

interface UserQuestionRequest {
  isOpen: boolean;
  toolUseId: string;
  questions: UserQuestion[];
}

export function useUserQuestions() {
  const [userQuestionRequest, setUserQuestionRequest] =
    useState<UserQuestionRequest | null>(null);

  // New state for inline user question system
  const [isUserQuestionMode, setIsUserQuestionMode] = useState(false);

  const showUserQuestionRequest = useCallback(
    (toolUseId: string, questions: UserQuestion[]) => {
      setUserQuestionRequest({
        isOpen: true,
        toolUseId,
        questions,
      });
      setIsUserQuestionMode(true);
    },
    [],
  );

  const closeUserQuestionRequest = useCallback(() => {
    setUserQuestionRequest(null);
    setIsUserQuestionMode(false);
  }, []);

  /**
   * Format answers for sending back to Claude.
   * Creates a text response with the format:
   * "Header1: selected option\nHeader2: option1, option2"
   */
  const formatAnswersMessage = useCallback(
    (answers: Record<string, string | string[]>): string => {
      if (!userQuestionRequest) return "";

      const lines: string[] = [];
      for (const question of userQuestionRequest.questions) {
        const answer = answers[question.header];
        if (answer !== undefined) {
          if (Array.isArray(answer)) {
            // Multi-select: join with commas
            lines.push(`${question.header}: ${answer.join(", ")}`);
          } else {
            // Single-select
            lines.push(`${question.header}: ${answer}`);
          }
        }
      }
      return lines.join("\n");
    },
    [userQuestionRequest],
  );

  return {
    userQuestionRequest,
    showUserQuestionRequest,
    closeUserQuestionRequest,
    isUserQuestionMode,
    setIsUserQuestionMode,
    formatAnswersMessage,
  };
}
