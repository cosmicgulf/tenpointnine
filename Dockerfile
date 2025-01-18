# Use the official Python image with version 3.10.12 as the base
ARG BUILD_IMAGE="artefact.skao.int/ska-tango-images-pytango-builder:9.5.0"
ARG BASE_IMAGE="artefact.skao.int/ska-tango-images-pytango-runtime:9.5.0"
FROM $BUILD_IMAGE AS buildenv

# Set the working directory inside the container
WORKDIR /src

# Copy only the files required for installing dependencies
COPY requirements.txt /src/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files to the working directory
COPY . /src/

# Expose the port your Flask app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "src/wsgi.py"]

