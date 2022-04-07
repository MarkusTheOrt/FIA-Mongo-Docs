FROM node:lts-alpine

ENV MONGO="mongodb://localhost:27017/"
ENV DB="fia"
ENV FETCH=60

RUN apk add --no-cache imagemagick
RUN echo "<policymap><policy domain=\"coder\" rights=\"reader | write\" pattern=\"pdf\" /></policymap>" > /etc/ImageMagick-7/policy.xml

RUN mkdir /fia-docs
COPY . /fia-docs
WORKDIR /fia-docs/

RUN npm ci --only-production

CMD node src/index.js