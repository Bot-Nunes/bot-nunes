const express = require('express');
const app = express();
app.use(express.json());
const sessions = {};
const MENU = `⚖️ *Escritório Nunes Advocacia* \n\nOlá! Como posso te ajudar hoje?\n\n1️⃣ Acompanhar meu processo\n2️⃣ Agendar atendimento\n3️⃣ Falar sobre honorários\n4️⃣ Documentos\n5️⃣ Falar com atendente\n\nDigite o número da opção:`;

app.get('/', (req,res)=> res.send('Bot Nunes Online 24h - OK'));

app.post('/webhook', (req,res)=>{
  const data = req.body;
  const phone = (data.phone || data.from || '').toString();
  const message = (data.text?.message || data.message || data.body || '').toString().trim();
  if(!phone || !message) return res.json({ok:true});
  if(!sessions[phone]) sessions[phone] = { step: 'menu' };
  const s = sessions[phone];
  let reply = '';
  if(['menu','oi','ola'].includes(message.toLowerCase())){
    s.step='menu'; reply=MENU;
  } else if(s.step==='menu'){
    if(['1','2','3','4','5'].includes(message)){
      s.opcao=message; s.step='nome';
      reply=`Perfeito! Opção ${message}.\n\nMe informa seu *nome completo*?`;
    } else { reply=MENU; }
  } else if(s.step==='nome'){
    s.nome=message; s.step='cpf';
    reply=`Obrigado, ${message.split(' ')[0]}! 🙏\n\nAgora me informa seu *CPF* (só números):`;
  } else if(s.step==='cpf'){
    const cpf=message.replace(/\D/g,'');
    s.cpf=cpf; s.step='final';
    reply=`🔍 Encontrei, ${s.nome.split(' ')[0]}!\n\nCPF final ${cpf.slice(-4)} localizado.\n\nSeu processo está em andamento. Um advogado te chama em até 2h.\n\nDigite MENU para voltar.`;
  } else { s.step='menu'; reply=MENU; }
  return res.json({ reply: reply, message: reply });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Bot rodando '+PORT));
