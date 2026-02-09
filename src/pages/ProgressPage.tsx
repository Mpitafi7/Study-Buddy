import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocuments, getQuizResults, subscribeToEvents, type QuizResult } from "@/lib/storage";
import { BookOpen, BrainCircuit, Trophy, Target } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function ProgressPage() {
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);

  useEffect(() => {
    async function loadStats() {
      const docs = await getDocuments();
      const quizzes = await getQuizResults();

      setTotalBooks(docs.length);
      setTotalQuizzes(quizzes.length);

      if (quizzes.length > 0) {
        // Calculate average percentage score across all quizzes
        // Each quiz might have different number of questions, so we normalize to percentage
        const totalPercentage = quizzes.reduce((sum, q) => {
          const total = q.questions?.length || 0; // Use questions array length
          if (total === 0) return sum;
          return sum + (q.score / total);
        }, 0);
        setAverageScore(Math.round((totalPercentage / quizzes.length) * 100));
      } else {
        setAverageScore(0);
      }

      setQuizHistory(quizzes.slice(0, 10)); // Show last 10
    }

    loadStats();

    const unsubscribe = subscribeToEvents((e) => {
      if (e.type === "document-added" || e.type === "quiz-saved") {
        loadStats();
      }
    });

    return () => unsubscribe();
  }, []);

  const chartData = quizHistory.slice().reverse().map((q, i) => ({
    name: `Quiz ${i + 1}`,
    score: Math.round((q.score / (q.questions?.length || 1)) * 100), // Normalize to 100
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-bold mb-8">Your Progress</h1>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBooks}</div>
              <p className="text-xs text-muted-foreground">Uploaded to library</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
              <BrainCircuit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuizzes}</div>
              <p className="text-xs text-muted-foreground">Self-assessments completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
              <p className="text-xs text-muted-foreground">Across all quizzes</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Performance</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                {quizHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(video) => `${video}%`}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Bar
                        dataKey="score"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No quiz data available yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {quizHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  quizHistory.map((quiz, i) => (
                    <div key={quiz.id} className="flex items-center">
                      <Target className="h-9 w-9 text-primary/20 mr-4 p-1.5 rounded-full bg-primary/10" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">Quiz Completed</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {quiz.score}/{quiz.questions?.length} • {new Date(quiz.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        {Math.round((quiz.score / (quiz.questions?.length || 1)) * 100)}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
