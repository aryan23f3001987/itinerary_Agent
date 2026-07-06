from pathlib import Path
import re
import traceback
import uvicorn

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from backend import run_travel_agent

BASE_DIR = Path(__file__).resolve().parent
PHOTO_DIR = BASE_DIR / "photo_database"
PHOTO_DIR.mkdir(exist_ok=True)

ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

app = FastAPI(
    title="TripMate AI",
    description="LangGraph Multi-Agent Travel Planner with FastAPI Frontend",
    version="1.0.0"
)


app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static"
)

app.mount(
    "/photos",
    StaticFiles(directory=str(PHOTO_DIR)),
    name="photos"
)


def _natural_sort_key(filename: str):
    """
    Sorts filenames the way a human expects: 1, 2, ..., 9, 10, 11
    instead of the plain string order 1, 10, 11, 2, 3...
    """
    parts = re.split(r"(\d+)", filename)
    return [int(part) if part.isdigit() else part.lower() for part in parts]


templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)



class TravelRequest(BaseModel):
    message: str
    thread_id: str | None = None



@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.post("/api/travel")
async def travel_planner(request_data: TravelRequest):
    try:
        user_message = request_data.message.strip()

        if not user_message:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Message cannot be empty."
                }
            )

        result = run_travel_agent(
            user_input=user_message,
            thread_id=request_data.thread_id
        )

        return JSONResponse(
            content={
                "success": True,
                "thread_id": result["thread_id"],
                "answer": result["answer"],
                "flight_results": result["flight_results"],
                "hotel_results": result["hotel_results"],
                "itinerary": result["itinerary"],
                "llm_calls": result["llm_calls"],
            }
        )

    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )



@app.get("/api/photos")
async def get_photos():
    """
    Scans the photo_database folder every time it's called, so dropping
    in new images (7.jpg, 8.jpg, ...) shows up on next page load with
    zero code changes.
    """
    try:
        files = [
            f.name for f in PHOTO_DIR.iterdir()
            if f.is_file() and f.suffix.lower() in ALLOWED_PHOTO_EXTENSIONS
        ]
        files.sort(key=_natural_sort_key)

        photos = [f"/photos/{name}" for name in files]

        return JSONResponse(content={"success": True, "photos": photos})

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "photos": [], "error": str(e)}
        )


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "AI Travel Planner API is running"
    }


@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(content={})



if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )