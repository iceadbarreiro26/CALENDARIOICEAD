/* ================= CONFIG ================= */
const STORAGE_KEY = 'calendario_icead_events';

let now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();
let editing = null;
let isLoggedIn = false;

let events = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

function saveStorage(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/* ================= READ ONLY ================= */
function setModalReadOnly(state){
  ['modalType','modalHorario','modalAbertura','modalLouvor','modalPalavra']
    .forEach(id => {
      const el = document.getElementById(id);
      if(el) el.disabled = state;
    });
}

/* ================= EVENTOS FIXOS ================= */
function ensureFixedEvents(year, month, container){
  const days = new Date(year, month + 1, 0).getDate();

  for(let d = 1; d <= days; d++){
    const date = new Date(year, month, d);
    const iso = date.toISOString().slice(0,10);
    if(!container[iso]) container[iso] = [];

    const hasNoCulto = container[iso].some(e => e.type === 'Não teremos culto');

    if(date.getDay() === 0){
      if(!container[iso].some(e => e.type === 'EBD'))
        container[iso].push({ type:'EBD', details:{}, _auto:true });

      if(!hasNoCulto && !container[iso].some(e => e.type === 'Culto'))
        container[iso].push({ type:'Culto', details:{}, _auto:true });
    }

    if(date.getDay() === 3){
      if(!hasNoCulto && !container[iso].some(e => e.type === 'Culto'))
        container[iso].push({ type:'Culto', details:{}, _auto:true });
    }
  }
}

/* ================= RENDER ================= */
function renderCalendar(){
  const months = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  document.getElementById('monthTitle').textContent =
    `${months[currentMonth]} / ${currentYear}`;

  const viewEvents = JSON.parse(JSON.stringify(events));
  ensureFixedEvents(currentYear, currentMonth, viewEvents);

  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const total = new Date(currentYear, currentMonth + 1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    calendar.appendChild(document.createElement('div')).className = 'day';
  }

  for(let d=1; d<=total; d++){
    const date = new Date(currentYear, currentMonth, d);
    const iso = date.toISOString().slice(0,10);

    const day = document.createElement('div');
    day.className = 'day';
    day.innerHTML = `<strong>${d}</strong>`;

    (viewEvents[iso] || []).forEach((ev, idx) => {
      const evDiv = document.createElement('div');
      evDiv.className = 'event ' + ev.type.replace(/\s+/g,'_');

      evDiv.textContent = `${ev.type} • ${ev.details?.horario || '--:--'}`;

      evDiv.onclick = e => {
        e.stopPropagation();
        isLoggedIn
          ? openModalForEdit(iso, idx, ev)
          : openModalForView(ev);
      };

      if(isLoggedIn){
        const actions = document.createElement('div');
        actions.className = 'actions';

        const edit = document.createElement('span');
        edit.textContent = '✏️';
        edit.onclick = e => { e.stopPropagation(); openModalForEdit(iso, idx, ev); };

        const del = document.createElement('span');
        del.textContent = '🗑️';
        del.onclick = e => { e.stopPropagation(); confirmDelete(iso, idx); };

        actions.append(edit, del);
        evDiv.appendChild(actions);
      }

      day.appendChild(evDiv);
    });

    if(isLoggedIn) day.onclick = () => openModalForAdd(iso);
    calendar.appendChild(day);
  }
}

/* ================= MODAL ================= */
function openModalForAdd(iso){
  editing = null;
  setModalReadOnly(false);

  document.getElementById('modalDate').value = iso;
  document.getElementById('modalType').value = 'Culto';
  document.getElementById('modalHorario').value = '';
  document.getElementById('modalAbertura').value = '';
  document.getElementById('modalLouvor').value = '';
  document.getElementById('modalPalavra').value = '';

  document.getElementById('modalDelete').style.display = 'none';
  document.getElementById('save-event').style.display = 'inline-block';
  document.getElementById('modalOverlay').style.display = 'flex';
}

function openModalForEdit(iso, idx, ev){
  editing = { iso, idx };
  setModalReadOnly(false);

  document.getElementById('modalDate').value = iso;
  document.getElementById('modalType').value = ev.type;
  document.getElementById('modalHorario').value = ev.details?.horario || '';
  document.getElementById('modalAbertura').value = ev.details?.abertura || '';
  document.getElementById('modalLouvor').value = ev.details?.louvor || '';
  document.getElementById('modalPalavra').value = ev.details?.palavra || '';

  document.getElementById('modalDelete').style.display = 'inline-block';
  document.getElementById('modalOverlay').style.display = 'flex';
}

function openModalForView(ev){
  setModalReadOnly(true);

  document.getElementById('modalType').value = ev.type;
  document.getElementById('modalHorario').value = ev.details?.horario || '';
  document.getElementById('modalAbertura').value = ev.details?.abertura || '';
  document.getElementById('modalLouvor').value = ev.details?.louvor || '';
  document.getElementById('modalPalavra').value = ev.details?.palavra || '';

  document.getElementById('save-event').style.display = 'none';
  document.getElementById('modalDelete').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal(){
  document.getElementById('modalOverlay').style.display = 'none';
  setModalReadOnly(false);
}

/* ================= AÇÕES ================= */
document.getElementById('save-event').onclick = () => {
  const iso = document.getElementById('modalDate').value;
  if(!events[iso]) events[iso] = [];

  const ev = {
    type: document.getElementById('modalType').value,
    details:{
      horario: document.getElementById('modalHorario').value.trim(),
      abertura: document.getElementById('modalAbertura').value.trim(),
      louvor: document.getElementById('modalLouvor').value.trim(),
      palavra: document.getElementById('modalPalavra').value.trim()
    }
  };

  editing ? events[iso][editing.idx] = ev : events[iso].push(ev);

  saveStorage();
  closeModal();
  renderCalendar();
};

document.getElementById('modalDelete').onclick = () => {
  if(!editing) return;
  const { iso, idx } = editing;

  events[iso].splice(idx,1);
  if(events[iso].length === 0) delete events[iso];

  saveStorage();
  closeModal();
  renderCalendar();
};

function confirmDelete(iso, idx){
  if(confirm('Excluir evento?')){
    events[iso].splice(idx,1);
    if(events[iso].length === 0) delete events[iso];
    saveStorage();
    renderCalendar();
  }
}

/* ================= NAV ================= */
document.getElementById('prev').onclick = () => {
  currentMonth--;
  if(currentMonth < 0){ currentMonth = 11; currentYear--; }
  renderCalendar();
};

document.getElementById('next').onclick = () => {
  currentMonth++;
  if(currentMonth > 11){ currentMonth = 0; currentYear++; }
  renderCalendar();
};

/* ================= LOGIN ================= */
document.getElementById('btnLogin').onclick = () => {
  if(prompt('Usuário:') === 'admin' && prompt('Senha:') === '1234'){
    isLoggedIn = true;
    document.getElementById('btnLogin').style.display = 'none';
    renderCalendar();
  } else alert('Login inválido');
};

/* ================= START ================= */
renderCalendar();
