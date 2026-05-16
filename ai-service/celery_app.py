"""Celery application — broker/backend from environment."""

import os

from celery import Celery

celery_app = Celery(
    "ai_service",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

import tasks  # noqa: E402, F401 — register task modules
