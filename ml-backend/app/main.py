from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router

app = FastAPI(title="NutriSight API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "status": "running",
        "endpoints": [
            "/api/analyze",
            "/api/body-analyze",
            "/api/camera-analyze",
            "/api/scan-history/{user_id}",
            "/api/weekly-plan",
        ],
    }