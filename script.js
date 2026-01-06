let now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();
let editing = null;
let isLoggedIn = false;

const STORAGE_KEY = 'calendario_icead_events';
let events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

function saveStorage(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/* 🔒 controla edição do modal */
function setModalReadOnly(isReadOnly){
  const fields = [
    'modalType',
    'modalHorario',
    'modalAbertura',
    'modalLouvor',
    'modalPalavra'
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.disabled = isReadOnly;
  });
}

/* Eventos fixos */
function ensureFixedEvents(year, month, containerEvents){
  for(let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++){
    const dt = new Date(year, month, d);
    const iso = dt.toISOString().slice(0,10);
    if(!containerEvents[iso]) containerEvents[iso] = [];
    const hasManualNoCulto = containerEvents[iso].some(e => e.type === 'Não teremos culto');

    if(dt.getDay() === 0){
      if(!containerEvents[iso].some(e => e.type === 'EBD'))
        containerEvents[iso].push({ type:'EBD', details:{}, _auto:true });

      if(!hasManualNoCulto && !containerEvents[iso].some(e => e.type === 'Culto'))
        containerEvents[iso].push({ type:'Culto', details:{}, _auto:true });
    }

    if(dt.getDay() === 3){
      if(!hasManualNoCulto && !containerEvents[iso].some(e => e.type === 'Culto'))
        containerEvents[iso].push({ type:'Culto', details:{}, _auto:true });
    }
  }
}

/* ---------- render ---------- */
function renderCalendar(){
  const monthNames = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  document.getElementById('monthTitle').textContent =
    monthNames[currentMonth] + ' / ' + currentYear;

  const evCopy = JSON.parse(JSON.stringify(events || {}));
  ensureFixedEvents(currentYear, currentMonth, evCopy);

  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const total = new Date(currentYear, currentMonth + 1, 0).getDate();

  for(let b = 0; b < firstDay; b++){
    calendar.appendChild(document.createElement('div')).className = 'day';
  }

  for(let d = 1; d <= total; d++){
    const dateObj = new Date(currentYear, currentMonth, d);
    const iso = dateObj.toISOString().slice(0,10);
    const div = document.createElement('div');
    div.className = 'day';
    div.innerHTML = `<strong>${d}</strong>`;

    const dayEvents = evCopy[iso] || [];

    dayEvents.forEach((ev, idx) => {
      const evDiv = document.createElement('div');
      let cls = (ev.type || 'Outro').replace(/\s+/g,'_');
      evDiv.className = 'event ' + cls;

      const det = ev.details || {};
      evDiv.textContent = `${ev.type} • ${det.horario || '--:--'}`;

      evDiv.onclick = (e) => {
        e.stopPropagation();
        if(isLoggedIn){
          openModalForEdit(iso, idx, ev);
        } else {
          openModalForView(ev);
        }
      };

      if(isLoggedIn){
        const actions = document.createElement('div');
        actions.className = 'actions';

        const editBtn = document.createElement('span');
        editBtn.className = 'icon';
        editBtn.textContent = '✏️';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          openModalForEdit(iso, idx, ev);
        };

        const delBtn = document.createElement('span');
        delBtn.className = 'icon';
        delBtn.textContent = '🗑️';
        delBtn.onclick = (e) => {
          e.stopPropagation();
          confirmDelete(iso, idx);
        };

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        evDiv.appendChild(actions);
      }

      div.appendChild(evDiv);
    });

    div.onclick = () => {
      if(isLoggedIn) openModalForAdd(iso);
    };

    calendar.appendChild(div);
  }
}

/* ---------- modal ---------- */
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
  document.getElementById('save-event').style.display = 'inline-block';
  document.getElementById('modalOverlay').style.display = 'flex';
}

function openModalForView(ev){
  setModalReadOnly(true);

  document.getElementById('modalDate').value = '';
  document.getElementById('modalType').value = ev.type;
  document.getElementById('modalHorario').value = ev.details?.horario || '';
  document.getElementById('modalAbertura').value = ev.details?.abertura || '';
  document.getElementById('modalLouvor').value = ev.details?.louvor || '';
  document.getElementById('modalPalavra').value = ev.details?.palavra || '';

  document.getElementById('modalDelete').style.display = 'none';
  document.getElementById('save-event').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal(){
  document.getElementById('modalOverlay').style.display = 'none';
  setModalReadOnly(false);
  document.getElementById('save-event').style.display = 'inline-block';
}

document.getElementById('modalCancel').addEventListener('click', closeModal);

/* salvar */
document.getElementById('save-event').addEventListener('click', () => {
  const iso = document.getElementById('modalDate').value;
  const type = document.getElementById('modalType').value;
  const horario = document.getElementById('modalHorario').value.trim();
  const abertura = document.getElementById('modalAbertura').value.trim();
  const louvor = document.getElementById('modalLouvor').value.trim();
  const palavra = document.getElementById('modalPalavra').value.trim();

  if(!events[iso]) events[iso] = [];

  const evObj = { type, details:{ horario, abertura, louvor, palavra } };

  if(editing) events[iso][editing.idx] = evObj;
  else events[iso].push(evObj);

  saveStorage();
  closeModal();
  renderCalendar();
});

/* excluir */
document.getElementById('modalDelete').addEventListener('click', () => {
  if(!editing) return;
  const { iso, idx } = editing;

  events[iso].splice(idx,1);
  if(events[iso].length === 0) delete events[iso];

  saveStorage();
  closeModal();
  renderCalendar();
});

function confirmDelete(iso, idx){
  if(!confirm('Excluir evento?')) return;
  events[iso].splice(idx,1);
  if(events[iso].length === 0) delete events[iso];
  saveStorage();
  renderCalendar();
}

/* navegação */
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

/* dark mode */
document.getElementById('toggleDark').onclick = () => {
  document.body.classList.toggle('dark');
};

/* login */
document.getElementById('btnLogin').onclick = () => {
  const user = prompt("Usuário:");
  const pass = prompt("Senha:");

  if(user === 'admin' && pass === '1234'){
    isLoggedIn = true;
    alert("Login OK");
    document.querySelectorAll(".edit-only").forEach(e => e.style.display = 'flex');
    document.getElementById('btnLogin').style.display = 'none';
    renderCalendar();
  } else {
    alert("Login inválido");
  }
};

/* inicia */
renderCalendar();let now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();
let editing = null;
let isLoggedIn = false;

const STORAGE_KEY = 'calendario_icead_events';
let events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

function saveStorage(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/* 🔒 controla edição */
function setModalReadOnly(isReadOnly){
  const ids = [
    'modalType',
    'modalHorario',
    'modalAbertura',
    'modalLouvor',
    'modalPalavra'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.disabled = isReadOnly;
  });
}

/* Eventos automáticos */
function ensureFixedEvents(year, month, container){
  for(let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++){
    const dt = new Date(year, month, d);
    const iso = dt.toISOString().slice(0,10);
    if(!container[iso]) container[iso] = [];

    const hasNoCulto = container[iso].some(e => e.type === 'Não teremos culto');

    if(dt.getDay() === 0){
      if(!container[iso].some(e => e.type === 'EBD'))
        container[iso].push({ type:'EBD', details:{}, _auto:true });

      if(!hasNoCulto && !container[iso].some(e => e.type === 'Culto'))
        container[iso].push({ type:'Culto', details:{}, _auto:true });
    }

    if(dt.getDay() === 3){
      if(!hasNoCulto && !container[iso].some(e => e.type === 'Culto'))
        container[iso].push({ type:'Culto', details:{}, _auto:true });
    }
  }
}

/* ---------- render ---------- */
function renderCalendar(){
  const monthNames = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  document.getElementById('monthTitle').textContent =
    `${monthNames[currentMonth]} / ${currentYear}`;

  const evCopy = JSON.parse(JSON.stringify(events));
  ensureFixedEvents(currentYear, currentMonth, evCopy);

  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const total = new Date(currentYear, currentMonth + 1, 0).getDate();

  for(let i = 0; i < firstDay; i++){
    calendar.appendChild(document.createElement('div')).className = 'day';
  }

  for(let d = 1; d <= total; d++){
    const iso = new Date(currentYear, currentMonth, d).toISOString().slice(0,10);
    const box = document.createElement('div');
    box.className = 'day';
    box.innerHTML = `<strong>${d}</strong>`;

    (evCopy[iso] || []).forEach((ev, idx) => {
      const div = document.createElement('div');
      div.className = 'event ' + ev.type.replace(/\s+/g,'_');

      const det = ev.details || {};
      div.textContent = `${ev.type} • ${det.horario || '--:--'}`;

      div.onclick = (e) => {
        e.stopPropagation();
        if(isLoggedIn){
          openModalForEdit(iso, idx, ev);
        } else {
          openModalForView(ev);
        }
      };

      if(isLoggedIn){
        const actions = document.createElement('div');
        actions.className = 'actions';

        const edit = document.createElement('span');
        edit.className = 'icon';
        edit.textContent = '✏️';
        edit.onclick = (e) => {
          e.stopPropagation();
          openModalForEdit(iso, idx, ev);
        };

        const del = document.createElement('span');
        del.className = 'icon';
        del.textContent = '🗑️';
        del.onclick = (e) => {
          e.stopPropagation();
          confirmDelete(iso, idx);
        };

        actions.appendChild(edit);
        actions.appendChild(del);
        div.appendChild(actions);
      }

      box.appendChild(div);
    });

    box.onclick = () => {
      if(isLoggedIn) openModalForAdd(iso);
    };

    calendar.appendChild(box);
  }
}

/* ---------- modal ---------- */
function openModalForAdd(iso){
  editing = null;
  setModalReadOnly(false);

  modalDate.value = iso;
  modalType.value = 'Culto';
  modalHorario.value = '';
  modalAbertura.value = '';
  modalLouvor.value = '';
  modalPalavra.value = '';

  modalDelete.style.display = 'none';
  saveEvent.style.display = 'inline-block';
  modalOverlay.style.display = 'flex';
}

function openModalForEdit(iso, idx, ev){
  editing = { iso, idx };
  setModalReadOnly(false);

  modalDate.value = iso;
  modalType.value = ev.type;
  modalHorario.value = ev.details?.horario || '';
  modalAbertura.value = ev.details?.abertura || '';
  modalLouvor.value = ev.details?.louvor || '';
  modalPalavra.value = ev.details?.palavra || '';

  modalDelete.style.display = 'inline-block';
  saveEvent.style.display = 'inline-block';
  modalOverlay.style.display = 'flex';
}

function openModalForView(ev){
  setModalReadOnly(true);

  modalDate.value = '';
  modalType.value = ev.type;
  modalHorario.value = ev.details?.horario || '';
  modalAbertura.value = ev.details?.abertura || '';
  modalLouvor.value = ev.details?.louvor || '';
  modalPalavra.value = ev.details?.palavra || '';

  modalDelete.style.display = 'none';
  saveEvent.style.display = 'none';
  modalOverlay.style.display = 'flex';
}

function closeModal(){
  modalOverlay.style.display = 'none';
  setModalReadOnly(false);
  saveEvent.style.display = 'inline-block';
}

modalCancel.onclick = closeModal;

/* salvar */
saveEvent.onclick = () => {
  const iso = modalDate.value;
  if(!events[iso]) events[iso] = [];

  const evObj = {
    type: modalType.value,
    details:{
      horario: modalHorario.value,
      abertura: modalAbertura.value,
      louvor: modalLouvor.value,
      palavra: modalPalavra.value
    },
    manual:true
  };

  if(editing){
    events[iso][editing.idx] = evObj;
  } else {
    events[iso].push(evObj);
  }

  saveStorage();
  closeModal();
  renderCalendar();
};

/* excluir */
modalDelete.onclick = () => {
  if(!editing) return;
  events[editing.iso].splice(editing.idx,1);
  if(events[editing.iso].length === 0) delete events[editing.iso];
  saveStorage();
  closeModal();
  renderCalendar();
};

function confirmDelete(iso, idx){
  if(!confirm('Excluir evento?')) return;
  events[iso].splice(idx,1);
  if(events[iso].length === 0) delete events[iso];
  saveStorage();
  renderCalendar();
}

/* navegação */
prev.onclick = () => {
  currentMonth--;
  if(currentMonth < 0){ currentMonth = 11; currentYear--; }
  renderCalendar();
};

next.onclick = () => {
  currentMonth++;
  if(currentMonth > 11){ currentMonth = 0; currentYear++; }
  renderCalendar();
};

/* dark */
toggleDark.onclick = () => document.body.classList.toggle('dark');

/* login */
btnLogin.onclick = () => {
  if(prompt('Usuário:') === 'admin' && prompt('Senha:') === '1234'){
    isLoggedIn = true;
    alert('Login OK');
    document.querySelectorAll('.edit-only').forEach(e => e.style.display='flex');
    btnLogin.style.display = 'none';
    renderCalendar();
  } else {
    alert('Login inválido');
  }
};

/* init */
renderCalendar();

