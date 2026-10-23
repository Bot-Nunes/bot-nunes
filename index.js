const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const app = express();
const P = require('pino');

let lastQR = null;

app.get('/', (req,res)=> res.send('<h1>Bot Nunes Online</h1><a href="/qr"><h2>VER QR CODE</h2></a>'));
app.get('/qr', async (req,res)=>{
  if(!lastQR) return res.send('<h1>Aguardando QR... atualize em 3s</h1><script>setTimeout(()=>location.reload(),3000)</script>');
  const qrImage = await QRCode.toDataURL(lastQR);
  res.send(`<html><body style="text-align:center;font-family:Arial;padding-top:30px"><h1>Escaneie com o WhatsApp do escritório</h1><img src="${qrImage}" style="width:350px;border:10px solid black"/><script>setTimeout(()=>location.reload(),15000)</script></body></html>`);
});

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_nunes');
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}) });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update)=>{
    const { connection, lastDisconnect, qr } = update;
    if(qr) lastQR = qr;
    if(connection === 'close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open'){ console.log('✅ BOT NUNES CONECTADO'); lastQR = null; }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const phone = msg.key.remoteJid;
    const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();

    let resposta = '';

    if(texto === 'menu' || texto === 'oi' || texto === 'ola' || texto === 'olá'){
      resposta = `⚖️ *Olá! Sou a Sofia, atendente virtual do Escritório Nunes Advocacia* 👩‍💼

Como posso te ajudar hoje?

Digite o número da opção:

*1️⃣ - Nossos Serviços e Valores*
*2️⃣ - Horário de Atendimento*
*3️⃣ - Formas de Pagamento / PIX*
*4️⃣ - Falar com um Advogado Humano*
*5️⃣ - Endereço do Escritório*

Digite apenas o número!`;
    }
    else if(texto === '1'){
      resposta = `⚖️ *NOSSOS SERVIÇOS - Escritório Nunes*

👉 *1. Consulta Jurídica:* R$ 150,00 (abatido na contratação)
👉 *2. Ação Trabalhista:* A partir de 30%
👉 *3. Divórcio Consensual:* A partir de R$ 1.200,00
👉 *4. Aposentadoria / INSS:* Primeira consulta grátis

Digite *MENU* para voltar ou *4* para falar com um humano.`;
    }
    else if(texto === '2'){
      resposta = `⏰ *HORÁRIO DE ATENDIMENTO*

Segunda a Sexta: 08:00 às 18:00
Sábado: 08:00 às 12:00 (apenas agendamento)
Domingo: Fechado

Estamos te atendendo agora de forma virtual 24h! 🤖

Digite *MENU* para voltar.`;
    }
    else if(texto === '3'){
      resposta = `💳 *FORMAS DE PAGAMENTO*

PIX (CNPJ): 12.345.678/0001-99
Nome: Nunes Advocacia

Aceitamos também:
✅ Cartão em até 12x
✅ Boleto
✅ Transferência

Me envie o comprovante aqui mesmo!

Digite *MENU* para voltar.`;
    }
    else if(texto === '4'){
      resposta = `👨‍💼 *ATENDIMENTO HUMANO*

Claro! Já estou transferindo você para um de nossos advogados.

⏳ Por favor aguarde um instante, em até 10 minutos um especialista vai te responder aqui mesmo.

Enquanto isso, me diga qual seu caso?

Digite *MENU* para voltar ao atendimento automático.`;
    }
    else if(texto === '5'){
      resposta = `📍 *NOSSO ENDEREÇO*

Rua Paraná, 10000 - Centro
Cascavel - PR
CEP: 85812-000

Em frente ao Fórum.

Digite *MENU* para voltar.`;
    }
    else {
      resposta = `Não entendi 🤔

Sou a Sofia, atendente virtual.

Digite *MENU* para ver as opções que posso te ajudar.`;
    }

    await sock.sendMessage(phone, { text: resposta });
  });
}

startBot();
app.listen(process.env.PORT || 10000, ()=> console.log('Bot rodando'));
