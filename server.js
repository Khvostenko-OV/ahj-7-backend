const port = 7070;

const http = require('http');
const Koa = require('koa');
const WS = require('ws');
const app = new Koa();

function now() {
  const d = new Date();
  return '' + 
    (d.getHours() > 9? d.getHours() : '0' + d.getHours()) + ':' +
    (d.getMinutes() > 9? d.getMinutes() : '0' + d.getMinutes()) + ':' +
    (d.getSeconds() > 9? d.getSeconds() : '0' + d.getSeconds()) + ' ' +
    (d.getDate() > 9? d.getDate() : '0' + d.getDate()) + '.' +
    (d.getMonth() > 8? (d.getMonth() +1) : '0' + (d.getMonth() + 1)) + '.' +
    d.getFullYear().toString().slice(2);
}

app.use( ctx => { ctx.response.body = `hello now! ${now()}`; });

const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

const chatName = 'Our superchat!';
const members = new Set();
const messages = [];

console.log('\n--- Server started at', now(), '--- Chat name:', chatName, '---\n');

wsServer.on('connection', (ws) => {
  let clientName;

  ws.on('message', (evt) => {
    const data = JSON.parse(evt);

    if (data.type === 'join') {
      if (members.has(data.nickname)) {
        console.log('Join reject ---', data.nickname);
        ws.send(JSON.stringify({ result: 'reject', prompt: 'Выберите другой псевдоним!'}));
        return;
      }
      console.log('Join accept ---', data.nickname);
      console.log('Total clients:', Array.from(wsServer.clients).filter(client => client.readyState === WS.OPEN).length);
      clientName = data.nickname;
      members.add(clientName);
      ws.send(JSON.stringify({ result: 'ok', title: chatName }));

      const message = JSON.stringify({ type: 'members', members: [...members], message: `${data.nickname} Присоединился(лась) к чату`, time: now() });
      Array.from(wsServer.clients)
      .filter(client => client.readyState === WS.OPEN)
      .forEach(client => client.send(message));
      return;
    }

    if (data.type === 'message') {
      const message = JSON.stringify({ type: 'message', author: data.author, message: data.message, time: now() });
      messages.push(message);

      Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN)
        .forEach(client => client.send(message));
    }
  });

  ws.on('close', (evt) => {
    if (!clientName) return;
    console.log('Leave ---', clientName);
    console.log('Total clients:', Array.from(wsServer.clients).filter(client => client.readyState === WS.OPEN).length);
    members.delete(clientName);

    const message = JSON.stringify({ type: 'members', members: [...members], message: `${clientName} покинул(а) чат`, time: now() });
    Array.from(wsServer.clients)
    .filter(client => client.readyState === WS.OPEN)
    .forEach(client => client.send(message));
  });
});

server.listen(port);
