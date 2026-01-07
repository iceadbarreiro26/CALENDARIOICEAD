// ---------------------- FIREBASE ----------------------
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js"></script>

<script>
  // Cole aqui sua configuração do Firebase Web
  const firebaseConfig = {
    apiKey: "AIzaSyDeilE0hgCa2PBVUpoewLjD_N0sR9fsyPE",
    authDomain: "calendarioicead.firebaseapp.com",
    databaseURL: "calendarioicead",
    projectId: "calendarioicead.firebasestorage.app"",
    storageBucket: "calendarioicead.firebasestorage.app"
    messagingSenderId:"750532290008",
    appId: "1:750532290008:web:70c95bd9a75a6580e27ead"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
</script>

// ---------------------- CALENDÁRIO ----------------------
let now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();
let editing = null;
let isLoggedIn = false;

let events = {}; // será carregado do Firebase

// 🔒 controla edição do modal
function setModalReadOnly(isReadOnly){
  const fields = ['modalType','modalHorario','modalAbertura','modalLouvor','modalPalavra'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.disabled = isReadOnly;
  });
}

// ---------- FIREBASE FUNÇÕES ----------
async function loadEvents() {
  const snapshot = await db.ref('/events').get();
  events = snapshot.val() || {};
  renderCalendar();
}

async function saveDay(iso) {
  await db.ref('/events/' + iso).set(events[iso] || []);
}

// ---------- render ----------
function renderCalendar(){
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('monthTitle').textContent = monthNames[currentMonth] + ' / ' + currentYear;

  const evCopy = JSON.parse(JSON.stringify(events || {}));

  // Eventos fixos
  for(let d = 1; d <= new Date(currentYear, currentMonth+1, 0).getDate(); d++){
    const dt = new Date(currentYear,currentMonth,d);
    const iso = dt.toISOString().slice(0,10);
    if(!evCopy[iso]) evCopy[iso] = [];

    const hasManualNoCulto = evCopy[iso].some(e => e.type === 'Não teremos culto');

    if(dt.getDay() === 0){
      if(!evCopy[iso].some(e => e.type === 'EBD')) evCopy[iso].push({ type:'EBD', details:{}, _auto:true });
      if(!hasManualNoCulto && !evCopy[iso].some(e => e.type === 'Culto')) evCopy[iso].push({ type:'Culto', details:{}, _auto:true });
    }
    if(dt.getDay() === 3){
      if(!hasManualNoCulto && !evCopy[iso].some(e => e.type === 'Culto')) evCopy[iso].push({ type:'Culto', details:{}, _auto:true });
    }
  }

  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const total = new Date(currentYear, currentMonth + 1, 0).getDate();

  for(let b=0;b<firstDay;b++){ calendar.appendChild(document.createElement('div')).className='day'; }

  for(let d=1; d<=total; d++){
    const dateObj = new Date(currentYear,currentMonth,d);
    const iso = dateObj.toISOString().slice(0,10);
    const div = document.createElement('div');
    div.className='day';
    div.innerHTML=`<strong>${d}</strong>`;

    const dayEvents = evCopy[iso] || [];

    dayEvents.forEach((ev,idx)=>{
      const evDiv = document.createElement('div');
      let cls = (ev.type||'Outro').replace(/\s+/g,'_');
      evDiv.className='event '+cls;
      const det = ev.details||{};
      evDiv.textContent=`${ev.type} • ${det.horario || '--:--'}`;
      evDiv.onclick=(e)=>{
        e.stopPropagation();
        if(isLoggedIn) openModalForEdit(iso,idx,ev);
        else openModalForView(ev);
      };

      if(isLoggedIn){
        const actions=document.createElement('div');
        actions.className='actions';
        const editBtn=document.createElement('span');
        editBtn.className='icon'; editBtn.textContent='✏️';
        editBtn.onclick=(e)=>{ e.stopPropagation(); openModalForEdit(iso,idx,ev); };
        const delBtn=document.createElement('span');
        delBtn.className='icon'; delBtn.textContent='🗑️';
        delBtn.onclick=(e)=>{ e.stopPropagation(); confirmDelete(iso,idx); };
        actions.appendChild(editBtn); actions.appendChild(delBtn);
        evDiv.appendChild(actions);
      }

      div.appendChild(evDiv);
    });

    div.onclick=()=>{ if(isLoggedIn) openModalForAdd(iso); };
    calendar.appendChild(div);
  }
}

// ---------- modal ----------
function openModalForAdd(iso){
  editing=null;
  setModalReadOnly(false);
  document.getElementById('modalDate').value=iso;
  document.getElementById('modalType').value='Culto';
  document.getElementById('modalHorario').value='';
  document.getElementById('modalAbertura').value='';
  document.getElementById('modalLouvor').value='';
  document.getElementById('modalPalavra').value='';
  document.getElementById('modalDelete').style.display='none';
  document.getElementById('save-event').style.display='inline-block';
  document.getElementById('modalOverlay').style.display='flex';
}

function openModalForEdit(iso,idx,ev){
  editing={iso,idx};
  setModalReadOnly(false);
  document.getElementById('modalDate').value=iso;
  document.getElementById('modalType').value=ev.type;
  document.getElementById('modalHorario').value=ev.details?.horario||'';
  document.getElementById('modalAbertura').value=ev.details?.abertura||'';
  document.getElementById('modalLouvor').value=ev.details?.louvor||'';
  document.getElementById('modalPalavra').value=ev.details?.palavra||'';
  document.getElementById('modalDelete').style.display='inline-block';
  document.getElementById('save-event').style.display='inline-block';
  document.getElementById('modalOverlay').style.display='flex';
}

function openModalForView(ev){
  setModalReadOnly(true);
  document.getElementById('modalDate').value='';
  document.getElementById('modalType').value=ev.type;
  document.getElementById('modalHorario').value=ev.details?.horario||'';
  document.getElementById('modalAbertura').value=ev.details?.abertura||'';
  document.getElementById('modalLouvor').value=ev.details?.louvor||'';
  document.getElementById('modalPalavra').value=ev.details?.palavra||'';
  document.getElementById('modalDelete').style.display='none';
  document.getElementById('save-event').style.display='none';
  document.getElementById('modalOverlay').style.display='flex';
}

function closeModal(){ document.getElementById('modalOverlay').style.display='none'; setModalReadOnly(false); document.getElementById('save-event').style.display='inline-block'; }
document.getElementById('modalCancel').addEventListener('click',closeModal);

// ---------- SALVAR ----------
document.getElementById('save-event').addEventListener('click', async ()=>{
  const iso = document.getElementById('modalDate').value;
  if(!events[iso]) events[iso]=[];

  const ev={
    type:document.getElementById('modalType').value,
    details:{
      horario:document.getElementById('modalHorario').value,
      abertura:document.getElementById('modalAbertura').value,
      louvor:document.getElementById('modalLouvor').value,
      palavra:document.getElementById('modalPalavra').value
    }
  };

  editing ? events[iso][editing.idx]=ev : events[iso].push(ev);

  await saveDay(iso);
  closeModal();
  renderCalendar();
});

// ---------- EXCLUIR ----------
document.getElementById('modalDelete').addEventListener('click', async ()=>{
  if(!editing) return;
  const {iso,idx}=editing;
  events[iso].splice(idx,1);
  if(events[iso].length===0) delete events[iso];
  await saveDay(iso);
  closeModal();
  renderCalendar();
});

function confirmDelete(iso,idx){
  if(!confirm('Excluir evento?')) return;
  events[iso].splice(idx,1);
  if(events[iso].length===0) delete events[iso];
  saveDay(iso).then(()=>renderCalendar());
}

// ---------- NAVEGAÇÃO ----------
document.getElementById('prev').onclick=()=>{ currentMonth--; if(currentMonth<0){currentMonth=11; currentYear--;} renderCalendar(); };
document.getElementById('next').onclick=()=>{ currentMonth++; if(currentMonth>11){currentMonth=0; currentYear++;} renderCalendar(); };

// ---------- DARK MODE ----------
document.getElementById('toggleDark').onclick=()=>{ document.body.classList.toggle('dark'); };

// ---------- LOGIN ----------
document.getElementById('btnLogin').onclick=()=>{
  const user=prompt("Usuário:");
  const pass=prompt("Senha:");
  if(user==='admin' && pass==='1234'){
    isLoggedIn=true;
    alert("Login OK");
    document.querySelectorAll(".edit-only").forEach(e=>e.style.display='flex');
    document.getElementById('btnLogin').style.display='none';
    renderCalendar();
  }else{ alert("Login inválido"); }
};

// ---------- INICIAR ----------
loadEvents();
