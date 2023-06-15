FROM continuumio/miniconda3:latest

ENV PORT=8080

COPY . /app
WORKDIR /app

RUN apt-get update \
    && apt-get install -y build-essential \
    && apt-get clean

RUN conda install --file requirements.txt -y

RUN pip install flask

EXPOSE $PORT

CMD ["python", "main.py"]
