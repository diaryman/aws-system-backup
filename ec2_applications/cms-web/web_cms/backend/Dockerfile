FROM node:20-alpine

# Installing libvips-dev for sharp Compatibility
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev git

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/
COPY package.json package-lock.json ./
RUN npm install -g node-gyp
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install

WORKDIR /opt/app
COPY . .
ENV PATH /opt/node_modules/.bin:$PATH

RUN chown -R node:node /opt/app
USER node

RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
