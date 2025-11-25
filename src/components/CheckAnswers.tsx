import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { gradeAnswer, Question, GradeResult } from "@/lib/grading";
import { Timer, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface AnswerKey {
  id: string;
  key_name: string;
  questions: Question[];
  image_url: string | null;
}

export const CheckAnswers = () => {
  const [keys, setKeys] = useState<AnswerKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [questionId, setQuestionId] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadKeys = async () => {
    const { data, error } = await supabase
      .from("answer_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load answer keys");
      return;
    }

    setKeys((data || []).map(key => ({
      ...key,
      questions: key.questions as unknown as Question[]
    })));
  };

  const startTimer = () => {
    setTimer(0);
    setIsTimerRunning(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetState = () => {
    setUserAnswer("");
    setGradeResult(null);
    setShowSolution(false);
    setCurrentQuestion(null);
  };

  const handleCheckAnswer = () => {
    if (!selectedKeyId || !questionId || !userAnswer) {
      toast.error("Please fill in all fields");
      return;
    }

    const selectedKey = keys.find((k) => k.id === selectedKeyId);
    if (!selectedKey) return;

    const question = selectedKey.questions.find((q) => q.questionId === questionId);
    if (!question) {
      toast.error("Question not found");
      return;
    }

    pauseTimer();
    setCurrentQuestion(question);
    const result = gradeAnswer(userAnswer, question);
    setGradeResult(result);
  };

  const handleRetry = () => {
    setUserAnswer("");
    setGradeResult(null);
    setShowSolution(false);
    startTimer();
  };

  const handleMarkAndNext = () => {
    setShowSolution(true);
    if (gradeResult) {
      toast.info(`Score: ${gradeResult.score} marks`, {
        description: currentQuestion?.explanation,
      });
    }
    
    // Auto-increment to next question
    const nextQId = (parseInt(questionId) + 1).toString();
    setTimeout(() => {
      setQuestionId(nextQId);
      resetState();
      startTimer();
    }, 3000);
  };

  const handleNext = () => {
    if (gradeResult?.isCorrect) {
      setShowSolution(true);
      if (gradeResult) {
        toast.success(`Score: ${gradeResult.score} marks`, {
          description: currentQuestion?.explanation,
        });
      }
      
      // Auto-increment to next question
      const nextQId = (parseInt(questionId) + 1).toString();
      setTimeout(() => {
        setQuestionId(nextQId);
        resetState();
        startTimer();
      }, 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (selectedKeyId && questionId) {
      startTimer();
    }
  }, [selectedKeyId, questionId]);

  const selectedKey = keys.find(k => k.id === selectedKeyId);

  return (
    <div className="space-y-6">
      {selectedKey?.image_url && (
        <Card>
          <CardHeader>
            <CardTitle>Answer Key Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={selectedKey.image_url} 
              alt={selectedKey.key_name}
              className="w-full rounded-lg border border-border"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Check Answers</span>
            {isTimerRunning && (
              <div className="flex items-center gap-2 text-primary">
                <Timer className="h-5 w-5" />
                <span className="font-mono text-xl">{formatTime(timer)}</span>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Select an answer key and enter the question ID to check your answer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-select">Answer Key</Label>
            <Select value={selectedKeyId} onValueChange={(value) => {
              setSelectedKeyId(value);
              resetState();
            }}>
              <SelectTrigger id="key-select">
                <SelectValue placeholder="Select an answer key" />
              </SelectTrigger>
              <SelectContent>
                {keys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.key_name} ({key.questions.length} questions)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-id">Question ID</Label>
            <Input
              id="question-id"
              type="text"
              placeholder="e.g., 1, 2, 3..."
              value={questionId}
              onChange={(e) => {
                setQuestionId(e.target.value);
                resetState();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Your Answer</Label>
            <Input
              id="answer"
              type="text"
              placeholder="For MCQ: A, B, C, or D | For MSQ: A,C,D | For NAT: numeric value"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={showSolution}
              className={
                gradeResult
                  ? gradeResult.feedback === 'correct'
                    ? 'border-accent'
                    : gradeResult.feedback === 'partial'
                    ? 'border-warning'
                    : 'border-destructive'
                  : ''
              }
            />
            {currentQuestion && (
              <p className="text-xs text-muted-foreground">
                Type: {currentQuestion.type} | Marks: +{currentQuestion.marks} | Negative: -{currentQuestion.negativeMarks}
              </p>
            )}
          </div>

          {gradeResult && (
            <div
              className={`p-4 rounded-lg border-2 ${
                gradeResult.feedback === 'correct'
                  ? 'bg-accent/10 border-accent'
                  : gradeResult.feedback === 'partial'
                  ? 'bg-warning/10 border-warning'
                  : 'bg-destructive/10 border-destructive'
              }`}
            >
              <div className="flex items-start gap-2">
                {gradeResult.feedback === 'correct' ? (
                  <CheckCircle2 className="h-5 w-5 text-accent mt-0.5" />
                ) : gradeResult.feedback === 'partial' ? (
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{gradeResult.message}</p>
                  {showSolution && currentQuestion && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <p className="text-sm">
                        <strong>Correct Answer(s):</strong> {currentQuestion.correctAnswers.join(', ')}
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Explanation:</strong> {currentQuestion.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!gradeResult ? (
              <Button onClick={handleCheckAnswer} className="flex-1">
                Check Answer
              </Button>
            ) : (
              <>
                {!gradeResult.isCorrect && !showSolution && (
                  <Button onClick={handleRetry} variant="outline" className="flex-1">
                    Retry
                  </Button>
                )}
                {!showSolution && (
                  <Button 
                    onClick={gradeResult.isCorrect ? handleNext : handleMarkAndNext} 
                    className="flex-1"
                  >
                    {gradeResult.isCorrect ? 'Next' : 'Mark & Next'}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};