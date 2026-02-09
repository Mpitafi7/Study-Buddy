import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, BrainCircuit } from "lucide-react";

type Question = {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
};

type QuizPanelProps = {
    questions: Question[];
    onComplete?: (score: number) => void;
};

export function QuizPanel({ questions, onComplete }: QuizPanelProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);

    const currentQuestion = questions[currentQuestionIndex];

    function handleOptionSelect(index: number) {
        if (showResult) return;
        setSelectedOption(index);
    }

    function handleSubmit() {
        if (selectedOption === null) return;

        const isCorrect = selectedOption === currentQuestion.correctAnswer;
        if (isCorrect) {
            setScore(s => s + 1);
        }
        setShowResult(true);
    }

    function handleNext() {
        setSelectedOption(null);
        setShowResult(false);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        } else {
            setCompleted(true);
            onComplete?.(score + (selectedOption === currentQuestion.correctAnswer ? 1 : 0));
        }
    }

    if (completed) {
        return (
            <Card className="p-6 text-center space-y-4 bg-muted/40">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Quiz Completed!</h3>
                <p className="text-2xl font-bold text-primary">
                    {score} / {questions.length}
                </p>
                <p className="text-muted-foreground">
                    {score === questions.length ? "Perfect score! Outstanding!" :
                        score > questions.length / 2 ? "Good job! Keep studying." : "Keep practicing!"}
                </p>
            </Card>
        );
    }

    return (
        <Card className="p-4 space-y-4 border-primary/20">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-medium text-primary">Score: {score}</span>
            </div>

            <h3 className="font-semibold text-lg">{currentQuestion.question}</h3>

            <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => {
                    let variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" = "outline";
                    let className = "w-full justify-start text-left h-auto py-3 px-4";

                    if (showResult) {
                        if (idx === currentQuestion.correctAnswer) {
                            variant = "default"; // Correct answer (green-ish typically, but using default primary)
                            className += " bg-green-600 hover:bg-green-700 text-white border-green-600";
                        } else if (idx === selectedOption) {
                            variant = "destructive"; // Wrong selection
                        } else {
                            className += " opacity-50";
                        }
                    } else {
                        if (selectedOption === idx) {
                            className += " border-primary bg-primary/10";
                        }
                    }

                    return (
                        <Button
                            key={idx}
                            variant={variant}
                            className={className}
                            onClick={() => handleOptionSelect(idx)}
                            disabled={showResult}
                        >
                            <span className="mr-2 opacity-70">{String.fromCharCode(65 + idx)}.</span>
                            {option}
                            {showResult && idx === currentQuestion.correctAnswer && (
                                <CheckCircle className="ml-auto h-4 w-4" />
                            )}
                            {showResult && idx === selectedOption && idx !== currentQuestion.correctAnswer && (
                                <XCircle className="ml-auto h-4 w-4" />
                            )}
                        </Button>
                    );
                })}
            </div>

            {showResult && currentQuestion.explanation && (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    <strong>Explanation:</strong> {currentQuestion.explanation}
                </div>
            )}

            <div className="flex justify-end pt-2">
                {!showResult ? (
                    <Button onClick={handleSubmit} disabled={selectedOption === null}>
                        Check Answer
                    </Button>
                ) : (
                    <Button onClick={handleNext}>
                        {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                    </Button>
                )}
            </div>
        </Card>
    );
}
