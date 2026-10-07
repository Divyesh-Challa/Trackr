import logging
from typing import List, Dict, Any
import asyncpg
from app.services.embedding_engine import embedding_engine

logger = logging.getLogger(__name__)

class GapAnalyzer:
    async def analyze(
        self,
        pool: asyncpg.Pool,
        user_id: str,
        requirements: List[str]
    ) -> Dict[str, Any]:
        if not requirements:
            return {
                "coverage_score": 75.0,
                "matched_skills": [],
                "deficiencies": []
            }

        matched_skills = []
        deficiencies = []
        similarities = []

        async with pool.acquire() as conn:
            for req in requirements:
                # Generate embedding for requirement
                req_vec = embedding_engine.embed_text(req)
                vec_str = "[" + ",".join(str(x) for x in req_vec) + "]"

                # Query top matching resume bullet using HNSW cosine distance
                query = """
                    SELECT id, category, content, 1 - (embedding <=> $1::vector) AS similarity
                    FROM resume_bullets
                    WHERE user_id = $2::uuid AND embedding IS NOT NULL
                    ORDER BY embedding <=> $1::vector ASC
                    LIMIT 1;
                """
                row = await conn.fetchrow(query, vec_str, user_id)

                if row and row["similarity"] is not None:
                    sim = max(0.0, min(1.0, float(row["similarity"])))
                    similarities.append(sim)

                    if sim >= 0.55:
                        matched_skills.append({
                            "requirement": req,
                            "matched_bullet": row["content"],
                            "category": row["category"],
                            "similarity": round(sim * 100, 1)
                        })
                    else:
                        deficiencies.append({
                            "requirement": req,
                            "best_match_bullet": row["content"],
                            "similarity": round(sim * 100, 1),
                            "actionable_feedback": f"Requirement '{req}' has low resume coverage ({round(sim * 100)}%). Consider adding a bullet point highlighting practical experience."
                        })
                else:
                    # No resume bullets found yet for user
                    deficiencies.append({
                        "requirement": req,
                        "best_match_bullet": None,
                        "similarity": 0.0,
                        "actionable_feedback": f"No related experience bullet found for '{req}'."
                    })
                    similarities.append(0.35)

        # Compute weighted coverage score (0.0 to 100.0)
        if similarities:
            avg_sim = sum(similarities) / len(similarities)
            coverage_score = round(avg_sim * 100, 1)
        else:
            coverage_score = 50.0

        return {
            "coverage_score": coverage_score,
            "matched_skills": matched_skills,
            "deficiencies": deficiencies,
            "total_requirements": len(requirements),
            "matched_count": len(matched_skills),
            "deficiencies_count": len(deficiencies)
        }

gap_analyzer = GapAnalyzer()
