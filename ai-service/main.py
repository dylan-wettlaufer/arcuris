from celery.result import AsyncResult
from fastapi import FastAPI

from celery_app import celery_app
from schemas import GenerateJobRequest
from tasks import process_resume

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/jobs/generate")
def enqueue_generate(body: GenerateJobRequest):
    async_result = process_resume.delay(
        body.parsed_resume.model_dump(mode="json", by_alias=True),
        body.interview_answers,
        body.job_description,
    )
    return {"task_id": async_result.id}


@app.get("/jobs/{task_id}")
def job_status(task_id: str):
    result = AsyncResult(task_id, app=celery_app)
    if result.state == "PENDING":
        return {"status": "PENDING", "result": None, "error": None}
    if result.state == "SUCCESS":
        return {"status": "SUCCESS", "result": result.result, "error": None}
    if result.state == "FAILURE":
        err_msg = str(result.info) if result.info else "Task failed"
        return {"status": "FAILURE", "result": None, "error": err_msg}
    return {"status": result.state, "result": None, "error": None}
