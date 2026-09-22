/* ============================= LEAD CAPTURE CONFIG ============================= */
const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/90feykiubeygac8dr56elwvipumu30th';

function captureUtm(){
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });
  if (Object.keys(utm).length) {
    try { sessionStorage.setItem('nx_utm', JSON.stringify(utm)); } catch(e){}
  }
}
function getStoredUtm(){
  try {
    const raw = sessionStorage.getItem('nx_utm');
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}
function buildOrigem(){
  const utm = getStoredUtm();
  const parts = [utm.utm_source || 'direto', utm.utm_medium || 'site', utm.utm_campaign].filter(Boolean);
  return parts.join(' / ');
}
captureUtm();

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- desktop mega-menu ---------- */
  document.querySelectorAll('.nav-trigger').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = document.getElementById('nav-panel-' + b.dataset.navIdx);
      const wasOpen = b.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.nav-trigger').forEach(other => {
        other.setAttribute('aria-expanded','false');
        const p = document.getElementById('nav-panel-' + other.dataset.navIdx);
        if (p) p.hidden = true;
      });
      if (!wasOpen) { b.setAttribute('aria-expanded','true'); if (panel) panel.hidden = false; }
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-trigger').forEach(b => {
      b.setAttribute('aria-expanded','false');
      const p = document.getElementById('nav-panel-' + b.dataset.navIdx);
      if (p) p.hidden = true;
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-trigger').forEach(b => {
        b.setAttribute('aria-expanded','false');
        const p = document.getElementById('nav-panel-' + b.dataset.navIdx);
        if (p) p.hidden = true;
      });
    }
  });

  /* ---------- mobile menu + accordion ---------- */
  const menuBtn = document.getElementById('mobile-menu-btn');
  const menuPanel = document.getElementById('mobile-menu');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!open));
    menuPanel.hidden = open;
  });
  document.querySelectorAll('.mobile-nav-trigger').forEach(b => {
    b.addEventListener('click', () => {
      const panel = document.getElementById('mobile-panel-' + b.dataset.mobileIdx);
      const wasOpen = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!wasOpen));
      if (panel) panel.hidden = wasOpen;
    });
  });

  /* ---------- FAQ accordions ---------- */
  document.querySelectorAll('.faq-btn').forEach(b => {
    b.addEventListener('click', () => {
      const group = b.dataset.faqGroup;
      const wasOpen = b.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-btn[data-faq-group="'+group+'"]').forEach(other => {
        other.setAttribute('aria-expanded','false');
        other.parentElement.nextElementSibling.hidden = true;
      });
      if (!wasOpen) {
        b.setAttribute('aria-expanded','true');
        b.parentElement.nextElementSibling.hidden = false;
      }
    });
  });

  /* ---------- Solution Finder (3-step) ---------- */
  const finderRoot = document.getElementById('solution-finder');
  if (finderRoot) {
    const RESULTS = {
      servicos: {
        title: 'Serviços de consultoria e tecnologia',
        href: 'servicos.html',
        blurbBySize: {
          pequena: 'Para o seu estágio, o Diagnóstico Digital costuma ser o ponto de entrada mais leve: mapeia o que priorizar antes de qualquer investimento maior.',
          media: 'Nas médias empresas, o ganho normalmente vem de integrar sistemas e estruturar dados — sem depender de uma única pessoa para isso.',
          startup: 'Para tech/startups, entramos com automação e IA aplicadas desde cedo, com arquitetura pronta para crescer.',
          grande: 'Em operações grandes, o foco costuma ser integração entre sistemas legados e governança formal de IA.',
        },
      },
      produtos: {
        title: 'SaaS Nexalytix Ecosystem',
        href: 'produtos.html',
        blurbBySize: {
          pequena: 'ERP, Financeiro e AgendaBella foram pensados para tirar a operação da planilha sem o peso de uma implantação grande.',
          media: 'CRM e ERP ajudam a profissionalizar processos que já existem, com a mesma base técnica dos nossos projetos sob medida.',
          startup: 'CRM, BG-Check e Transcribe fazem sentido para quem precisa de agilidade sem abrir mão de governança.',
          grande: 'Os produtos do Ecosystem também se integram a operações maiores como módulos complementares aos sistemas já existentes.',
        },
      },
      seguranca: {
        title: 'Infraestrutura e Cibersegurança',
        href: 'infraestrutura-e-ciberseguranca.html',
        blurbBySize: {
          pequena: 'Começamos por backup baseado em imagem e proteção contra ransomware — a lacuna mais comum em empresas menores.',
          media: 'Endpoints, identidade e SIEM organizados numa única frente, sem somar cinco fornecedores diferentes.',
          startup: 'Infraestrutura como código, FinOps e segurança desde o início, para crescer sem reconstruir depois.',
          grande: 'Governança de acesso, SIEM e disaster recovery orquestrado para ambientes híbridos e regulados.',
        },
      },
      parceiros: {
        title: 'Produtos e Parceiros (Acronis · ManageEngine · Omid Cloud)',
        href: 'parceiros.html',
        blurbBySize: {
          pequena: 'Acronis e ManageEngine cobrem bem o essencial de proteção e gestão de TI para pequenas empresas.',
          media: 'O portfólio completo dos três parceiros costuma resolver várias frentes de uma vez, sem somar fornecedores.',
          startup: 'A Omid Cloud também atende quem precisa de datacenter nacional por exigência regulatória ou de latência.',
          grande: 'Para operações grandes e reguladas, combinamos os três parceiros conforme a exigência de cada workload.',
        },
      },
      diagnostico: {
        title: 'Diagnóstico Digital completo',
        href: 'app-completo.html#/consultoria/diagnostico-digital',
        blurbBySize: {
          pequena: 'Em poucas semanas, mapeamos o que resolve o problema real da sua operação — sem comprometer investimento ainda.',
          media: 'O diagnóstico aponta prioridade entre sistemas, dados e processos antes de qualquer contratação.',
          startup: 'Ajuda a decidir onde investir primeiro sem travar a velocidade que uma tech/startup precisa manter.',
          grande: 'Mapeia riscos e prioridades entre áreas e sistemas legados antes de comprometer orçamento.',
        },
      },
    };

    let step = 1;
    let chosenInterest = null;
    let chosenSize = null;

    const steps = finderRoot.querySelectorAll('.finder-step');
    const dots = finderRoot.querySelectorAll('.finder-progress-dot');

    function showStep(n){
      steps.forEach(s => { s.hidden = Number(s.dataset.step) !== n; });
      dots.forEach(d => { d.dataset.active = String(Number(d.dataset.dot) === n); });
    }

    finderRoot.querySelectorAll('[data-interest]').forEach(chip => {
      chip.addEventListener('click', () => {
        chosenInterest = chip.dataset.interest;
        finderRoot.querySelectorAll('[data-interest]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
        step = 2;
        showStep(2);
      });
    });

    finderRoot.querySelectorAll('[data-size]').forEach(chip => {
      chip.addEventListener('click', () => {
        chosenSize = chip.dataset.size;
        finderRoot.querySelectorAll('[data-size]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
        const result = RESULTS[chosenInterest];
        const out = finderRoot.querySelector('[data-finder-result]');
        if (result && out) {
          const blurb = result.blurbBySize[chosenSize] || '';
          out.innerHTML = `<p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Recomendamos</p><h3 class="mt-2 text-2xl font-semibold">${result.title}</h3><p class="mt-3 text-sm leading-relaxed text-muted-foreground">${blurb}</p><div class="mt-6 flex flex-wrap gap-3"><a href="${result.href}" class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Ver ${result.title}</a><a href="contato.html" class="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-surface">Falar com um especialista</a></div>`;
        }
        step = 3;
        showStep(3);
      });
    });

    finderRoot.querySelectorAll('[data-finder-restart]').forEach(btn => {
      btn.addEventListener('click', () => {
        chosenInterest = null; chosenSize = null; step = 1;
        finderRoot.querySelectorAll('[aria-pressed]').forEach(c => c.setAttribute('aria-pressed','false'));
        showStep(1);
      });
    });

    showStep(1);
  }

  /* ---------- contact form (CRM via Make.com webhook) ---------- */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cf-name').value, email = document.getElementById('cf-email').value, phone = document.getElementById('cf-phone').value, company = document.getElementById('cf-company').value, topic = document.getElementById('cf-topic').value, message = document.getElementById('cf-message').value;
      const submitBtn = document.getElementById('cf-submit');
      const note = document.getElementById('cf-note');

      function fallbackToMailto(){
        const subject = encodeURIComponent('Contato via site - ' + topic);
        const body = encodeURIComponent('Nome: ' + name + '\nTelefone: ' + phone + '\nEmpresa: ' + company + '\nE-mail: ' + email + '\nÁrea de interesse: ' + topic + '\n\n' + message);
        note.textContent = 'Abrindo seu aplicativo de e-mail com a mensagem preenchida...';
        note.hidden = false;
        window.location.href = 'mailto:contato@nexalytix.com.br?subject=' + subject + '&body=' + body;
      }

      if (!MAKE_WEBHOOK_URL || MAKE_WEBHOOK_URL.indexOf('COLOQUE_AQUI') !== -1) {
        fallbackToMailto();
        return;
      }

      submitBtn.disabled = true;
      note.hidden = true;

      const payload = {
        nome: name,
        email: email,
        telefone: phone,
        interesse: topic,
        produto: [topic],
        mensagem: message,
        origem: buildOrigem(),
        status: 'ldr',
        createdAt: new Date().toISOString(),
      };

      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(() => {
          note.textContent = 'Mensagem enviada! Nosso time responde em até 1 dia útil.';
          note.hidden = false;
          form.reset();
        })
        .catch(() => {
          fallbackToMailto();
        })
        .finally(() => {
          submitBtn.disabled = false;
        });
    });
  }
});
