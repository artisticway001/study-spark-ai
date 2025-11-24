export interface Question {
  questionId: string;
  type: 'MCQ' | 'MSQ' | 'NAT';
  correctAnswers: string[];
  marks: number;
  negativeMarks: number;
  explanation: string;
}

export interface GradeResult {
  isCorrect: boolean;
  score: number;
  feedback: 'correct' | 'incorrect' | 'partial';
  message: string;
}

export const gradeAnswer = (
  userAnswer: string,
  question: Question
): GradeResult => {
  const { type, correctAnswers, marks, negativeMarks } = question;
  
  if (!userAnswer.trim()) {
    return {
      isCorrect: false,
      score: 0,
      feedback: 'incorrect',
      message: 'Please provide an answer',
    };
  }

  // Normalize inputs
  const normalizedUserAnswer = userAnswer.trim().toUpperCase();
  const normalizedCorrect = correctAnswers.map(a => a.trim().toUpperCase());

  switch (type) {
    case 'MCQ': {
      // Single correct answer
      const isCorrect = normalizedCorrect.includes(normalizedUserAnswer);
      return {
        isCorrect,
        score: isCorrect ? marks : -negativeMarks,
        feedback: isCorrect ? 'correct' : 'incorrect',
        message: isCorrect 
          ? `Correct! You earned ${marks} marks.` 
          : `Incorrect. You lost ${negativeMarks} marks.`,
      };
    }

    case 'NAT': {
      // Numerical answer - exact match required
      const isCorrect = normalizedCorrect.includes(normalizedUserAnswer);
      return {
        isCorrect,
        score: isCorrect ? marks : 0, // NAT has no negative marking
        feedback: isCorrect ? 'correct' : 'incorrect',
        message: isCorrect 
          ? `Correct! You earned ${marks} marks.` 
          : 'Incorrect. No negative marks for NAT.',
      };
    }

    case 'MSQ': {
      // Multiple select - can have full marks, partial marks, or negative marks
      const userAnswers = normalizedUserAnswer.split(',').map(a => a.trim()).filter(Boolean);
      const correctSet = new Set(normalizedCorrect);
      const userSet = new Set(userAnswers);
      
      // Check for incorrect selections
      const hasIncorrect = userAnswers.some(ans => !correctSet.has(ans));
      
      if (hasIncorrect) {
        // Any incorrect selection = negative marks
        return {
          isCorrect: false,
          score: -negativeMarks,
          feedback: 'incorrect',
          message: `Incorrect selection(s). You lost ${negativeMarks} marks.`,
        };
      }
      
      // No incorrect selections - check if all correct ones are selected
      const correctCount = userAnswers.filter(ans => correctSet.has(ans)).length;
      const totalCorrect = normalizedCorrect.length;
      
      if (correctCount === totalCorrect) {
        // Full marks - all correct, no incorrect
        return {
          isCorrect: true,
          score: marks,
          feedback: 'correct',
          message: `Perfect! You earned ${marks} marks.`,
        };
      } else if (correctCount > 0) {
        // Partial marks - some correct, no incorrect
        const partialScore = (marks * correctCount) / totalCorrect;
        return {
          isCorrect: false,
          score: partialScore,
          feedback: 'partial',
          message: `Partially correct. You selected ${correctCount} out of ${totalCorrect} correct options. Score: ${partialScore.toFixed(2)} marks.`,
        };
      } else {
        // No correct selections
        return {
          isCorrect: false,
          score: 0,
          feedback: 'incorrect',
          message: 'No correct options selected.',
        };
      }
    }

    default:
      return {
        isCorrect: false,
        score: 0,
        feedback: 'incorrect',
        message: 'Unknown question type',
      };
  }
};