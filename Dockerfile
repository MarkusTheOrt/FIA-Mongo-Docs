FROM node:lts

ENV MONGO="mongodb://localhost:27017/"
ENV DB="fia"
ENV FETCH=60



RUN mkdir /fia-docs
COPY . /fia-docs
WORKDIR /fia-docs/

RUN npm ci --only-production

CMD node src/index.js