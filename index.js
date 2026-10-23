const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();
const P = require('pino');

const MENU = `⚖️ *Escritório Nunes Advocacia* \n\nOlá! Como posso te ajudar hoje?\n\n1️⃣ Acompanhar meu processo\n2️⃣ Agendar atendimento\n3️⃣ Falar sobre honorários\n4️⃣ Documentos\n5️⃣ Falar com atendente\n\nDigite o número da opção:`;

const sessions = {};
app.get('/', (req,res)=> res.send('Bot Nunes Online 24h - OK - Escaneie o QR no LOG'));
app.get('/qr', (req,res)=> res.send('Olhe o LOG do Render para ver o QR Code'));

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_nunes');
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), printQRInTerminal: true });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update)=>{
    const { connection, lastDisconnect, qr } = update;
    if(qr) console.log('QR CODE:', qr); // Vai aparecer no log do Render
    if(connection === 'close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open'){
      console.log('✅ BOT NUNES CONECTADO NO WHATSAPP!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const phone = msg.key.remoteJid;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
    if(!text) return;

    if(!sessions[phone]) sessions[phone] = { step: 'menu' };
    const s = sessions[phone];
    let reply = '';

    if(['menu','oi','ola','olá'].includes(text.toLowerCase())){
      s.step='menu'; reply=MENU;
    } else if(s.step==='menu'){
      if(['1','2','3','4','5'].includes(text)){
        s.opcao=text; s.step='nome';
        reply=`Perfeito! Opção ${text}.\n\nMe informa seu *nome completo*?`;
      } else { reply=MENU; }
    } else if(s.step==='nome'){
      s.nome=text; s.step='cpf';
      reply=`Obrigado, ${text.split(' ')[0]}! 🙏\n\nAgora me informa seu *CPF* (só números):`;
    } else if(s.step==='cpf'){
      const cpf=text.replace(/\D/g,'');
      s.cpf=cpf; s.step='final';
      reply=`🔍 Encontrei, ${s.nome.split(' ')[0]}!\n\nCPF final ${cpf.slice(-4)} localizado.\n\nSeu processo está em andamento. Um advogado te chama em até 2h.\n\nDigite MENU para voltar.`;
    } else { s.step='menu'; reply=MENU; }
    
    await sock.sendMessage(phone, { text: reply });
  });
}

startBot();
app.listen(process.env.PORT || 3000, ()=> console.log('Bot rodando'));
