const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const app = express();
const P = require('pino');

let lastQR = null;

app.get('/', (req,res)=> res.send('<h1>Bot Nunes Online</h1><a href="/qr"><h2>CLIQUE AQUI PARA VER O QR CODE</h2></a>'));

app.get('/qr', async (req,res)=>{
  if(!lastQR) {
    return res.send('<h1>Aguardando QR Code... atualize a página em 3 segundos</h1><script>setTimeout(()=>location.reload(),3000)</script>');
  }
  try {
    const qrImage = await QRCode.toDataURL(lastQR);
    res.send(`<html><body style="text-align:center; font-family:Arial; padding-top:30px;"><h1>Escaneie AGORA com o WhatsApp do escritório</h1><img src="${qrImage}" style="width:350px; border:10px solid black;"/><br><br><h3>WhatsApp > Configurações > Aparelhos conectados > Conectar aparelho</h3><p>Esse QR expira em 20 segundos e atualiza sozinho</p><script>setTimeout(()=>location.reload(),15000)</script></body></html>`);
  } catch(e){
    res.send('Erro: '+e.message);
  }
});

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_nunes');
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}) });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update)=>{
    const { connection, lastDisconnect, qr } = update;
    if(qr){ 
      lastQR = qr; 
      console.log('Novo QR gerado');
    }
    if(connection === 'close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open'){
      console.log('✅ BOT NUNES CONECTADO NO WHATSAPP!');
      lastQR = null;
    }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const phone = msg.key.remoteJid;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
    if(!text) return;
    await sock.sendMessage(phone, { text: `⚖️ *Escritório Nunes Advocacia* \n\nOlá! Recebi sua mensagem: "${text}"\n\nBot conectado com sucesso! ✅\n\nDigite MENU para ver as opções.` });
  });
}

startBot();
app.listen(process.env.PORT || 10000, ()=> console.log('Bot rodando na porta 10000'));
