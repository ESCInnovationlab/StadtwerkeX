# -*- coding: utf-8 -*-
"""
logging_config.py — call setup_logging() once at app startup.
"""
import logging
import logging.handlers
import os


def setup_logging():
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    formatter = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  %(name)-20s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler = logging.handlers.RotatingFileHandler(
        "app.log", maxBytes=10_000_000, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(log_level)
    root.addHandler(file_handler)
    root.addHandler(console_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.info("Logging initialised at level %s", log_level)
