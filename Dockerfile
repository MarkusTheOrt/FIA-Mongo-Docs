FROM node:lts-alpine as build-stage

RUN mkdir /fia-docs
COPY . /fia-docs
WORKDIR /fia-docs/

RUN npm install
RUN npm run build

FROM node:lts-alpine as serve

ENV NODE_ENV production
ENV MONGO "mongodb://mongo:27017"

RUN mkdir /fia-docs
WORKDIR /fia-docs
COPY --from=build-stage /fia-docs .

RUN apk add --no-cache imagemagick
RUN echo "<policymap><policy domain=\"coder\" rights=\"reader | write\" pattern=\"pdf\" /></policymap>" > /etc/ImageMagick-7/policy.xml

RUN npm ci --only-production

CMD npm run serve