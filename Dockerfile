FROM node:lts

ENV MONGO="mongodb://localhost:27017/"
ENV DB="fia"
ENV FETCH=60

RUN mkdir /fia-bot
COPY . /fia-bot
WORKDIR /fia-bot/

RUN npm ci --only-production

CMD node src/index.js