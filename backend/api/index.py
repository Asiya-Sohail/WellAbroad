from app.main import app
from fastapi import Request

@app.get("/debug-path")
async def debug_path(request: Request):
    return {
        "url": str(request.url),
        "path": request.url.path,
        "scope_path": request.scope.get("path"),
        "headers": dict(request.headers)
    }
