import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, Send, CheckCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  question: string;
  type: "text" | "select";
  placeholder?: string;
  options?: string[];
}

interface FollowUpQuestionnaireProps {
  incident: any;
  onComplete: () => void;
  onSkip: () => void;
}

const FollowUpQuestionnaire = ({ incident, onComplete, onSkip }: FollowUpQuestionnaireProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-followup", {
        body: { incident },
      });
      if (error) throw error;
      setQuestions(data.questions || []);
    } catch (e: any) {
      toast({ title: "Could not load questions", description: e.message, variant: "destructive" });
      onSkip();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (id: number, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
    }
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      // Store answers as a system message in case_messages for officers to see
      const answeredQs = questions
        .filter(q => answers[q.id]?.trim())
        .map(q => `Q: ${q.question}\nA: ${answers[q.id]}`)
        .join("\n\n");

      if (answeredQs) {
        await supabase.from("case_messages").insert({
          incident_id: incident.id,
          sender_type: "system",
          message: `📋 **AI Follow-Up Investigation Answers**\n\n${answeredQs}`,
        });
      }

      toast({ title: "Thank you!", description: "Your answers will help officers investigate faster." });
      onComplete();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 gap-4"
      >
        <div className="relative">
          <Brain className="h-10 w-10 text-primary animate-pulse" />
          <Loader2 className="h-5 w-5 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">AI is generating investigation questions...</p>
        <p className="text-[10px] text-muted-foreground/60">Based on your incident details</p>
      </motion.div>
    );
  }

  if (questions.length === 0) return null;

  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const allAnswered = currentQ === questions.length - 1;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">AI Investigation Assistant</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Answer these questions to help officers find the criminal faster
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Question {currentQ + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="rounded-xl border border-border/30 bg-card p-5 space-y-4"
        >
          <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question}</p>

          {q.type === "select" && q.options ? (
            <Select
              value={answers[q.id] || ""}
              onValueChange={(v) => handleAnswer(q.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {q.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Textarea
              placeholder={q.placeholder || "Type your answer..."}
              value={answers[q.id] || ""}
              onChange={(e) => handleAnswer(q.id, e.target.value)}
              className="min-h-[80px]"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        {!allAnswered ? (
          <>
            <Button variant="ghost" size="sm" className="flex-1" onClick={onSkip}>
              <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Skip All
            </Button>
            <Button variant="default" size="sm" className="flex-1" onClick={handleNext}>
              Next Question
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" className="flex-1" onClick={onSkip}>
              <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Skip
            </Button>
            <Button
              variant="hero" size="sm" className="flex-1 gap-1.5"
              onClick={handleSubmitAll} disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle className="h-3.5 w-3.5" /> Submit Answers</>
              )}
            </Button>
          </>
        )}
      </div>

      <p className="text-[10px] text-center text-muted-foreground/50">
        Your answers are encrypted and only visible to assigned officers
      </p>
    </motion.div>
  );
};

export default FollowUpQuestionnaire;
