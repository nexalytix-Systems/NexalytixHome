/* ---------- Assistente Alya + envio de leads ---------- */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const KB=/*__KB__*/"";
const LEAD_SCHEMA=/*__SCHEMA__*/{};
const BOT_NAME="Alya";
const GREETING=`Oi! Eu sou a ${BOT_NAME}, assistente com IA da Nexalytix. Posso explicar nossos serviços, indicar por onde começar ou colocar você em contato com um especialista. Como posso ajudar?`;

/* Capacidades da prévia (claude.ai). No domínio próprio não existem e o site usa /api/chat e /api/lead. */
let caps={sample:null,db:null,user:null};
const capsReady=(window.claude&&typeof window.claude.use==="function")
  ? Promise.all(["sample","db","user"].map(n=>window.claude.use(n).catch(()=>null))).then(([s,d,u])=>{caps={sample:s,db:d,user:u};})
  : Promise.resolve();
capsReady.then(async()=>{try{if(caps.user&&caps.db&&await Promise.resolve(caps.user.isOwner()))$("#ownerLeads").hidden=false;}catch(_){}});

async function sendLead(lead){
  await capsReady;
  lead.pagina=lead.pagina||("#"+(location.hash.slice(1)||"home"));
  lead.criado_em=new Date().toISOString();
  if(caps.db&&caps.user){
    try{
      const uid=await caps.user.id();
      if(uid){
        const ref=caps.db.doc("leads/"+uid);
        const snap=await ref.get();
        const items=snap.exists?[...((snap.data()||{}).items||[])]:[];
        items.push(lead);
        await ref.set({items:items.slice(-50),atualizado_em:lead.criado_em});
        return {ok:true,where:"preview"};
      }
    }catch(e){console.warn("lead preview",e);}
  }
  try{
    const r=await fetch("/api/lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(lead)});
    const d=await r.json().catch(()=>({}));
    if(r.ok&&d.ok)return {ok:true,where:"crm"};
    return {ok:false,error:d.error};
  }catch(_){return {ok:false};}
}
window.nxSendLead=sendLead;

/* ---------- Formulários ---------- */
const OKMSG={contato:"Recebemos seu contato. Nosso time retorna em até 24 horas úteis.",academia:"Você está na lista de espera. Avisamos quando a turma abrir.",parceiros:"Cadastro recebido. Respondemos em até 5 dias úteis.",newsletter:"Inscrição confirmada."};
function leadFromForm(f){
  const d=Object.fromEntries(new FormData(f).entries()),t=f.dataset.form;
  const base={nome:d.nome||"",email:d.email||"",whatsapp:d.whatsapp||"",empresa:d.empresa||"",website:d.website||"",consentimento_lgpd:!!f.querySelector("input[type=checkbox][required]:checked"),origem:"formulario-"+t};
  if(t==="contato")return {...base,assunto:d.intent,porte:d.porte,mensagem:d.msg||""};
  if(t==="academia")return {...base,assunto:"treinamento",mensagem:`Lista de espera · Trilha: ${d.trilha} · Perfil: ${d.perfil}`};
  if(t==="parceiros")return {...base,assunto:"parceria",mensagem:`Modelo: ${d.tipo}${d.link?" · Portfólio: "+d.link:""}`};
  return {...base,nome:"Assinante da newsletter",assunto:"outro",mensagem:"Inscrição na newsletter"};
}
$$("form.f").forEach(f=>f.addEventListener("submit",async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const out=$(".form-msg",f),btn=f.querySelector("button[type=submit]");
  const bad=$$("[required]",f).find(i=>i.type==="checkbox"?!i.checked:!i.value.trim()||(i.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value)));
  if(bad){out.innerHTML=`<p class="err">${bad.type==="checkbox"?"Marque a autorização de contato para continuar.":bad.type==="email"?"Informe um e-mail válido, como nome@empresa.com.br.":"Preencha o campo "+((f.querySelector(`label[for="${bad.id}"]`)||{}).textContent||"obrigatório")+"."}</p>`;bad.focus();return;}
  btn.disabled=true;const old=btn.textContent;btn.textContent="Enviando...";
  const r=await sendLead(leadFromForm(f));
  btn.disabled=false;btn.textContent=old;
  if(r.ok){
    out.innerHTML=`<div class="ok-box"><b>${OKMSG[f.dataset.form]}</b>${r.where==="preview"?" <span class='muted'>Nesta prévia, o contato fica registrado na página. No site publicado, vai direto para o CRM.</span>":""}</div>`;
    f.reset();$("#emergBox")&&($("#emergBox").hidden=true);
  }else{
    out.innerHTML=`<p class="err">${r.error||"Não conseguimos enviar agora."} Se preferir, escreva para contato@nexalytix.com.br.</p>`;
  }
},true));

/* ---------- Chat ---------- */
const box=$("#nexa"),log=$("#nexaLog"),input=$("#nexaInput"),sendBtn=$("#nexaSend"),stopBtn=$("#nexaStop"),launcher=$("#nexaOpen");
const turns=[];let busy=false,ctl=null,leadSaved=false,mode="auto";
function esc(s){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function md(s){
  let h=esc(s);
  h=h.replace(/\[([^\]]+)\]\((#[a-z-]+|https:\/\/[^\s)]+)\)/g,(m,t,u)=>u.startsWith("#")?`<a href="${u}">${t}</a>`:`<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  h=h.replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>");
  const lines=h.split(/\n/);let out="",inList=false;
  for(const l of lines){const m=l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
    if(m){if(!inList){out+="<ul>";inList=true;}out+=`<li>${m[1]}</li>`;}
    else{if(inList){out+="</ul>";inList=false;}if(l.trim())out+=`<p>${l}</p>`;}}
  if(inList)out+="</ul>";return out;
}
function bubble(role,html){const d=document.createElement("div");d.className="msg "+role;d.innerHTML=html;log.appendChild(d);log.scrollTop=log.scrollHeight;return d;}
function setBusy(b){busy=b;sendBtn.hidden=b;stopBtn.hidden=!b;input.disabled=b;}
function chips(list){const w=document.createElement("div");w.className="nexa-chips";list.forEach(t=>{const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=t;b.onclick=()=>{w.remove();send(t);};w.appendChild(b);});log.appendChild(w);log.scrollTop=log.scrollHeight;}

function openChat(){box.hidden=false;launcher.setAttribute("aria-expanded","true");if(!log.children.length){bubble("bot",md(GREETING));chips(["Quero um diagnóstico","Como vocês aplicam IA?","Como funciona o Assessment de 40 h?","Estou com um incidente agora"]);}setTimeout(()=>input.focus(),50);}
function closeChat(){box.hidden=true;launcher.setAttribute("aria-expanded","false");launcher.focus();}
launcher.addEventListener("click",()=>box.hidden?openChat():closeChat());
$("#nexaClose").addEventListener("click",closeChat);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!box.hidden)closeChat();});
document.addEventListener("click",e=>{if(e.target.closest("[data-nexa]")){e.preventDefault();openChat();}});
$("#nexaForm").addEventListener("submit",e=>{e.preventDefault();const t=input.value.trim();if(t&&!busy){input.value="";send(t);}});
stopBtn.addEventListener("click",()=>ctl&&ctl.abort());

function transcript(){return turns.map(t=>`${t.role==="user"?"Visitante":BOT_NAME}: ${t.content}`).join("\n").slice(-7000);}

async function send(text){
  $$(".nexa-chips",log).forEach(c=>c.remove());
  bubble("user",esc(text).replace(/\n/g,"<br>"));
  turns.push({role:"user",content:text});
  const b=bubble("bot",'<p class="typing"><i></i><i></i><i></i></p>');
  setBusy(true);
  try{
    await capsReady;
    let reply="";
    if(caps.sample&&mode!=="api"){reply=await viaSample(b);}
    else{reply=await viaApi();b.innerHTML=md(reply);}
    turns.push({role:"assistant",content:reply});
  }catch(e){
    const code=e&&e.code;
    if(code==="cancelled"){b.innerHTML=e.text?md(e.text):"<p class='muted'>Resposta interrompida.</p>";if(e.text)turns.push({role:"assistant",content:e.text});}
    else if(code==="rate_limited"){b.innerHTML="<p>Muitas mensagens em pouco tempo. Tente de novo em instantes ou deixe seu contato abaixo.</p>";offline();}
    else{b.remove();turns.pop();offline(text);}
  }finally{setBusy(false);ctl=null;log.scrollTop=log.scrollHeight;input.focus();}
}

async function viaSample(b){
  ctl=new AbortController();
  const route=location.hash.slice(1)||"home";
  const input=[{role:"user",content:KB+`\n\n(O visitante está na página #${route} do site.)`},{role:"assistant",content:GREETING},...turns.slice(-16)];
  const opts={modelTier:"quick",signal:ctl.signal,onText:({text})=>{b.innerHTML=md(text);log.scrollTop=log.scrollHeight;}};
  let canTools=false;try{canTools=!!(await caps.sample.limits()).tools;}catch(_){}
  if(canTools){opts.tools=[{name:"registrar_lead",description:"Registra o contato do visitante no CRM da Nexalytix para o time comercial retornar. Use uma única vez, quando tiver nome e pelo menos e-mail ou WhatsApp. Retorna {ok:true} quando registrado.",inputSchema:LEAD_SCHEMA,
    execute:async(inp)=>{if(leadSaved)return {ok:true};
      const lead={nome:String(inp.nome||""),email:String(inp.email||""),whatsapp:String(inp.whatsapp||""),empresa:String(inp.empresa||""),porte:String(inp.porte||""),assunto:String(inp.assunto||"outro"),mensagem:String(inp.resumo||""),origem:"chatbot",consentimento_lgpd:true,transcricao:transcript()};
      if(!lead.nome||(!/@/.test(lead.email)&&lead.whatsapp.replace(/\D/g,"").length<10))throw new Error("Faltam nome e um contato válido (e-mail ou WhatsApp com DDD).");
      const r=await sendLead(lead);if(!r.ok)throw new Error("Falha ao registrar. Oriente o visitante a escrever para contato@nexalytix.com.br.");
      leadSaved=true;markSaved();return {ok:true};}}];}
  else opts.cache=false;
  const {text}=await caps.sample(input,opts);
  b.innerHTML=md(text);return text;
}

async function viaApi(){
  const r=await fetch("/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:turns.slice(-24),pagina:"#"+(location.hash.slice(1)||"home")})});
  if(!r.ok)throw {code:"api_"+r.status};
  const d=await r.json();
  if(d.leadSaved&&!leadSaved){leadSaved=true;markSaved();}
  return d.reply||"Pode repetir, por favor?";
}

function markSaved(){const n=document.createElement("div");n.className="nexa-note";n.textContent="Contato registrado. O time Nexalytix retorna em até 24 horas úteis.";log.appendChild(n);}

/* Sem IA disponível: o chat vira um formulário curto que vai para o CRM. */
function offline(pending){
  mode="offline";
  if($(".nexa-lead",log))return;
  bubble("bot","<p>Não consigo responder automaticamente agora, mas nosso time responde rápido. Deixe seu contato e conte o que precisa:</p>");
  const f=document.createElement("form");f.className="nexa-lead";f.noValidate=true;
  f.innerHTML=`<input name="nome" placeholder="Seu nome" autocomplete="name" aria-label="Nome" id="nx-nome"><input name="contato" placeholder="E-mail ou WhatsApp com DDD" aria-label="E-mail ou WhatsApp" id="nx-contato"><input name="empresa" placeholder="Empresa (opcional)" aria-label="Empresa" id="nx-empresa"><textarea name="msg" rows="2" aria-label="Mensagem" id="nx-msg" placeholder="Como podemos ajudar?">${pending?esc(pending):""}</textarea><label class="consent"><input type="checkbox" id="nx-lgpd"> Autorizo o contato da Nexalytix (LGPD).</label><button class="btn btn-primary" type="submit">Enviar</button><p class="err" aria-live="polite"></p>`;
  f.addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f).entries()),err=$(".err",f);
    const c=(d.contato||"").trim(),isMail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c),isPhone=c.replace(/\D/g,"").length>=10;
    if(!d.nome.trim()){err.textContent="Informe seu nome.";return;}
    if(!isMail&&!isPhone){err.textContent="Informe um e-mail válido ou WhatsApp com DDD.";return;}
    if(!$("#nx-lgpd",f).checked){err.textContent="Marque a autorização de contato.";return;}
    const r=await sendLead({nome:d.nome,email:isMail?c:"",whatsapp:isPhone&&!isMail?c:"",empresa:d.empresa||"",assunto:"outro",mensagem:d.msg||"",origem:"chat-formulario",consentimento_lgpd:true,transcricao:transcript()});
    if(r.ok){f.remove();markSaved();}else err.textContent="Não conseguimos enviar. Escreva para contato@nexalytix.com.br.";});
  log.appendChild(f);log.scrollTop=log.scrollHeight;
}

/* ---------- Leads da prévia (só o dono vê) ---------- */
$("#ownerLeads").addEventListener("click",async()=>{
  const dr=$("#drawer"),sc=$("#scrim");
  dr.innerHTML=`<button type="button" class="drawer-close" aria-label="Fechar">✕</button><span class="pill blue" style="align-self:flex-start">Visível só para você</span><h2 id="dTitle">Leads da prévia</h2><p class="muted small">Contatos deixados nos formulários e no chat desta página de teste. No site publicado, eles vão direto para o CRM.</p><div id="leadList"><p class="muted">Carregando...</p></div>`;
  dr.hidden=false;sc.hidden=false;$(".drawer-close",dr).onclick=()=>{dr.hidden=true;sc.hidden=true;};
  try{
    const snap=await caps.db.collection("leads").get();
    const all=snap.docs.flatMap(d=>((d.data()||{}).items)||[]).sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em)));
    $("#leadList").innerHTML=all.length?all.map(l=>`<div class="lead-row"><div class="top"><b>${esc(l.nome||"")}</b><span class="pill">${esc(l.assunto||"")}</span></div><span class="small">${esc([l.email,l.whatsapp,l.empresa].filter(Boolean).join(" · "))}</span>${l.mensagem?`<span class="small muted">${esc(l.mensagem)}</span>`:""}<span class="small muted">${esc(l.origem||"")} · ${new Date(l.criado_em).toLocaleString("pt-BR")}</span></div>`).join(""):'<p class="muted">Nenhum lead ainda. Teste um formulário ou o chat.</p>';
  }catch(e){$("#leadList").innerHTML='<p class="err">Não foi possível carregar os leads.</p>';}
});
})();
