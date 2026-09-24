/* ---------- Ecosystem data ---------- */
/* Modelo: 1) ciclo = COMO entregamos; 2) domínios = O QUE entregamos (todo domínio passa por todo o ciclo);
   3) habilitadores = o que amplia. A matriz DOM[x].cells[etapa] alimenta diagrama, painel, matriz e páginas de domínio. */
const STAGES={
 assessment:{n:"Assessment",s:"Assessment",a:-90,route:"assessment",layer:"Ciclo · Etapa 1",d:"Ponto de partida: identifica pontos fortes e melhorias sob as lentes de negócio, tecnologia e cultura, e indica o domínio que resolve cada achado.",
  lenses:[["Negócio","n","Processos, custos, alinhamento da TI à estratégia, riscos e conformidade"],["Tecnologia","t","Infraestrutura, redes, cloud, segurança, sistemas, dados e observabilidade"],["Cultura","c","Pessoas, conhecimento, práticas de trabalho e prontidão para mudança"]]},
 consultoria:{n:"Consultoria",s:"Consultoria",a:0,route:"consultoria",layer:"Ciclo · Etapa 2",d:"Transforma os achados em decisões: arquitetura, estratégia, governança e roadmap, com base em evidência."},
 implementacao:{n:"Implementação",s:"Implementação",a:90,route:"implementacao",layer:"Ciclo · Etapa 3",d:"Coloca as decisões em produção: projetos com automação, integração e segurança desde o primeiro sprint."},
 sustentacao:{n:"Sustentação e Manutenção",s:"Sustentação e Manutenção",a:180,route:"sustentacao",layer:"Ciclo · Etapa 4",d:"Mantém tudo funcionando: monitoramento, suporte de TI, manutenção preventiva e corretiva e melhoria contínua. Os dados da operação alimentam o próximo assessment."}
};
const STAGE_KEYS=Object.keys(STAGES);
const DOM={
 cloud:{n:"Cloud e Infraestrutura",s:"Cloud e Infraestrutura",a:270,route:"cloud",d:"Cloud, data center, redes e conectividade, backup e continuidade: a base que sustenta a operação.",
  cells:{assessment:"Diagnóstico de cloud, redes, capacidade, backup e continuidade",consultoria:"Arquitetura híbrida e multi-cloud, redes e plano de recuperação de desastres",implementacao:"Migração para AWS, Azure e GCP, redes e conectividade, backup e DR, automação CI/CD",sustentacao:"Monitoramento 24x7, suporte, manutenção preventiva e corretiva, patches e capacidade"},
  parceiros:["Omid Cloud","Acronis","ManageEngine OpManager"],academia:["Cloud e FinOps","Infraestrutura e Redes","DevOps e SRE"],en:["academia","parceiros"],g:["modernizar","proteger"]},
 seguranca:{n:"Segurança",s:"Segurança",a:330,route:"seguranca",d:"Segurança ofensiva e defensiva, identidades e acessos, proteção de endpoints e conformidade com a LGPD.",
  cells:{assessment:"Maturidade de segurança, pentest, vulnerabilidades, riscos e LGPD",consultoria:"GRC, arquitetura de segurança, políticas e plano de resposta a incidentes",implementacao:"SIEM, identidades e acessos privilegiados, proteção de endpoints e DevSecOps",sustentacao:"SIEM operado, gestão de vulnerabilidades e patches, resposta a incidentes e backup testado"},
  parceiros:["ManageEngine (Log360, AD360, PAM360, Endpoint Central)","Acronis"],academia:["Segurança da Informação","Conscientização de colaboradores"],en:["academia","parceiros"],g:["proteger"]},
 finops:{n:"FinOps",s:"FinOps",a:30,route:"finops",d:"Governança financeira de nuvem para gastar menos e com previsibilidade.",
  cells:{assessment:"Diagnóstico de custos de cloud, desperdício e potencial de economia",consultoria:"Governança financeira, alocação de custos por área e metas de economia",implementacao:"Rightsizing, reservas, etiquetas de custo e automações de economia",sustentacao:"FinOps contínuo: relatórios mensais, alertas de orçamento e otimização recorrente"},
  parceiros:["Omid Cloud"],academia:["Cloud e FinOps"],en:["academia","parceiros"],g:["economizar"]},
 ia:{n:"Transformação Digital e IA",s:"Transformação Digital e IA",a:90,route:"ia",d:"Agentes de IA, automação de documentos e processos e estratégia de IA com governança e LGPD.",
  cells:{assessment:"Maturidade digital e IA, processos manuais e oportunidades de automação",consultoria:"Estratégia e roadmap de IA, governança, segurança e LGPD em IA",implementacao:"Agentes e assistentes de IA, automação de documentos e processos, integrações",sustentacao:"Monitoramento de qualidade, custos e segurança dos agentes e melhoria contínua"},
  parceiros:["Hyland (OnBase, Alfresco, Nuxeo)"],academia:["Capacitação em IA"],en:["academia","parceiros","inovacao"],g:["modernizar","crescer","economizar"]},
 saas:{n:"SaaS Nexalytix",s:"SaaS",a:150,route:"solucoes",filter:"saas",d:"Produtos próprios prontos para usar: ERP, CRM, Financeiro, BG-Check, Transcribe e AgendaBella.",
  cells:{assessment:"Mapeamento de planilhas, sistemas defasados e aderência dos produtos",consultoria:"Desenho de processos e escolha dos módulos",implementacao:"Implantação, migração de dados e integração com seus sistemas",sustentacao:"Suporte, atualizações e evolução contínua dos produtos"},
  parceiros:["Produtos próprios Nexalytix"],academia:["Treinamento de usuários na implantação"],en:["academia","marketing"],g:["modernizar","crescer"]},
 dev:{n:"Desenvolvimento de Produtos",s:"Desenvolvimento",a:210,route:"solucoes",filter:"dev",d:"Software sob medida e produtos digitais, do discovery ao MVP e à escala, com segurança desde o design.",
  cells:{assessment:"Discovery: problema, usuários e viabilidade técnica",consultoria:"CTO as a Service, arquitetura do produto e roadmap",implementacao:"MVP e evolução com DevSecOps e integrações",sustentacao:"Manutenção evolutiva e corretiva, monitoramento e suporte"},
  parceiros:["Freelancers e especialistas do programa de parceiros"],academia:["DevOps e SRE"],en:["academia","parceiros","inovacao","marketing"],g:["modernizar","crescer"]}
};
const ENA={
 academia:{n:"Academia",s:"Academia",a:315,route:"academia",status:"Em estruturação",d:"Capacita o time do cliente em cada domínio e fecha os gaps de cultura apontados no assessment."},
 parceiros:{n:"Parceiros",s:"Parceiros",a:45,route:"parceiros",d:"Hyland, ManageEngine, Acronis e Omid Cloud, além de indicadores, freelancers e revendas que ampliam o alcance."},
 marketing:{n:"Marketing Digital",s:"Marketing Digital",a:135,route:"solucoes",filter:"dev",status:"Em estruturação",d:"Aquisição de clientes para os produtos e para empresas de tecnologia e B2B."},
 inovacao:{n:"Inovação",s:"Inovação",a:225,route:"ecossistema",status:"Em estruturação",d:"Provas de conceito com IA generativa e novos modelos de negócio que viram produtos e serviços."}
};
const ALL={};
Object.entries(STAGES).forEach(([k,v])=>ALL[k]={...v,kind:"stage",ring:1});
Object.entries(DOM).forEach(([k,v])=>ALL[k]={...v,kind:"dom",ring:2,layer:"Domínio"});
Object.entries(ENA).forEach(([k,v])=>ALL[k]={...v,kind:"ena",ring:3,layer:"Habilitador"});
const F=ALL; /* compatibilidade */
const CX=380,CY=350,R={1:172,2:252,3:328};
function pos(k){const f=ALL[k],r=R[f.ring],t=f.a*Math.PI/180;return[CX+r*Math.cos(t),CY+r*Math.sin(t)];}
function pillW(k){return Math.round(ALL[k].s.length*7.3+30);}
function svgMarkup(interactive){
  let s=`<svg viewBox="0 0 760 700" xmlns="http://www.w3.org/2000/svg" role="${interactive?'group':'img'}" aria-label="Mapa do ecossistema Nexalytix">`;
  s+=`<circle class="ring-guide" cx="${CX}" cy="${CY}" r="${R[3]}"/><circle class="ring-band" cx="${CX}" cy="${CY}" r="${R[2]}"/><circle class="ring-cycle" cx="${CX}" cy="${CY}" r="${R[1]}"/>`;
  /* setas do ciclo entre as etapas */
  [-45,45,135,225].forEach(a=>{const t=a*Math.PI/180,x=CX+R[1]*Math.cos(t),y=CY+R[1]*Math.sin(t),rot=a+90;
    s+=`<path class="cycle-arrow" d="M-6,-6 L4,0 L-6,6" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot})"/>`;});
  s+=`<g class="links"></g>`;
  s+=`<circle class="core" cx="${CX}" cy="${CY}" r="58"/><text class="core-s" x="${CX}" y="${CY-10}">NO CENTRO</text><text class="core-t" x="${CX}" y="${CY+12}">Seu negócio</text>`;
  Object.keys(ALL).forEach(k=>{const[x,y]=pos(k),w=pillW(k);
    s+=`<g class="node n${ALL[k].ring}" data-k="${k}" ${interactive?`tabindex="0" role="button" aria-label="${ALL[k].n}"`:''}><rect x="${(x-w/2).toFixed(1)}" y="${(y-17).toFixed(1)}" width="${w}" height="34" rx="17"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${ALL[k].s}</text></g>`;});
  return s+`</svg>`;
}
$("#heroSvg").innerHTML=svgMarkup(false);
const heroMap=$("#heroMap");
heroMap.addEventListener("click",()=>location.hash="ecossistema");
heroMap.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();location.hash="ecossistema";}});

const eco=$("#ecoSvg"); eco.innerHTML=svgMarkup(true);
const ecoSvgEl=$("svg",eco), linksG=$(".links",eco);
let activeGoal="";
/* O que acende ao focar cada item */
function related(k){
  const f=ALL[k];
  if(f.kind==="dom")return [k,...STAGE_KEYS,...f.en];
  if(f.kind==="stage")return [k,...Object.keys(DOM)];
  return [k,...Object.keys(DOM).filter(d=>DOM[d].en.includes(k))];
}
function focusOn(k){
  linksG.innerHTML="";
  ecoSvgEl.classList.toggle("dom-focus",!!k&&ALL[k].kind==="dom");
  if(!k){applyGoal();return;}
  const f=ALL[k],on=related(k);
  if(f.kind==="dom"){
    /* um único raio até o anel do ciclo: o domínio percorre todas as etapas */
    const[x,y]=pos(k),t=f.a*Math.PI/180;
    linksG.innerHTML=`<line class="spoke" x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(CX+R[1]*Math.cos(t)).toFixed(1)}" y2="${(CY+R[1]*Math.sin(t)).toFixed(1)}"/>`;
  }
  $$(".node",eco).forEach(n=>n.classList.toggle("dim",!on.includes(n.dataset.k)));
}
function applyGoal(){
  $$(".node",eco).forEach(n=>{const f=ALL[n.dataset.k];n.classList.toggle("dim",!!activeGoal&&f.kind==="dom"&&!f.g.includes(activeGoal));});
  $$(".eco-card").forEach(c=>{const f=ALL[c.dataset.k];c.classList.toggle("dim",!!activeGoal&&f.kind==="dom"&&!f.g.includes(activeGoal));});
  $$("#ecoMatrix tbody tr").forEach(r=>{const f=DOM[r.dataset.k];r.classList.toggle("dim",!!activeGoal&&!f.g.includes(activeGoal));});
}
$$(".node",eco).forEach(n=>{
  const k=n.dataset.k;
  n.addEventListener("mouseenter",()=>focusOn(k));
  n.addEventListener("focus",()=>focusOn(k));
  n.addEventListener("mouseleave",()=>focusOn(null));
  n.addEventListener("blur",()=>focusOn(null));
  n.addEventListener("click",()=>openDrawer(k));
  n.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openDrawer(k);}});
});
$$("#ecoFilters button").forEach(b=>b.addEventListener("click",()=>{
  $$("#ecoFilters button").forEach(x=>x.setAttribute("aria-pressed",x===b));activeGoal=b.dataset.g;applyGoal();
}));

/* matriz domínio × etapa */
$("#ecoMatrix").innerHTML=`<table><thead><tr><th scope="col">Domínio</th>${STAGE_KEYS.map(s=>`<th scope="col"><button type="button" class="mx-stage" data-open="${s}">${STAGES[s].n}</button></th>`).join("")}<th scope="col">Parceiros e Academia</th></tr></thead><tbody>${
  Object.keys(DOM).map(k=>{const f=DOM[k];return `<tr data-k="${k}"><th scope="row"><button type="button" class="mx-dom" data-open="${k}">${f.n}</button></th>${STAGE_KEYS.map(s=>`<td>${f.cells[s]}</td>`).join("")}<td class="mx-ena"><span class="mx-lbl">Parceiros</span>${f.parceiros.join(" · ")}<span class="mx-lbl">Academia</span>${f.academia.join(" · ")}</td></tr>`;}).join("")
}</tbody></table>`;

/* list view */
const groups=[["Ciclo · como entregamos","stage","var(--primary)"],["Domínios · o que entregamos","dom","var(--primary-soft)"],["Habilitadores · o que amplia","ena","var(--accent)"]];
$("#ecoList").innerHTML=groups.map(([t,kind,c])=>`<div class="eco-group"><h3><i style="background:${c}"></i>${t}</h3><div class="grid g3">${
  Object.keys(ALL).filter(k=>ALL[k].kind===kind).map(k=>{const f=ALL[k];return `<div class="card eco-card" data-k="${k}"><div class="top"><span class="pill ${kind==='ena'?'warn':'blue'}">${f.layer}</span>${f.status?`<span class="pill">${f.status}</span>`:''}</div><h4>${f.n}</h4><p>${f.d}</p><button type="button" class="more btn-link" data-open="${k}">Ver detalhes →</button></div>`;}).join("")
}</div></div>`).join("");
function setView(list){$("#ecoDiag").hidden=list;$("#ecoList").hidden=!list;$("#vDiag").setAttribute("aria-pressed",!list);$("#vList").setAttribute("aria-pressed",list);}
$("#vDiag").addEventListener("click",()=>setView(false));
$("#vList").addEventListener("click",()=>setView(true));
if(window.matchMedia("(max-width: 640px)").matches)setView(true);

/* drawer */
const drawer=$("#drawer"),scrim=$("#scrim");let lastFocus=null;
function rowsList(rows){return `<div class="conn-list">${rows.map(([k,t,d])=>`<button type="button" class="conn" data-open="${k}"><span class="conn-tag">${t}</span><b>${ALL[k].n}</b><span>${d}</span></button>`).join("")}</div>`;}
function openDrawer(k){
  const f=ALL[k];lastFocus=document.activeElement;
  $$(".node",eco).forEach(n=>n.classList.toggle("sel",n.dataset.k===k));
  $$("#ecoMatrix tbody tr").forEach(r=>r.classList.toggle("sel",r.dataset.k===k));
  let body="";
  if(f.kind==="dom"){
    body=`<div><p class="trust-label" style="margin-bottom:10px">Em cada etapa do ciclo</p>${rowsList(STAGE_KEYS.map((s,i)=>[s,"Etapa "+(i+1),f.cells[s]]))}</div>
    <div class="dl"><div><b>Parceiros</b><span>${f.parceiros.join(" · ")}</span></div><div><b>Academia</b><span>${f.academia.join(" · ")}</span></div></div>`;
  }else if(f.kind==="stage"){
    body=(f.lenses?`<div><p class="trust-label" style="margin-bottom:10px">O que avalia</p><div class="lens-list">${f.lenses.map(([t,l,d])=>`<div class="lens-row lens-${l}"><b>${t}</b><span>${d}</span></div>`).join("")}</div></div>`:"")
     +`<div><p class="trust-label" style="margin-bottom:10px">Em cada domínio</p>${rowsList(Object.keys(DOM).map(d=>[d,"Domínio",DOM[d].cells[k]]))}</div>`;
  }else{
    const doms=Object.keys(DOM).filter(d=>DOM[d].en.includes(k));
    body=`<div><p class="trust-label" style="margin-bottom:10px">Apoia os domínios</p>${rowsList(doms.map(d=>[d,"Domínio",k==="parceiros"?DOM[d].parceiros.join(" · "):k==="academia"?DOM[d].academia.join(" · "):DOM[d].d]))}</div>`;
  }
  drawer.innerHTML=`<button type="button" class="drawer-close" aria-label="Fechar">✕</button>
   <div class="chips"><span class="pill ${f.kind==='ena'?'warn':'blue'}">${f.layer}</span>${f.status?`<span class="pill">${f.status}</span>`:''}</div>
   <h2 id="dTitle">${f.n}</h2><p class="muted">${f.d}</p>${body}
   <div class="btn-row" style="margin-top:auto"><a class="btn btn-primary" href="#${f.route}" ${f.filter?`data-filter="${f.filter}"`:''}>Ver página completa</a><a class="btn btn-ghost" href="#contato">Falar com especialista</a></div>`;
  drawer.hidden=false;scrim.hidden=false;$(".drawer-close",drawer).focus();
}
function closeDrawer(){if(drawer.hidden)return;drawer.hidden=true;scrim.hidden=true;$$(".node",eco).forEach(n=>n.classList.remove("sel"));$$("#ecoMatrix tbody tr").forEach(r=>r.classList.remove("sel"));if(lastFocus&&lastFocus.focus)lastFocus.focus();}
scrim.addEventListener("click",closeDrawer);
drawer.addEventListener("click",e=>{if(e.target.closest(".drawer-close"))closeDrawer();if(e.target.closest("a"))closeDrawer();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();});
document.addEventListener("click",e=>{const b=e.target.closest("[data-open]");if(b){e.preventDefault();openDrawer(b.dataset.open);}});

/* páginas de domínio (#cloud, #seguranca, #finops) */
function renderDominio(k){const f=DOM[k];
 $("#dominio").innerHTML=`<div class="phero"><div class="wrap"><p class="crumb"><a href="#ecossistema">Ecossistema</a> / ${f.n}</p><span class="eyebrow">Domínio · passa por todo o ciclo</span><h1>${f.n}</h1><p class="lead">${f.d}</p><div class="btn-row"><a class="btn btn-primary" href="#contato" data-intent="diagnostico">Agendar diagnóstico</a><a class="btn btn-ghost" href="#ecossistema">Ver no ecossistema</a></div></div></div>
 <div class="section" style="padding-top:44px"><div class="wrap"><div class="section-head"><span class="eyebrow">Do diagnóstico à operação</span><h2>O que entregamos em cada etapa</h2></div>
 <div class="cycle">${STAGE_KEYS.map((s,i)=>`<div class="step"><span class="n">ETAPA ${i+1}</span><h3>${STAGES[s].n}</h3><p>${f.cells[s]}</p><a href="#${STAGES[s].route}">Ver etapa →</a></div>`).join("")}</div></div></div>
 <div class="section" style="padding-top:0"><div class="wrap two"><div class="card"><span class="eyebrow">Parceiros</span><ul class="clean check">${f.parceiros.map(p=>`<li>${p}</li>`).join("")}</ul><a class="more" href="#parceiros">Ver parceiros →</a></div><div class="card"><span class="eyebrow">Academia</span><ul class="clean check">${f.academia.map(p=>`<li>${p}</li>`).join("")}</ul><a class="more" href="#academia">Ver Academia →</a></div></div></div>
 <div class="section" style="padding-top:0"><div class="wrap"><div class="next"><div style="display:grid;gap:4px"><span class="eyebrow">Por onde começar</span><b>O Assessment mostra os pontos fortes e as melhorias em ${f.n.toLowerCase()}, e o que priorizar.</b></div><a class="btn btn-primary" href="#assessment">Ver Assessment</a></div></div></div>`;}

