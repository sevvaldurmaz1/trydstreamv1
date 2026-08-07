"""
Vesaik Kontrol AI Service – FastAPI entry point.

Routes:
  POST /ocr/process                       – process a saved file
  POST /ocr/upload-and-process            – upload + process in one step
  POST /validation/validate               – validate extracted fields
  POST /mt/parse                          – SWIFT MT 700 message parser
  POST /discrepancy/check                 – MT vs invoice cross-validation (193 rules)
  POST /discrepancy/check-with-fields     – MT vs fields dict (backend-to-AI call)
  GET  /health                            – health check + Ollama status
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import get_settings
from app.api.routes import ocr, validation
from app.api.routes import mt, discrepancy
from app.services.ollama_service import check_ollama_available, OLLAMA_BASE_URL, OLLAMA_MODEL

settings = get_settings()

app = FastAPI(
    title="Vesaik Kontrol AI Service",
    version=settings.APP_VERSION,
    description="Akreditif belgesi OCR, doğrulama ve MT 700 aykırılık kontrolü",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(ocr.router)
app.include_router(validation.router)
app.include_router(mt.router)
app.include_router(discrepancy.router)


# ── Health ────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    ollama_ok = await check_ollama_available()
    return {
        "status": "ok",
        "service": "Vesaik Kontrol AI Service",
        "version": settings.APP_VERSION,
        "ollama": {
            "available": ollama_ok,
            "url": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
        },
    }


@app.on_event("startup")
async def startup():
    logger.info(f"🚀 Vesaik Kontrol AI Service v{settings.APP_VERSION} başlatıldı")
    ollama_ok = await check_ollama_available()
    if ollama_ok:
        logger.info(f"✅ Ollama bağlı: {OLLAMA_BASE_URL} | Model: {OLLAMA_MODEL}")
    else:
        logger.warning(
            f"⚠️  Ollama erişilemiyor ({OLLAMA_BASE_URL}). "
            f"AI açıklamaları devre dışı. Qwen'i başlatmak için: ollama run {OLLAMA_MODEL}"
        )
