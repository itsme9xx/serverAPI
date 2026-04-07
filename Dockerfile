FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 py3-pip

RUN python3 -m venv /opt/venv

RUN /opt/venv/bin/pip install --no-cache-dir yt-dlp

ENV PATH="/opt/venv/bin:$PATH"

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]