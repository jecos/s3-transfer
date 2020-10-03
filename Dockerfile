FROM node:14

WORKDIR /home/node
COPY package.json /home/node
RUN npm install
COPY src /home/node/src
WORKDIR /opt

CMD ["node", "/home/node/src/index.js"]