FROM node:lts-alpine as build-stage

RUN mkdir /fia-docs
COPY . /fia-docs
WORKDIR /fia-docs/

RUN apk add imagemagick

RUN npm install
RUN npm run build