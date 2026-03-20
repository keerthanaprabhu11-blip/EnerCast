#!/bin/bash
cd ~/enercast_major/backend
source ~/enercast_major/venv/bin/activate
gunicorn --workers 4 --bind 0.0.0.0:5000 --timeout 600 --keep-alive 5 app:app
