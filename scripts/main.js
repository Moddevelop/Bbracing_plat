// ==============================================
// VARIABLE
// ==============================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let datosEscena = null;
let elementos = [];
let seleccionado = null;

let camara = { x:0, y:800, z:-1600, rotX:0.75, rotY:0, zoom:1 };
const VELOCIDAD = 12;

const ESTILOS = {
 contenedor:     { forma:'caja',    color:'#ef4444', tam:100 },
  waypoint:       { forma:'esfera',  color:'#f59e0b', tam:25 },
  planta:         { forma:'cilindro',color:'#22c55e', tam:35 },
  arbol:          { forma:'cilindro',color:'#15803d', tam:55 },
  roca:           { forma:'cubo',    color:'#78716c', tam:45 },
  montaña:        { forma:'cubo',    color:'#78716c', tam:120 },
  outofbounds:    { forma:'caja',    color:'#dc2626', tam:160, transparente:true },
  powerup:        { forma:'esfera',  color:'#27B4F5', tam:22 },
  agua:           { forma:'plano',   color:'#3b82f6', tam:180 },
  fuerza:         { forma:'caja',    color:'#8b5cf6', tam:150 },
  sonido:         { forma:'anillo',  color:'#ec4899', tam:70 },
  efecto:         { forma:'esfera',  color:'#06b6d4', tam:30 },
  prop:           { forma:'cubo',    color:'#a855f7', tam:40 },
  rampa:          { forma:'plano',   color:'#8A4E27', tam:26 },
  otro:           { forma:'cubo',    color:'#9ca3af', tam:30 }
};

function mostrarMensaje(texto){
  const m = document.getElementById('mensaje');
  m.textContent = texto; m.style.display='block';
  setTimeout(()=>m.style.display='none',5000);
}

function proyectar(x,y,z){
  if(typeof x!=='number' || typeof y!=='number' || typeof z!=='number') return null;
  let rx = x*Math.cos(camara.rotY) - z*Math.sin(camara.rotY);
  let rz = x*Math.sin(camara.rotY) + z*Math.cos(camara.rotY);
  let ry = y*Math.cos(camara.rotX) - rz*Math.sin(camara.rotX);
  rz = y*Math.sin(camara.rotX) + rz*Math.cos(camara.rotX);
  let dx = rx - camara.x, dy = ry - camara.y, dz = rz - camara.z;
  if(dz < 50) return null;
  const fov = 500 / camara.zoom;
  return { x:canvas.width/2 + (dx/dz)*fov, y:canvas.height/2 - (dy/dz)*fov, prof:dz };
}

function dibujarCubo(x,y,z,tam,color,res,trans=false){
  if(typeof x!=='number' || typeof y!=='number' || typeof z!=='number' || typeof tam!=='number') return;
  const t = tam/2;
  const vertices = [proyectar(x-t,y-t,z-t), proyectar(x+t,y-t,z-t), proyectar(x+t,y+t,z-t), proyectar(x-t,y+t,z-t), proyectar(x-t,y-t,z+t), proyectar(x+t,y-t,z+t), proyectar(x+t,y+t,z+t), proyectar(x-t,y+t,z+t)];
  const v = vertices.filter(p => p && typeof p.x==='number' && typeof p.y==='number');
  if(v.length < 4) return;
  ctx.fillStyle = res ? '#fff' : color; ctx.globalAlpha = res ? 1 : (trans ? 0.25 : 0.85);
  ctx.beginPath(); ctx.moveTo(v[0].x, v[0].y);
  [1,2,3,0,4,5,6,7,4,0,3,7,6,2,5,1].forEach(i=>{ if(v[i]) ctx.lineTo(v[i].x, v[i].y); });
  ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth = res ? 2.5 : 1; ctx.stroke(); ctx.globalAlpha=1;
}

function dibujarEsfera(x,y,z,tam,color,res){
  if(typeof x!=='number' || typeof y!=='number' || typeof z!=='number' || typeof tam!=='number') return;
  const p = proyectar(x,y,z); if(!p || typeof p.x!=='number' || typeof p.y!=='number') return;
  const t = tam * camara.zoom * (320/Math.max(p.prof, 1));
  ctx.beginPath(); ctx.arc(p.x,p.y,t,0,Math.PI*2); ctx.fillStyle=res?'#fff':color; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=res?2:1; ctx.stroke();
}

function dibujarPlano(x,y,z,tam,color,res){
  if(typeof x!=='number' || typeof y!=='number' || typeof z!=='number' || typeof tam!=='number') return;
  const t = tam/2;
  const vertices = [proyectar(x-t,y,z-t),proyectar(x+t,y,z-t),proyectar(x+t,y,z+t),proyectar(x-t,y,z+t)];
  const v = vertices.filter(p => p && typeof p.x==='number' && typeof p.y==='number');
  if(v.length<4) return;
  ctx.fillStyle=color; ctx.globalAlpha=0.4; ctx.beginPath(); v.forEach(p=>ctx.lineTo(p.x,p.y)); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=res?2:1; ctx.stroke(); ctx.globalAlpha=1;
}

function dibujarAnillo(x,y,z,tam,color,res){
  if(typeof x!=='number' || typeof y!=='number' || typeof z!=='number' || typeof tam!=='number') return;
  const p = proyectar(x,y,z); if(!p || typeof p.x!=='number' || typeof p.y!=='number') return;
  const t = tam * camara.zoom * (320/Math.max(p.prof, 1));
  ctx.beginPath(); ctx.arc(p.x,p.y,t,0,Math.PI*2); ctx.strokeStyle=res?'#fff':color; ctx.lineWidth=res?3:1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(p.x,p.y,t*0.5,0,Math.PI*2); ctx.stroke();
}

function darEstilo(tipo,ruta){
  tipo = (tipo || '').toString(); ruta = (ruta || '').toString();
  if(tipo === 'VuContainerEntity') return ESTILOS.contenedor;
  if(tipo === 'VuAiWaypointEntity') return ESTILOS.waypoint;
  if(tipo.includes('OutOfBounds')) return ESTILOS.outofbounds;
  if(ruta.includes('#Plant') || ruta.includes('Plant')) return ESTILOS.planta;
  if(ruta.includes('#Tree') || ruta.includes('Tree')) return ESTILOS.arbol;
  if(tipo.includes('Powerup') || ruta.includes('#Powerup')) return ESTILOS.powerup;
  if(tipo.includes('Water') || ruta.includes('#Water')) return ESTILOS.agua;
  if(tipo.includes('Audio') || tipo.includes('Reverb')) return ESTILOS.sonido;
  if(ruta.includes('#Effects') || ruta.includes('Effects')) return ESTILOS.efecto;
  if(ruta.includes('Prop_Ramp') || ruta.includes('Ramp')) return ESTILOS.rampa;
  if(tipo.includes('Prop') || ruta.includes('#Prop')) return ESTILOS.prop;
  return ESTILOS.otro;
}

function obtenerHijos(entidad){
  if(!entidad || typeof entidad!=='object') return [];
  let lista = [];
  let fuentes = [entidad.entities, entidad.data?.entities, entidad.data?.ChildEntities, entidad.ChildEntities];
  for(let f of fuentes){ if(!f) continue; if(Array.isArray(f)) lista.push(...f); else if(typeof f==='object') lista.push(...Object.values(f)); }
  return lista;
}

function sacarDatos(entidad,padre={x:0,y:0,z:0}){
  if(!entidad || typeof entidad!=='object') return;
  const t = entidad?.data?.Components?.VuTransformComponent?.Properties || {};
  const x = (Number(t.Position?.X) || 0) + (Number(padre.x) || 0);
  const y = (Number(t.Position?.Y) || 0) + (Number(padre.y) || 0);
  const z = (Number(t.Position?.Z) || 0) + (Number(padre.z) || 0);
  const esc = Math.max(Number(t.Scale?.X) || 1, Number(t.Scale?.Y) || 1, Number(t.Scale?.Z) || 1, 1);
  const est = darEstilo(entidad.type, entidad.assetRef || entidad.type);
  if(entidad.type || entidad.name || entidad.assetRef){
    elementos.push({obj:entidad, nombre:entidad.name||'Sin Nombre', tipo:entidad.type||'', ruta:entidad.assetRef||entidad.type||'', x:x, y:y, z:z, tam:est.tam*esc, estilo:est});
  }
  obtenerHijos(entidad).forEach(hijo=>sacarDatos(hijo,{x,y,z}));
}

function dibujarTodo(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  elementos.sort((a,b)=>{ const pa=proyectar(a.x,a.y,a.z), pb=proyectar(b.x,b.y,b.z); return (pa?.prof||9999)-(pb?.prof||9999); });
  elementos.forEach(el=>{
    if(!el || typeof el.x!=='number' || typeof el.y!=='number' || typeof el.z!=='number') return;
    const res = seleccionado===el; const trans = el.estilo.transparente || false;
    switch(el.estilo.forma){
      case 'caja': case 'cubo': dibujarCubo(el.x,el.y,el.z,el.tam,el.estilo.color,res,trans); break;
      case 'esfera': dibujarEsfera(el.x,el.y,el.z,el.tam,el.estilo.color,res); break;
      case 'plano': dibujarPlano(el.x,el.y,el.z,el.tam*3,el.estilo.color,res); break;
      case 'anillo': dibujarAnillo(el.x,el.y,el.z,el.tam,el.estilo.color,res); break;
    }
  });
  if(seleccionado && typeof seleccionado.x==='number' && typeof seleccionado.y==='number' && typeof seleccionado.z==='number'){
    const p=proyectar(seleccionado.x, seleccionado.y+seleccionado.tam+25, seleccionado.z);
    if(p && typeof p.x==='number' && typeof p.y==='number'){ ctx.fillStyle='#fff'; ctx.font='bold 13px system-ui'; ctx.fillText(seleccionado.nombre,p.x+8,p.y); }
  }
}

let tocando={num:0,ax:0,ay:0,ad:0, mueveConDedos:false};
canvas.ontouchstart=e=>{
  e.preventDefault(); tocando.num=e.touches.length;
  if(tocando.num===1){ tocando.ax=e.touches[0].clientX; tocando.ay=e.touches[0].clientY; tocando.mueveConDedos=false; comprobar(e.touches[0].clientX,e.touches[0].clientY); }
  else if(tocando.num===2){ const t1=e.touches[0],t2=e.touches[1]; tocando.ad=Math.hypot(t1.clientX-t2.clientX,t1.clientY-t2.clientY); tocando.mueveConDedos=true; }
};
canvas.ontouchmove=e=>{
  e.preventDefault();
  if(tocando.num===1 && !tocando.mueveConDedos){ camara.rotY+=(e.touches[0].clientX-tocando.ax)*0.005; camara.rotX+=(e.touches[0].clientY-tocando.ay)*0.005; camara.rotX=Math.max(-1.4,Math.min(1.4,camara.rotX)); tocando.ax=e.touches[0].clientX; tocando.ay=e.touches[0].clientY; }
  else if(tocando.num===2){
    const t1=e.touches[0],t2=e.touches[1]; const d=Math.hypot(t1.clientX-t2.clientX,t1.clientY-t2.clientY);
    camara.zoom*=tocando.ad/d; camara.zoom=Math.max(0.08,Math.min(12,camara.zoom));
    const dx=(t1.clientX+t2.clientX)/2 - tocando.ax; const dy=(t1.clientY+t2.clientY)/2 - tocando.ay;
    camara.x -= dx * 0.5 * camara.zoom; camara.y += dy * 0.5 * camara.zoom;
    tocando.ad=d; tocando.ax=(t1.clientX+t2.clientX)/2; tocando.ay=(t1.clientY+t2.clientY)/2;
  }
  dibujarTodo();
};
canvas.ontouchend=()=>tocando.num=0;

function comprobar(px,py){
  seleccionado=null;
  const ord=[...elementos].sort((a,b)=>{ const pa=proyectar(a.x,a.y,a.z),pb=proyectar(b.x,b.y,b.z); return (pb?.prof||9999)-(pa?.prof||9999); });
  for(let el of ord){ if(!el || typeof el.x!=='number' || typeof el.y!=='number' || typeof el.z!=='number') continue; const p=proyectar(el.x,el.y,el.z); if(!p || typeof p.x!=='number' || typeof p.y!=='number') continue; const t=el.tam*camara.zoom*(320/Math.max(p.prof,1))+15; if(Math.hypot(px-p.x,py-p.y)<t){ seleccionado=el; mostrarInfo(el); actualizarSeleccionEnLista(); break; } }
  if(!seleccionado){
    document.getElementById('info').style.display='none';
    actualizarSeleccionEnLista();
  }
  dibujarTodo();
}

function camaraReset(){ camara={x:0,y:800,z:-1600,rotX:0.75,rotY:0,zoom:1}; dibujarTodo(); }
function centrarEnSeleccionado(){ if(!seleccionado) return mostrarMensaje('Selecciona primero un objeto'); camara.x=seleccionado.x; camara.y=seleccionado.y+200; camara.z=seleccionado.z-800; dibujarTodo(); }
function subir(){ camara.y += VELOCIDAD; dibujarTodo(); }
function bajar(){ camara.y -= VELOCIDAD; dibujarTodo(); }
function izquierda(){ camara.x -= VELOCIDAD*Math.cos(camara.rotY); camara.z += VELOCIDAD*Math.sin(camara.rotY); dibujarTodo(); }
function derecha(){ camara.x += VELOCIDAD*Math.cos(camara.rotY); camara.z -= VELOCIDAD*Math.sin(camara.rotY); dibujarTodo(); }
function mostrarInfo(el){ const info=document.getElementById('info'); info.style.display='block'; info.innerHTML=`<strong>${el.nombre}</strong><br>Tipo: ${el.tipo}<br> <i class="fa-solid fa-map-pin"></i> X:${el.x.toFixed(1)} Y:${el.y.toFixed(1)} Z:${el.z.toFixed(1)}`; }

function cargarJSON(){
  const i=document.createElement('input'); i.type='file'; i.accept='.json,.txt';
  i.onchange=e=>{ const r=new FileReader(); r.onload=ev=>{ try{ datosEscena=JSON.parse(ev.target.result); elementos=[]; seleccionado=null; const raiz=datosEscena.RootEntity || datosEscena.rootEntity || datosEscena; if(!raiz) return mostrarMensaje('❌ No se encontró la raíz'); sacarDatos(raiz); mostrarMensaje(`✅ Cargados ${elementos.length} objetos`); camaraReset(); construirFiltroTipos(); actualizarLista(); dibujarTodo(); }catch(err){ mostrarMensaje('❌ Error: '+err.message); console.error(err); } }; r.readAsText(e.target.files[0]); }; i.click();
}

function ajustar(){ canvas.width=innerWidth; canvas.height=innerHeight; dibujarTodo(); }
window.onresize=ajustar; ajustar();

// ==============================================
// 🆕 FUNCIONES NUEVAS DEL MENÚ (SIN TOCAR LO DE ARRIBA)
// ==============================================
function alternarMenu(){
  document.getElementById('menuLateral').classList.toggle('abierto');
}

function construirFiltroTipos(){
  const filtro = document.getElementById('filtroTipo');
  const tiposUnicos = [...new Set(elementos.map(e=>e.tipo||'General'))].sort();
  filtro.innerHTML = '<option value="todos">Todos los tipos</option>';
  tiposUnicos.forEach(t=>{
    const op = document.createElement('option');
    op.value = t; op.textContent = t||'Sin tipo';
    filtro.appendChild(op);
  });
}

function actualizarLista(){
  const busqueda = document.getElementById('buscador').value.toLowerCase().trim();
  const tipoFiltro = document.getElementById('filtroTipo').value;
  const lista = document.getElementById('listaObjetos');
  const contador = document.getElementById('contador');

  lista.innerHTML = '';
  let filtrados = elementos.filter(el=>{
    const coincideBusqueda = el.nombre.toLowerCase().includes(busqueda) || el.tipo.toLowerCase().includes(busqueda);
    const coincideTipo = tipoFiltro==='todos' || el.tipo===tipoFiltro;
    return coincideBusqueda && coincideTipo;
  });

  contador.textContent = `${filtrados.length} objetos encontrados`;

  filtrados.forEach((el,indice)=>{
    const item = document.createElement('div');
    item.className = `itemObjeto ${seleccionado===el?'seleccionado':''}`;
    item.textContent = el.nombre || `Objeto ${indice+1}`;
    item.title = `${el.tipo}\nX:${el.x.toFixed(1)} Y:${el.y.toFixed(1)} Z:${el.z.toFixed(1)}`;
    item.onclick = ()=>{
      seleccionado = el;
      mostrarInfo(el);
      centrarEnSeleccionado();
      actualizarLista();
    };
    lista.appendChild(item);
  });
}

function actualizarSeleccionEnLista(){
  document.querySelectorAll('.itemObjeto').forEach(item=>item.classList.remove('seleccionado'));
  if(!seleccionado) return;
  const items = document.querySelectorAll('.itemObjeto');
  items.forEach((item,i)=>{
    const datosItem = elementos.find(e=>e.nombre===item.textContent || elementos.indexOf(e)===i);
    if(datosItem===seleccionado) item.classList.add('seleccionado');
  });
}