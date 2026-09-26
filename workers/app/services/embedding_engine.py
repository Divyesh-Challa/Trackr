import logging
import math
import hashlib
from typing import List
import numpy as np
from app.config import config

logger = logging.getLogger(__name__)

DIMENSION = 768

class EmbeddingEngine:
    def __init__(self):
        self.gemini_available = False
        if config.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=config.GEMINI_API_KEY)
                self.gemini_available = True
                logger.info("Configured Gemini Embedding Engine (text-embedding-004, 768d).")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini embeddings: {e}")

    def embed_text(self, text: str) -> List[float]:
        text = text.strip()
        if not text:
            vec = [0.0] * DIMENSION
            vec[0] = 1.0
            return vec

        if self.gemini_available:
            try:
                import google.generativeai as genai
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                embedding = result["embedding"]
                if len(embedding) == DIMENSION:
                    return self._l2_normalize(embedding)
            except Exception as e:
                logger.warning(f"Gemini embed_content error: {e}. Falling back to local semantic projector.")

        # Local deterministic semantic projection (100% free, runs offline on CPU)
        return self._local_project_embedding(text)

    def _l2_normalize(self, vec: List[float]) -> List[float]:
        norm = math.sqrt(sum(x * x for x in vec))
        if norm == 0.0:
            return vec
        return [float(x / norm) for x in vec]

    def _local_project_embedding(self, text: str) -> List[float]:
        """
        Deterministic, seed-consistent semantic feature embedding into 768 dimensions.
        Maps word tokens and character n-grams through multiple hashing projections,
        producing dense vectors with realistic cosine similarity properties.
        """
        dense = np.zeros(DIMENSION, dtype=np.float32)
        words = text.lower().split()

        for word in words:
            # Word level hashing
            h_word = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            idx1 = h_word % DIMENSION
            sign1 = 1.0 if ((h_word >> 10) & 1) else -1.0
            dense[idx1] += sign1 * 1.5

            # Subword 3-gram hashing for morphological similarity
            for i in range(len(word) - 2):
                gram = word[i:i+3]
                h_gram = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16)
                idx2 = h_gram % DIMENSION
                sign2 = 1.0 if ((h_gram >> 8) & 1) else -1.0
                dense[idx2] += sign2 * 0.5

        # Normalize to unit length (L2 norm)
        norm = np.linalg.norm(dense)
        if norm > 0:
            dense = dense / norm
        else:
            dense[0] = 1.0

        return [float(round(val, 6)) for val in dense.tolist()]

embedding_engine = EmbeddingEngine()
