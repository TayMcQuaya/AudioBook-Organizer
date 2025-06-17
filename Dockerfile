# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code and main app file into the container
COPY backend/ ./backend/
COPY app.py .

# Create necessary directories
RUN mkdir -p uploads exports

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Set production environment variables
ENV FLASK_ENV=production
ENV FLASK_DEBUG=False

# Run app.py when the container launches
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "backend.app:create_app()"] 