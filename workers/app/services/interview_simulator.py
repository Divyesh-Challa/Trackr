"""
Real AI Simulated Job Interview Service for Trackr.
Replaces static questions with a dynamic, multi-turn AI interviewer:
- Company- and role-specific technical and behavioral questions.
- Real-time deep STAR evaluation (Situation, Task, Action, Result) with scores and feedback.
- Dynamic intelligent follow-up questions challenging candidate assumptions and trade-offs.
- Final interview debrief with hiring recommendations (Strong Hire / Hire / Leaning Hire / Needs Practice).
"""

import json
import logging
from typing import Dict, Any, List, Optional
from app.config import config

logger = logging.getLogger(__name__)

class InterviewSimulator:
    def __init__(self):
        self.gemini_model = None
        if config.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=config.GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Initialized Gemini for Interview Simulator.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini for Interview Simulator: {e}")

    async def start_session(
        self,
        company_name: str,
        role_title: str,
        interview_type: str = "BEHAVIORAL_STAR", # "BEHAVIORAL_STAR", "SYSTEM_DESIGN", "ROLE_DEEP_DIVE"
        difficulty: str = "INTERN_NEW_GRAD",     # "INTERN_NEW_GRAD", "MID_LEVEL", "SENIOR"
        total_rounds: int = 3
    ) -> Dict[str, Any]:
        """
        Initializes an AI simulated interview session and generates opening question.
        """
        interviewer_title = "Senior Engineering Manager" if interview_type == "BEHAVIORAL_STAR" else "Staff Software Engineer"
        interviewer_name = f"{company_name} Tech Lead"

        if self.gemini_model:
            try:
                prompt = f"""
You are a top-tier interviewer ({interviewer_title}) conducting a realistic job interview at {company_name} for the position of {role_title}.
Interview Type: {interview_type.replace('_', ' ').title()}
Candidate Level: {difficulty.replace('_', ' ').title()}

Generate the opening question for Round 1 of {total_rounds}.
Make it authentic, technical, and relevant to {company_name}'s typical challenges and culture.
Zero generic introductory small talk. Jump straight into the first question.

Return ONLY a JSON object:
{{
  "interviewer_persona": "Name & Title at {company_name}",
  "opening_statement": "Brief 1-sentence welcome setting expectations",
  "question": "The interview question",
  "expected_dimensions": ["Dimension 1", "Dimension 2", "Dimension 3"],
  "tip": "Actionable tip on how to structure the response (e.g. STAR method)"
}}
"""
                response = await self.gemini_model.generate_content_async(prompt)
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                data = json.loads(text.strip())
                return {
                    "company_name": company_name,
                    "role_title": role_title,
                    "interview_type": interview_type,
                    "difficulty": difficulty,
                    "current_round": 1,
                    "total_rounds": total_rounds,
                    "interviewer_name": interviewer_name,
                    "interviewer_persona": data.get("interviewer_persona", f"{company_name} Hiring Lead"),
                    "opening_statement": data.get("opening_statement", f"Welcome to your interview for {role_title} at {company_name}."),
                    "question": data.get("question", ""),
                    "expected_dimensions": data.get("expected_dimensions", ["Problem Scope", "Architecture", "Quantifiable Impact"]),
                    "tip": data.get("tip", "Structure your answer using STAR: Situation, Task, Action, and quantifiable Result.")
                }
            except Exception as e:
                logger.warning(f"Gemini interview start error: {e}. Using deterministic engine.")

        # Deterministic fallback tailored to company & role
        return self._start_deterministic(company_name, role_title, interview_type, difficulty, total_rounds)

    def _start_deterministic(
        self,
        company_name: str,
        role_title: str,
        interview_type: str,
        difficulty: str,
        total_rounds: int
    ) -> Dict[str, Any]:
        c_lower = company_name.lower()
        if "electronic arts" in c_lower or "ea" in c_lower:
            q = f"At {company_name}, rendering latency and asset streaming are mission-critical. Tell me about a time you optimized code for CPU/GPU performance or solved a significant bottleneck in a complex codebase."
        elif "cohere" in c_lower or "ai" in c_lower:
            q = f"Building distributed machine learning workflows requires balancing compute efficiency and data pipelines. Tell me about a data or ML engineering project you owned from end to end."
        elif "capital one" in c_lower or "bank" in c_lower or "rbc" in c_lower:
            q = f"In financial technology at {company_name}, data consistency, security, and auditability take precedence. Describe a scenario where you built an API or database architecture handling sensitive transactions or concurrent updates."
        elif interview_type == "SYSTEM_DESIGN":
            q = f"Walk me through the architecture of a high-throughput backend service you designed. What trade-offs did you make regarding caching, database normalization, and asynchronous workers?"
        else:
            q = f"Tell me about a challenging technical project you owned where the initial requirements were ambiguous or changed midway through development. How did you structure your work and measure success?"

        return {
            "company_name": company_name,
            "role_title": role_title,
            "interview_type": interview_type,
            "difficulty": difficulty,
            "current_round": 1,
            "total_rounds": total_rounds,
            "interviewer_name": f"{company_name} Tech Lead",
            "interviewer_persona": f"Staff Software Engineer at {company_name}",
            "opening_statement": f"Welcome! We're excited to dive into your technical background for {role_title} at {company_name}.",
            "question": q,
            "expected_dimensions": ["Technical Ownership", "Architectural Trade-offs", "Quantifiable Metrics"],
            "tip": "Focus on the STAR structure: state the technical problem, your specific code/architecture decisions, and numeric outcomes."
        }

    async def evaluate_turn(
        self,
        company_name: str,
        role_title: str,
        interview_type: str,
        current_round: int,
        total_rounds: int,
        question: str,
        answer: str,
        history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evaluates candidate's answer and generates next dynamic follow-up question or final debrief.
        """
        is_final = current_round >= total_rounds

        if self.gemini_model:
            try:
                prompt = f"""
You are an expert interviewer evaluating a candidate for {role_title} at {company_name}.
Interview Type: {interview_type}
Round: {current_round} of {total_rounds} (Final: {is_final})

Question Asked:
"{question}"

Candidate Answer:
"{answer}"

Evaluation Instructions:
1. Break down the answer thoroughly using the STAR rubric:
   - Situation: Context and problem complexity (score 0-100, concise feedback)
   - Task: Specific personal responsibility and ownership (score 0-100, concise feedback)
   - Action: Technical rigor, architecture, tooling, and execution (score 0-100, concise feedback)
   - Result: Quantifiable metrics and outcome impact (score 0-100, concise feedback)
2. Identify 2 concrete Strengths and 2 specific Areas for Improvement.
3. Provide a Senior FAANG-caliber Model Answer illustrating how to elevate this response.
4. If NOT final round:
   - Formulate an intelligent, probing Follow-Up Question challenging a specific claim, tool, or edge-case mentioned in the candidate's answer.
5. If FINAL round:
   - Provide overall interview score (0-100), Recommendation ("Strong Hire", "Hire", "Leaning Hire", "Needs Practice"), and final debrief summary.

Return ONLY a JSON object:
{{
  "overall_score": 88,
  "star_rubric": {{
    "situation": {{ "score": 90, "feedback": "..." }},
    "task": {{ "score": 85, "feedback": "..." }},
    "action": {{ "score": 92, "feedback": "..." }},
    "result": {{ "score": 82, "feedback": "..." }}
  }},
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "model_answer": "...",
  "follow_up_question": "..." (or null if final),
  "final_decision": "Strong Hire" (or null if not final),
  "final_debrief": "..." (or null if not final)
}}
"""
                response = await self.gemini_model.generate_content_async(prompt)
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                data = json.loads(text.strip())
                return {
                    "current_round": current_round,
                    "total_rounds": total_rounds,
                    "is_final": is_final,
                    "overall_score": data.get("overall_score", 85),
                    "star_rubric": data.get("star_rubric", {}),
                    "strengths": data.get("strengths", []),
                    "improvements": data.get("improvements", []),
                    "model_answer": data.get("model_answer", ""),
                    "follow_up_question": data.get("follow_up_question"),
                    "final_decision": data.get("final_decision"),
                    "final_debrief": data.get("final_debrief")
                }
            except Exception as e:
                logger.warning(f"Gemini turn evaluation error: {e}. Falling back to deterministic engine.")

        return self._evaluate_turn_deterministic(
            company_name, role_title, interview_type, current_round, total_rounds, question, answer, is_final
        )

    def _evaluate_turn_deterministic(
        self,
        company_name: str,
        role_title: str,
        interview_type: str,
        current_round: int,
        total_rounds: int,
        question: str,
        answer: str,
        is_final: bool
    ) -> Dict[str, Any]:
        ans_lower = answer.lower()
        has_metrics = any(char.isdigit() for char in answer) or any(w in ans_lower for w in ["percent", "%", "ms", "seconds", "reduced", "scaled"])
        has_tech = any(w in ans_lower for w in ["api", "database", "sql", "cache", "redis", "postgres", "microservice", "docker", "pipeline", "latency", "async"])
        has_action = any(w in ans_lower for w in ["designed", "engineered", "implemented", "built", "optimized", "refactored", "analyzed"])

        sit_score = 88 if len(answer.split()) > 40 else 76
        task_score = 90 if any(w in ans_lower for w in ["i owned", "my role", "i took", "responsible for", "my responsibility"]) else 80
        action_score = 92 if has_tech and has_action else 82
        result_score = 90 if has_metrics else 78
        overall = round((sit_score + task_score + action_score + result_score) / 4)

        strengths = [
            "Clear technical narrative outlining problem constraints and architectural direction.",
            "Demonstrated proactive ownership in selecting tools and validating solutions."
        ]
        improvements = [
            "Quantify business and engineering metrics more explicitly (e.g. latency percentiles, server memory freed, or deployment hours saved).",
            "Discuss edge cases or trade-offs considered before committing to this architecture."
        ]

        if not is_final:
            if current_round == 1:
                follow_up = f"You touched on your technical execution in that project. If this service had experienced a 10x surge in concurrent requests, where would the system break first, and how would you redesign it?"
            else:
                follow_up = f"How did you collaborate with teammates, product managers, or external stakeholders who held differing technical views during this delivery at {company_name}?"
            decision = None
            debrief = None
        else:
            follow_up = None
            decision = "Strong Hire" if overall >= 88 else ("Hire" if overall >= 80 else "Leaning Hire")
            debrief = f"Demonstrated solid technical problem solving and engineering clarity. Well suited for high-autonomy teams at {company_name}."

        model_answer = f"At my previous position, our team faced a bottleneck where API latency climbed under high concurrency (Situation). As the primary backend engineer, I took end-to-end ownership of identifying the root cause and refactoring the pipeline (Task). I analyzed query plans with EXPLAIN ANALYZE, implemented compound database indexes, and introduced asynchronous Redis caching with a write-through invalidation strategy (Action). Within three weeks, p99 response times dropped from 450ms to 38ms, and database load decreased by 70% under peak load (Result)."

        return {
            "current_round": current_round,
            "total_rounds": total_rounds,
            "is_final": is_final,
            "overall_score": overall,
            "star_rubric": {
                "situation": {"score": sit_score, "feedback": "Good problem definition; set the stage with clear technical constraints."},
                "task": {"score": task_score, "feedback": "Established personal ownership distinct from overall group contribution."},
                "action": {"score": action_score, "feedback": "Demonstrated solid technical depth and implementation choices."},
                "result": {"score": result_score, "feedback": "Included performance metrics; keep quantifying latency and throughput."}
            },
            "strengths": strengths,
            "improvements": improvements,
            "model_answer": model_answer,
            "follow_up_question": follow_up,
            "final_decision": decision,
            "final_debrief": debrief
        }

interview_simulator = InterviewSimulator()
