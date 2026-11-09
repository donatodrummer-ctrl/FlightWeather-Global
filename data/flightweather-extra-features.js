/* FlightWeather Global · Radar verticale e avvicinamenti */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
let verticalEnabled=false,approachEnabled=false,selectedAirport=null,approachLayer=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style=document.createElement('style');
style.textContent=`
.fw-extra-button{position:static!important;width:100%;min-height:31px;margin:0;padding:7px 9px;border:1px solid #a879ff;border-radius:5px;background:#101923;color:#f4f8ff;text-align:left;font-size:10px;font-weight:800;touch-action:manipulation}
.fw-extra-button.active{background:#39235d;border-color:#d4b7ff;color:#fff}
.fw-extra-button.approach{border-color:#70d99a}.fw-extra-button.approach.active{background:#16452c;border-color:#a9f2c0}
.fw-feature-panel{position:absolute;z-index:1300;left:50%;top:12px;transform:translateX(-50%);width:min(390px,calc(100vw - 20px));max-height:44dvh;overflow:auto;padding:10px;border:1px solid #a879ff;border-radius:9px;background:#101923f5;color:#eef4fb;box-shadow:0 8px 26px #000c;backdrop-filter:blur(10px);font-size:10px}
.fw-feature-panel[hidden]{display:none!important}
.fw-feature-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:12px;font-weight:900}
.fw-feature-close{border:1px solid #526579;border-radius:5px;background:#1b2a3a;color:#fff;padding:4px 8px;font-weight:800}
.fw-feature-note{margin-top:5px;color:#a9bfd2;font-size:9px;line-height:1.4}
.fw-approach-select{display:block;width:100%;margin-top:7px;padding:7px;border:1px solid #70d99a;border-radius:5px;background:#102b20;color:#eafff0;font-size:10px;font-weight:800}
@media(max-width:600px){.fw-feature-panel{top:56px;max-height:38dvh;width:min(350px,calc(100vw - 16px))}}
`;
document.head.appendChild(style);

const main=document.querySelector('main');
const verticalPanel=document.createElement('section');
verticalPanel.className='fw-feature-panel';verticalPanel.id='fwVerticalPanel';verticalPanel.hidden=true;
verticalPanel.innerHTML='<div class="fw-feature-head"><span>◈ RADAR VERTICALE · PROFILO 3D</span><button class="fw-feature-close" type="button" data-fw-close="vertical">✕</button></div><div id="fwVerticalChart"></div><div class="fw-feature-note">Vista prospettica schematica: distanza dal centro mappa in orizzontale, quota ADS-B in verticale. Non è una rappresentazione ATC certificata.</div>';
main.appendChild(verticalPanel);
const approachPanel=document.createElement('section');
approachPanel.className='fw-feature-panel';approachPanel.id='fwApproachPanel';approachPanel.hidden=true;
approachPanel.style.borderColor='#70d99a';
approachPanel.innerHTML='<div class="fw-feature-head"><span>✈ AVVICINAMENTI AEROPORTUALI</span><button class="fw-feature-close" type="button" data-fw-close="approach">✕</button></div><div id="fwApproachContent"><div class="fw-feature-note">Attiva il livello aeroporti, tocca un aeroporto e seleziona “Mostra avvicinamenti”.</div></div>';
main.appendChild(approachPanel);

function addButton(id,label,cls,afterId){
 if(byId(id))return byId(id);
 const b=document.createElement('button');b.type='button';b.id=id;b.className='fw-extra-button '+(cls||'');b.textContent=label;
 const anchor=byId(afterId);
 if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(b,anchor.nextSibling);
 else byId('rightControlsBody')?.appendChild(b);
 return b;
}
const verticalBtn=addButton('fwVerticalBtn','◈ RADAR 3D OFF','','altitudeBtn');
const approachBtn=addButton('fwApproachBtn','✈ AVVICINAMENTI OFF','approach','arrivalsBtn');

function setVertical(enabled){
 verticalEnabled=enabled;verticalPanel.hidden=!enabled;verticalBtn.classList.toggle('active',enabled);
 verticalBtn.textContent=enabled?'◈ RADAR 3D ON':'◈ RADAR 3D OFF';
 if(enabled)renderVertical();
}
function renderVertical(){
 if(!verticalEnabled)return;
 const host=byId('fwVerticalChart');if(!host)return;
 const center=map.getCenter(),items=aircraftCache.filter(a=>aircraftVisibleByFilters(a)&&Number.isFinite(Number(a.lat))&&Number.isFinite(Number(a.lon))&&altitudeFeet(a)!==null).slice(0,160);
 const maxRange=Math.max(50,Math.min(250,Math.round(map.getBounds().getNorthEast().distanceTo(map.getBounds().getSouthWest())/2000)));
 const maxAlt=14000,W=340,H=190,L=38,R=10,T=10,B=27,plotW=W-L-R,plotH=H-T-B;
 const x=v=>L+Math.max(0,Math.min(1,v/maxRange))*plotW;
 const y=v=>T+plotH-Math.max(0,Math.min(1,v/maxAlt))*plotH;
 let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Profilo verticale degli aeromobili" style="width:100%;height:auto;display:block;background:#081522;border-radius:6px">';
 // piano prospettico leggero
 svg+='<polygon points="'+L+','+(T+8)+' '+(W-R)+','+T+' '+(W-R)+','+(T+plotH-10)+' '+L+','+(T+plotH)+'" fill="#10263a" stroke="#3c5269" stroke-width="1"/>';
 [0,3000,6000,9000,12000].forEach(v=>{const yy=y(v);svg+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#52677c" stroke-opacity=".55" stroke-dasharray="3 4"/><text x="'+(L-5)+'" y="'+(yy+3)+'" fill="#a9bfd2" font-size="8" text-anchor="end">'+(v/1000)+'k</text>'});
 [0,50,100,150,200,250].filter(v=>v<=maxRange).forEach(v=>{const xx=x(v);svg+='<line x1="'+xx+'" y1="'+T+'" x2="'+xx+'" y2="'+(T+plotH)+'" stroke="#52677c" stroke-opacity=".35" stroke-dasharray="2 5"/><text x="'+xx+'" y="'+(H-9)+'" fill="#a9bfd2" font-size="8" text-anchor="middle">'+v+'</text>'});
 svg+='<text x="7" y="10" fill="#cbd8e6" font-size="8">QUOTA km</text><text x="'+(W/2)+'" y="'+(H-1)+'" fill="#cbd8e6" font-size="8" text-anchor="middle">DISTANZA DAL CENTRO · km</text>';
 const colors={civil:'#ffd43b',military:'#ff6872',helicopter:'#70d99a',small:'#58c9ff'};
 items.forEach((a,i)=>{
  const range=map.distance(center,[Number(a.lat),Number(a.lon)])/1000,alt=altitudeFeet(a)*.3048;
  if(range>maxRange||alt<0||alt>maxAlt)return;
  const xx=x(range),yy=y(alt),color=colors[aircraftClass(a)]||'#ffd43b';
  svg+='<circle cx="'+xx+'" cy="'+yy+'" r="3.5" fill="'+color+'" stroke="#08111b" stroke-width="1.2"><title>'+esc(a.flight||a.hex||'Aeromobile')+' · '+Math.round(alt)+' m</title></circle>';
 });
 svg+='</svg><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:5px;color:#cbd8e6;font-size:9px"><span>● Civili</span><span style="color:#ff6872">● Militari</span><span style="color:#70d99a">● Elicotteri</span><span style="color:#58c9ff">● Piccoli</span></div>';
 host.innerHTML=items.length?svg:'<div class="fw-feature-note">Nessun aeromobile con quota disponibile nell’area. Attiva il traffico ADS-B.</div>';
}
function setApproach(enabled){
 approachEnabled=enabled;approachPanel.hidden=!enabled;approachBtn.classList.toggle('active',enabled);
 approachBtn.textContent=enabled?'✈ AVVICINAMENTI ON':'✈ AVVICINAMENTI OFF';
 if(!enabled){if(approachLayer)approachLayer.clearLayers();return}
 if(!selectedAirport){
  byId('fwApproachContent').innerHTML='<div class="fw-feature-note">Prima seleziona un aeroporto: attiva “AEROPORTI”, tocca il suo simbolo e premi “Mostra avvicinamenti”.</div>';
  return;
 }
 drawApproaches();
}
function destinationPoint(lat,lon,bearingDeg,meters){
 const br=bearingDeg*Math.PI/180,dr=meters/6371000,p1=lat*Math.PI/180,l1=lon*Math.PI/180;
 const p2=Math.asin(Math.sin(p1)*Math.cos(dr)+Math.cos(p1)*Math.sin(dr)*Math.cos(br));
 const l2=l1+Math.atan2(Math.sin(br)*Math.sin(dr)*Math.cos(p1),Math.cos(dr)-Math.sin(p1)*Math.sin(p2));
 return [p2*180/Math.PI,l2*180/Math.PI];
}
function bearing(a,b){
 const p1=a[0]*Math.PI/180,p2=b[0]*Math.PI/180,dl=(b[1]-a[1])*Math.PI/180;
 return (Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*180/Math.PI+360)%360;
}
function angleDiff(a,b){return Math.abs(((a-b+540)%360)-180)}
function drawApproaches(){
 if(!approachEnabled||!selectedAirport)return;
 if(!approachLayer)approachLayer=L.layerGroup().addTo(map);
 approachLayer.clearLayers();
 const p=selectedAirport,icao=String(p.icao_code||'').toUpperCase();
 const runways=(runwayData||[]).filter(r=>String(r.airport||'').toUpperCase()===icao);
 const candidates=[];
 if(runways.length){
  runways.forEach(r=>{
   [[r.a,r.b],[r.b,r.a]].forEach(([threshold,farEnd])=>{
    const inbound=bearing(farEnd,threshold),outer=destinationPoint(threshold[0],threshold[1],(inbound+180)%360,18000);
    const far=destinationPoint(threshold[0],threshold[1],(inbound+180)%360,30000);
    L.polyline([far,outer,threshold],{color:'#70d99a',weight:2.5,opacity:.9,dashArray:'6 6',interactive:false}).addTo(approachLayer);
    L.circleMarker(threshold,{radius:4,color:'#fff',weight:1,fillColor:'#70d99a',fillOpacity:1,interactive:false}).addTo(approachLayer);
    const runwayName=r.name||'Pista';
    aircraftCache.forEach(a=>{
     const lat=Number(a.lat),lon=Number(a.lon),track=Number(a.track),alt=altitudeFeet(a),speed=Number(a.gs);
     if(![lat,lon,track].every(Number.isFinite)||alt===null||speed<35)return;
     const dist=map.distance([lat,lon],threshold)/1000;if(dist<1||dist>30)return;
     const toThreshold=bearing([lat,lon],threshold);
     if(angleDiff(track,toThreshold)>32||angleDiff(track,inbound)>32)return;
     const deltaLat=(lat-threshold[0])*111320,deltaLon=(lon-threshold[1])*111320*Math.cos(threshold[0]*Math.PI/180);
     const br=inbound*Math.PI/180,along=deltaLon*Math.sin(br)+deltaLat*Math.cos(br),cross=Math.abs(deltaLon*Math.cos(br)-deltaLat*Math.sin(br))/1000;
     if(along<0||along>30000||cross>3.5||alt>10000)return;
     const key=String(a.hex||a.flight||'').trim();
     if(!candidates.some(c=>c.key===key&&c.runway===runwayName))candidates.push({a,key,dist,alt,runway:runwayName,icao});
    });
   });
  });
 }else{
  L.circle([Number(p.lat),Number(p.lon)],{radius:30000,color:'#70d99a',weight:1,dashArray:'5 6',fillOpacity:.025,interactive:false}).addTo(approachLayer);
 }
 candidates.sort((a,b)=>a.dist-b.dist);
 candidates.forEach(item=>{
  const a=item.a,pos=[Number(a.lat),Number(a.lon)];
  L.circleMarker(pos,{radius:7,color:'#fff',weight:1.5,fillColor:'#70d99a',fillOpacity:.95,interactive:false}).addTo(approachLayer);
  L.polyline([pos,[Number(p.lat),Number(p.lon)]],{color:'#ffcf66',weight:1,dashArray:'3 5',opacity:.55,interactive:false}).addTo(approachLayer);
 });
 const rows=candidates.slice(0,12).map(item=>'<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid #ffffff20"><b>'+esc(item.a.flight||item.a.r||item.key||'Aeromobile')+'</b><span>'+esc(item.runway)+' · '+item.dist.toFixed(1).replace('.',',')+' km · '+Math.round(item.alt*.3048)+' m</span></div>').join('');
 byId('fwApproachContent').innerHTML='<b style="color:#a9f2c0">'+esc(p.name||icao)+' · '+esc(icao)+'</b><div class="fw-feature-note">'+(runways.length?'Assi pista estesi fino a 30 km; candidati filtrati per posizione, quota e direzione di volo.':'Piste non disponibili per questo aeroporto: visualizzo solo l’area di 30 km.')+'</div><div style="margin-top:6px">'+(rows||'<div class="fw-feature-note">Nessun aereo identificato in avvicinamento con i dati ADS-B attuali.</div>')+'</div><div class="fw-feature-note">Riconoscimento euristico, non procedura strumentale né informazione ATC. Le linee indicano gli assi geometrici delle piste, non SID/STAR o sentieri autorizzati.</div>';
}
function selectAirportFromPopup(root){
 const freq=root.querySelector('[id^="airportFreq-"]');if(!freq)return;
 const icao=freq.id.replace('airportFreq-','').toUpperCase();if(!/^[A-Z0-9]{4}$/.test(icao))return;
 const feature=(airportData||[]).find(row=>String(row[6]||'').toUpperCase()===icao);
 if(!feature)return;
 const airport={icao_code:icao,name:feature[3],lat:Number(feature[1]),lon:Number(feature[0])};
 if(!root.querySelector('[data-fw-select-approach]')){
  const b=document.createElement('button');b.type='button';b.className='fw-approach-select';b.textContent='✈ Mostra avvicinamenti';b.setAttribute('data-fw-select-approach','1');
  freq.parentNode.insertAdjacentElement('afterend',b);
  b.addEventListener('click',async()=>{
   selectedAirport=airport;setApproach(true);
   byId('fwApproachContent').innerHTML='<div class="fw-feature-note">Caricamento geometrie piste…</div>';
   try{await loadRunwayData();drawApproaches();map.closePopup();map.flyTo([airport.lat,airport.lon],Math.max(map.getZoom(),9),{animate:true,duration:.6});}
   catch(e){byId('fwApproachContent').innerHTML='<div class="fw-feature-note">Archivio piste non disponibile: '+esc(e.message)+'</div>';map.closePopup();}
  });
 }
}
verticalBtn.addEventListener('click',()=>setVertical(!verticalEnabled));
approachBtn.addEventListener('click',()=>setApproach(!approachEnabled));
document.addEventListener('click',event=>{
 const close=event.target.closest('[data-fw-close]');
 if(close){if(close.dataset.fwClose==='vertical')setVertical(false);else setApproach(false)}
});
map.on('popupopen',event=>{const root=event.popup.getElement();if(root)selectAirportFromPopup(root)});
window.addEventListener('flightweather:traffic',()=>{
 if(verticalEnabled)renderVertical();
 if(approachEnabled)drawApproaches();
});
map.on('moveend zoomend',()=>{if(verticalEnabled)renderVertical();if(approachEnabled)drawApproaches()});
})();
