(() => {
'use strict';
const $=id=>document.getElementById(id),canvas=$('space'),ctx=canvas.getContext('2d'),TAU=Math.PI*2,G=180,SOFT=18,MAX_GRAVITY=420;
let W=innerWidth,H=innerHeight,dpr=1,stars=[],pathClock=0,beamKeyDownAt=0,beamRepeatClock=0;let combatKeys=new Set();
const camera={x:0,y:0,zoom:1};const pointers=new Map();let dragState=null,pinchState=null,holdTimer=null;
const S={running:false,paused:false,tutorialMode:false,tutorialStage:1,tutorialFlags:{},tutorialFinished:false,aliensEnabled:(()=>{try{return localStorage.getItem('spaceRescueAliensEnabled')!=='off';}catch(e){return true;}})(),level:1,nick:'',difficulty:null,elapsed:0,total:0,last:0,acc:0,rate:1,ship:null,bodies:[],worm:{x:0,y:0,r:35},path:[],score:0,shots:[],enemyShots:[],planet:null,aliens:[],enemyFire:0,hull:3,orbitAngle:0,secretDoor:null,recorded:false,contactCooldown:0,health:100,flightTrace:[],traceClock:0,ghostRecord:null,ghostPlayback:false,runTraces:{},portalEffects:[],asteroids:[],oortAsteroids:[],damageCooldown:0};
const names=['SOL SYSTEM','INNER SOLAR SYSTEM','OUTER SOLAR SYSTEM','GARGANTUA APPROACH','EVENT HORIZON','SINGULARITY','TRIPLE ORBIT','TILTED WORLDS','CHAOTIC SYSTEM','ALIEN FRONTIER','ALIEN HOMEWORLD'];
const levels=[
[['SUN','star',-25,0,29,12000],['EARTH','planet',-220,-75,13,90],['MOON','moon',-270,-110,5,5]],
[['SUN','star',-40,0,30,12500],['EARTH','planet',-250,85,13,90],['MARS','planet',-110,-190,10,55],['MOON','moon',-295,125,5,5]],
[['SUN','star',-65,0,32,13000],['EARTH','planet',-260,100,12,90],['MARS','planet',-170,-190,10,55],['JUPITER','gas',110,150,24,1100],['SATURN','ring',220,-100,21,900]],
[['GARGANTUA','blackhole',-35,0,36,26000],['EMBER','star',-180,-130,18,2100],['NOVA','planet',-240,-165,10,90],['KAI','planet',-15,-240,12,120]],
[['GARGANTUA','blackhole',-20,0,40,28000],['EMBER','star',-180,130,19,2400],['TITAN','planet',-270,160,13,130],['LYRA','planet',-10,230,10,80],['VEX','planet',140,-180,12,110]],
[['GARGANTUA','blackhole',0,0,43,30000],['EMBER','star',-180,-150,19,2500],['NOVA','star',150,150,16,2100],['KAI','planet',-250,-190,11,90],['LYRA','planet',-40,-245,10,80],['VEX','planet',230,180,12,110]],
[['GARGANTUA','blackhole',0,0,41,29000],['EMBER','star',-190,-100,18,2300],['NOVA','star',160,160,16,2000],['KAI','planet',-260,-140,10,80],['LYRA','planet',-60,-245,10,80],['VEX','planet',235,195,12,100],['ORBIT','planet',180,-190,9,70]],
[['GARGANTUA','blackhole',0,0,43,31000],['EMBER','star',-180,130,18,2400],['NOVA','star',170,-140,17,2100],['KAI','planet',-250,180,11,90],['LYRA','planet',-80,240,10,80],['VEX','planet',245,-185,12,100],['ORBIT','planet',220,190,9,70],['MIRA','planet',-250,-180,8,55]],
[['GARGANTUA','blackhole',0,0,45,33000],['EMBER','star',-190,-120,18,2500],['NOVA','star',170,150,16,2100],['SIRIUS','star',190,-190,13,1600],['KAI','planet',-255,-160,10,90],['LYRA','planet',-30,-260,10,80],['VEX','planet',250,170,12,110],['ORBIT','planet',-250,180,9,70],['MIRA','planet',120,250,8,60]],
[['GARGANTUA','blackhole',-70,0,46,34000],['EMBER','star',-220,120,19,2600],['NOVA','star',120,-170,16,2200],['SIRIUS','star',180,180,14,1700],['KAI','planet',-270,150,10,90],['LYRA','planet',-80,-250,10,80],['VEX','planet',235,190,12,110],['ASTEROID','asteroid',20,250,7,18],['COMET','comet',230,-230,8,25],['UFO','ufo',95,-40,12,45]]
];
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:Math.min(360,Math.floor(W*H/2600))},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.2,a:Math.random()*.7+.2,p:Math.random()*TAU}));}
addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a),center=()=>({x:W*.45,y:H*.5}),scale=()=>Math.min(W/920,H/650)*1.05;
function setLevel(n){S.flightTrace=[];S.traceClock=0;S.ghostPlayback=false;S.portalEffects=[];S.ghostRecord=null;const prior=rankData().find(r=>r.nickname===S.nick&&r.traces&&Array.isArray(r.traces[n])&&r.traces[n].length>1);if(prior)S.ghostRecord={trace:prior.traces[n],time:prior.time};else{const legacy=rankData().find(r=>r.nickname===S.nick&&r.level===n&&Array.isArray(r.trace)&&r.trace.length>1);if(legacy)S.ghostRecord={trace:legacy.trace,time:legacy.time};}S.health=100;S.contactCooldown=0;S.damageCooldown=0;S.asteroids=[];S.oortAsteroids=[];const healthEl=$('shipHealth');if(healthEl)healthEl.textContent='100';camera.x=0;camera.y=0;camera.zoom=1;if(typeof zoomLabel!=='undefined')updateZoomLabel();S.aliens=[];S.level=n;S.elapsed=0;S.shots=[];S.enemyShots=[];S.path=[];S.score=0;S.hull=3;S.enemyFire=0;$('levelLabel').textContent='LEVEL '+n+' / 11';$('missionLabel').textContent=names[n-1];$('combatPanel').classList.toggle('hidden',n!==11);$('shipStatus').textContent=n===11?'COMBAT':'STANDBY';
 S.secretDoor=n===1?{x:0,y:0,r:13,angle:-.85,orbit:0}:null;
 if(n===11){S.secretDoor=null;S.combatAge=0;S.orbitFactor=3.3;$('orbitDistance').value='3.3';$('orbitDistanceValue').textContent='3.3×';S.bodies=[];S.planet={x:W*.57,y:H*.52,r:Math.min(W,H)*.19,mass:90000};S.aliens=Array.from({length:18},(_,i)=>{const a=i*TAU/18+rand(-.12,.12),d=S.planet.r*rand(1.7,2.55);return{x:S.planet.x+Math.cos(a)*d,y:S.planet.y+Math.sin(a)*d,vx:0,vy:0,slotAngle:i*TAU/18,role:i%4,cooldown:rand(.45,2.8),think:rand(0,1.2),r:7+Math.random()*3};});S.orbitAngle=-Math.PI/2;const initialRadius=S.planet.r*S.orbitFactor,initialSpeed=Math.sqrt(G*S.planet.mass/initialRadius)*.96;S.ship={x:S.planet.x+Math.cos(S.orbitAngle)*initialRadius,y:S.planet.y+Math.sin(S.orbitAngle)*initialRadius,vx:-Math.sin(S.orbitAngle)*initialSpeed,vy:Math.cos(S.orbitAngle)*initialSpeed,angle:S.orbitAngle+Math.PI/2,r:10,launched:true};S.worm={x:W*.78,y:H*.5,r:50};$('objectCount').textContent='01';$('combatScore').textContent='0';$('scoreBar').style.width='0%';$('shipStatus').textContent='ORBITAL COMBAT';$('hullValue').textContent='3';return;}
 const c=center(),z=scale();S.bodies=levels[n-1].map((a,i)=>{const [name,type,ox,oy,r,mass]=a,x=c.x+ox*z*1.07,y=c.y+oy*z*1.07;return{name,type,x,y,vx:0,vy:0,r:Math.max(4,r*z),mass,bx:x,by:y,orbit:0,dir:Math.random()<.5?-1:1,tilt:rand(-.45,.45)};});
 if(S.secretDoor){const sun=S.bodies.find(b=>b.type==='star');S.secretDoor.orbit=Math.max(110,Math.min(175,160*z));S.secretDoor.x=sun.x+Math.cos(S.secretDoor.angle)*S.secretDoor.orbit;S.secretDoor.y=sun.y+Math.sin(S.secretDoor.angle)*S.secretDoor.orbit;}
 recenterSystem();initializeOrbitalVelocities();removeBarycenterVelocity();
 S.worm={x:clamp(c.x+Math.max(220,Math.min(360,W*.34))*z,Math.max(35,W*.58),W-45),y:clamp(c.y+rand(-110,110)*z,80,H-80),r:Math.max(27,34*z)};const wormAnchor=S.bodies.filter(b=>b.type==='blackhole'||b.type==='star').sort((a,b)=>b.mass-a.mass)[0]||S.bodies.reduce((a,b)=>!a||b.mass>a.mass?b:a,null);S.worm.anchor=wormAnchor;S.worm.orbit=Math.hypot(S.worm.x-wormAnchor.x,S.worm.y-wormAnchor.y);S.worm.angle=Math.atan2(S.worm.y-wormAnchor.y,S.worm.x-wormAnchor.x);
 // 천체와 웜홀에서 충분히 떨어진 안전한 출발 지점을 화면 안에서 탐색한다.
 const shipRadius=8;let spawn={x:W*.12,y:H*.5},bestClearance=-Infinity;
 const minX=30,maxX=Math.max(31,W-30),minY=65,maxY=Math.max(66,H-65);
 for(let yy=minY;yy<=maxY;yy+=Math.max(18,Math.min(32,H/18))){
  for(let xx=minX;xx<=maxX;xx+=Math.max(18,Math.min(32,W/24))){
   const bodyClearance=S.bodies.reduce((m,b)=>Math.min(m,Math.hypot(xx-b.x,yy-b.y)-b.r-shipRadius),Infinity);
   const wormClearance=Math.hypot(xx-S.worm.x,yy-S.worm.y)-S.worm.r-shipRadius-90;
   const leftPreference=Math.max(0,xx-W*.42)*.22;
   const clearance=Math.min(bodyClearance,wormClearance)-leftPreference;
   if(clearance>bestClearance){bestClearance=clearance;spawn={x:xx,y:yy};}
  }
 }
 S.ship={x:spawn.x,y:spawn.y,vx:0,vy:0,angle:0,r:shipRadius,launched:false,safe:1.5};
 // Independent drifting asteroid field; rocks never steer toward the player.
 const asteroidCount=Math.min(9,2+Math.ceil(n*.7));
 for(let i=0;i<asteroidCount;i++){let pos=null;for(let k=0;k<100;k++){const x=rand(24,W-24),y=rand(55,H-24),clearShip=Math.hypot(x-S.ship.x,y-S.ship.y),clearWorm=Math.hypot(x-S.worm.x,y-S.worm.y),clearBody=S.bodies.every(b=>Math.hypot(x-b.x,y-b.y)>b.r+42);if(clearShip>115&&clearWorm>S.worm.r+55&&clearBody){pos={x,y};break;}}if(!pos)pos={x:rand(25,W-25),y:rand(55,H-25)};const speed=rand(18,48),angle=rand(0,TAU);S.asteroids.push({x:pos.x,y:pos.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:rand(5,10)*Math.min(1.15,scale()),angle:rand(0,TAU),spin:rand(-.8,.8)});}
 // 오르트구름은 독립된 공전 궤도로 갱신한다. 천체의 섭동으로 궤도가 무너지거나 서로 섞이지 않는다.
 const oortAnchor=S.bodies.filter(b=>b.type==='star'||b.type==='blackhole').sort((a,b)=>b.mass-a.mass)[0]||S.bodies.reduce((a,b)=>!a||b.mass>a.mass?b:a,null);
 if(oortAnchor){
  const outermost=S.bodies.reduce((m,b)=>Math.max(m,Math.hypot(b.x-oortAnchor.x,b.y-oortAnchor.y)+b.r),0);
  const playerDistance=Math.hypot(S.ship.x-oortAnchor.x,S.ship.y-oortAnchor.y);
  const innerRadius=Math.max(outermost+65*z,playerDistance+85*z),outerRadius=innerRadius+Math.max(145*z,Math.min(W,H)*.24);
  const ringCount=6,total=260,baseCount=Math.floor(total/ringCount),orbitalGravity=G*gravityMass(oortAnchor)*.22;
  for(let ring=0;ring<ringCount;ring++){
   const count=baseCount+(ring<total%ringCount?1:0),radius=innerRadius+(outerRadius-innerRadius)*(ring/(ringCount-1));
   const phase=rand(0,TAU),direction=1,angularSpeed=Math.sqrt(orbitalGravity/Math.max(1,radius*radius*radius))*.72;
   for(let i=0;i<count;i++){
    const angle=phase+i*TAU/count+rand(-.012,.012);
    S.oortAsteroids.push({anchor:oortAnchor,orbitRadius:radius,angle,angularSpeed:angularSpeed*direction,x:oortAnchor.x+Math.cos(angle)*radius,y:oortAnchor.y+Math.sin(angle)*radius,r:rand(2.2,4.8)*Math.min(1.15,scale()),rotation:rand(0,TAU),spin:rand(-.65,.65)});
   }
  }
 }
 // 1~10라운드 정찰 외계인은 플레이어와의 거리를 기준으로 하지 않고, 현재 화면 안의 유효한 위치 중 무작위로 스폰한다.
 let scout={x:rand(35,Math.max(36,W-35)),y:rand(65,Math.max(66,H-65))};
 const validScoutSpots=[];
 for(let attempt=0;attempt<180;attempt++){
  const xx=rand(35,Math.max(36,W-35)),yy=rand(65,Math.max(66,H-65));
  const bodyGap=S.bodies.reduce((m,b)=>Math.min(m,Math.hypot(xx-b.x,yy-b.y)-b.r),Infinity);
  const wormGap=Math.hypot(xx-S.worm.x,yy-S.worm.y)-S.worm.r;
  if(bodyGap>28&&wormGap>28)validScoutSpots.push({x:xx,y:yy});
 }
 if(validScoutSpots.length)scout=validScoutSpots[Math.floor(Math.random()*validScoutSpots.length)];
 S.scoutAttackAge=0;S.scoutCloneAge=0;S.aliens=S.aliensEnabled?[{x:scout.x,y:scout.y,vx:0,vy:0,r:9,side:Math.random()<.5?-1:1,cooldown:rand(2.1,3.2),cloned:false}]:[];
 $('objectCount').textContent=String(S.bodies.length).padStart(2,'0');$('distance').textContent=Math.round(Math.hypot(S.worm.x-S.ship.x,S.worm.y-S.ship.y))+' AU*';$('statusText').textContent='GRAVITY FIELD STABLE';predict();
}
function gravityMass(b){const factor={blackhole:8,star:1.18,gas:2.376,ring:2.376,planet:5.4,moon:3.24,asteroid:2.16,comet:2.16};return b.mass*(factor[b.type]||1);}
function systemBarycenter(bodies=S.bodies){let mass=0,x=0,y=0;for(const b of bodies){if(b.type==='ufo')continue;const m=gravityMass(b);mass+=m;x+=b.x*m;y+=b.y*m;}return mass?{x:x/mass,y:y/mass,mass}:center();}
function recenterSystem(){const cm=systemBarycenter(),target=center(),dx=target.x-cm.x,dy=target.y-cm.y;for(const b of S.bodies){b.x+=dx;b.y+=dy;b.bx+=dx;b.by+=dy;}}
function removeBarycenterVelocity(){const cm=systemBarycenter();let vx=0,vy=0;for(const b of S.bodies){if(b.type==='ufo')continue;const m=gravityMass(b);vx+=b.vx*m;vy+=b.vy*m;}vx/=cm.mass||1;vy/=cm.mass||1;for(const b of S.bodies){if(b.type==='ufo')continue;b.vx-=vx;b.vy-=vy;}}
function bodyAccelerations(bodies){const out=bodies.map(()=>({x:0,y:0}));for(let i=0;i<bodies.length;i++){const a=bodies[i];if(a.type==='ufo')continue;for(let j=i+1;j<bodies.length;j++){const b=bodies[j];if(b.type==='ufo')continue;const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy+SOFT*SOFT,d=Math.sqrt(d2),k=G/(d2*d),ma=gravityMass(a),mb=gravityMass(b);out[i].x+=k*mb*dx;out[i].y+=k*mb*dy;out[j].x-=k*ma*dx;out[j].y-=k*ma*dy;}}return out;}
function gravityAt(x,y,bodies,exclude=null){let ax=0,ay=0;for(const b of bodies){if(b===exclude||b.type==='ufo')continue;const dx=b.x-x,dy=b.y-y,d2=dx*dx+dy*dy+SOFT*SOFT,d=Math.sqrt(d2),a=Math.min(G*gravityMass(b)/d2,MAX_GRAVITY);ax+=a*dx/d;ay+=a*dy/d;}return{x:ax,y:ay};}
function accel(x,y,bodies){return gravityAt(x,y,bodies);}
function blackHoleSpeedFactor(x,y,bodies){const holes=bodies.filter(b=>b.type==='blackhole');if(!holes.length)return 1;let nearest=Infinity,radius=1;for(const b of holes){const d=Math.hypot(x-b.x,y-b.y);if(d<nearest){nearest=d;radius=Math.max(1,b.r);}}const t=clamp((nearest/radius-1.15)/6.85,0,1),smooth=t*t*(3-2*t);return .38+.62*smooth;}
function antiGravityAt(x,y,door){if(!door)return{x:0,y:0};const dx=x-door.x,dy=y-door.y,d2=dx*dx+dy*dy;if(d2>300*300)return{x:0,y:0};const d=Math.sqrt(d2)||1,a=Math.min(520,220000/(d2+300));return{x:dx/d*a,y:dy/d*a};}
function initializeOrbitalVelocities(){const bodies=S.bodies.filter(b=>b.type!=='ufo');if(!bodies.length)return;const cm=systemBarycenter(bodies),totalMass=cm.mass;for(const b of bodies){const dx=b.x-cm.x,dy=b.y-cm.y,r=Math.hypot(dx,dy);if(r<Math.max(18,b.r*.5)){b.vx=0;b.vy=0;continue;}const speed=Math.sqrt(G*Math.max(1,totalMass-gravityMass(b))/r)*.88*rand(.985,1.015),sign=b.dir||1;b.vx=-dy/r*speed*sign;b.vy=dx/r*speed*sign;}}
function moveBodies(dt){const bodies=S.bodies,acc=bodyAccelerations(bodies);for(let i=0;i<bodies.length;i++){const b=bodies[i];if(b.type==='ufo'){const t=performance.now()*.00045;b.x=b.bx+Math.sin(t)*95;b.y=b.by+Math.cos(t*1.3)*32;continue;}b.vx+=acc[i].x*dt;b.vy+=acc[i].y*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;}}
function segmentDistanceSquared(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,len=dx*dx+dy*dy;if(!len)return(px-x1)**2+(py-y1)**2;const t=clamp(((px-x1)*dx+(py-y1)*dy)/len,0,1),qx=x1+t*dx,qy=y1+t*dy;return(px-qx)**2+(py-qy)**2;}
function advanceGravityProjectile(projectile,dt,bodies){
 const ga=gravityAt(projectile.x,projectile.y,bodies);
 projectile.vx+=ga.x*dt;projectile.vy+=ga.y*dt;
 projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;
 if(projectile.trail){projectile.trail.push({x:projectile.x,y:projectile.y});if(projectile.trail.length>48)projectile.trail.shift();}
}
function advancePredictedBodies(bodies,dt){
 const ba=bodyAccelerations(bodies);
 for(let i=0;i<bodies.length;i++){const b=bodies[i];if(b.type==='ufo')continue;b.vx+=ba[i].x*dt;b.vy+=ba[i].y*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;}
}
function interceptPoint(shooter,target,speed,targetBodies=S.level===11?[S.planet]:S.bodies){
 // Shoot-to-intercept solver. Every trial uses the same semi-implicit gravity step as the live projectile.
 const step=.025,maxTime=6,initialDistance=Math.hypot(target.x-shooter.x,target.y-shooter.y);
 let angle=Math.atan2(target.y-shooter.y,target.x-shooter.x),flightTime=clamp(initialDistance/Math.max(1,speed),.08,maxTime),best={miss:Infinity,angle,x:target.x,y:target.y,time:flightTime};
 for(let pass=0;pass<9;pass++){
  const bs=targetBodies.map(b=>({...b}));
  const ship={x:target.x,y:target.y,vx:target.vx||0,vy:target.vy||0};
  const laser={x:shooter.x,y:shooter.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed};
  let elapsed=0,closest={miss:Infinity,x:ship.x,y:ship.y,time:0};
  while(elapsed<maxTime){
   const h=Math.min(step,maxTime-elapsed);
   advancePredictedBodies(bs,h);
   advanceGravityProjectile(ship,h,bs);
   advanceGravityProjectile(laser,h,bs);
   elapsed+=h;
   const miss=Math.hypot(ship.x-laser.x,ship.y-laser.y);
   if(miss<closest.miss)closest={miss,x:ship.x,y:ship.y,time:elapsed};
   if(elapsed>=flightTime&&miss>closest.miss+speed*h*.8)break;
  }
  if(closest.miss<best.miss)best={...closest,angle};
  if(closest.miss<Math.max(7,target.r*.7))break;
  const dx=closest.x-laser.x,dy=closest.y-laser.y,range=Math.max(20,Math.hypot(closest.x-shooter.x,closest.y-shooter.y));
  const correction=Math.atan2(Math.cos(angle)*dy-Math.sin(angle)*dx,range);
  if(!Number.isFinite(correction))break;
  angle+=clamp(correction,-.32,.32);
  flightTime=clamp(closest.time,.08,maxTime);
 }
 return{x:best.x,y:best.y,time:best.time,angle:best.angle};
}
function applyDamage(amount){
 if(S.damageCooldown>0||!S.running)return false;
 S.health=Math.max(0,S.health-amount);S.damageCooldown=.62;
 const healthEl=$('shipHealth');if(healthEl)healthEl.textContent=String(S.health);
 document.body.classList.remove('damage-flash');void document.body.offsetWidth;document.body.classList.add('damage-flash');
 clearTimeout(S.damageFlashTimer);S.damageFlashTimer=setTimeout(()=>document.body.classList.remove('damage-flash'),320);
 if(S.health<=0)lose();return true;
}
function moveAsteroids(dt){for(const a of S.asteroids){const g=gravityAt(a.x,a.y,S.bodies);a.vx+=g.x*dt*.22;a.vy+=g.y*dt*.22;a.x+=a.vx*dt;a.y+=a.vy*dt;a.angle+=a.spin*dt;const m=30;if(a.x<-m)a.x=W+m;else if(a.x>W+m)a.x=-m;if(a.y<-m)a.y=H+m;else if(a.y>H+m)a.y=-m;}}
function moveOortAsteroids(dt){for(const a of S.oortAsteroids){a.angle=(a.angle+a.angularSpeed*dt)%TAU;a.x=a.anchor.x+Math.cos(a.angle)*a.orbitRadius;a.y=a.anchor.y+Math.sin(a.angle)*a.orbitRadius;a.rotation+=a.spin*dt;}}
function updateAlienPortals(dt){
 const p=S.ship;if(!p||!p.launched)return;S.portalEffects=S.portalEffects||[];
 for(const a of S.aliens){if(!a.cloned)continue;a.portalCooldown=(a.portalCooldown??rand(7,12))-dt;if(a.portalCooldown>0)continue;a.portalCooldown=rand(9,15);if(Math.random()>.24||S.portalEffects.some(q=>q.alien===a))continue;
  let dest=null,best=-Infinity;for(let k=0;k<24;k++){const ang=rand(0,TAU),d=rand(175,245),x=p.x+Math.cos(ang)*d,y=p.y+Math.sin(ang)*d;if(x<25||x>W-25||y<55||y>H-25)continue;const shipGap=Math.hypot(x-p.x,y-p.y),bodyGap=S.bodies.reduce((m,b)=>Math.min(m,Math.hypot(x-b.x,y-b.y)-b.r),Infinity);if(shipGap<155||bodyGap<Math.max(55,a.r*5))continue;const score=bodyGap+rand(0,20);if(score>best){best=score;dest={x,y};}}
  if(dest)S.portalEffects.push({x:a.x,y:a.y,destX:dest.x,destY:dest.y,alien:a,age:0,duration:.72});
 }
 for(const q of S.portalEffects){q.age+=dt;if(q.age>=q.duration){const a=q.alien;if(S.aliens.includes(a)){a.x=q.destX;a.y=q.destY;a.vx=(p.x-a.x)*.12;a.vy=(p.y-a.y)*.12;}q.done=true;}}
 S.portalEffects=S.portalEffects.filter(q=>!q.done);
}
function updateAlienAI(dt){const p=S.ship,heading=p.angle,leadX=p.x+Math.cos(heading)*42,leadY=p.y+Math.sin(heading)*42;for(let i=0;i<S.aliens.length;i++){const a=S.aliens[i];a.think-=dt;if(a.think<=0){a.think=rand(1.8,3.2);a.role=(a.role+1+(i%3===0?1:0))%4;}const roleAngle=[Math.PI,Math.PI*.72,-Math.PI*.72,0][a.role],angle=heading+roleAngle+a.slotAngle*.22,radius=125+(i%3)*24,targetX=leadX+Math.cos(angle)*radius,targetY=leadY+Math.sin(angle)*radius;let sx=0,sy=0;for(let j=0;j<S.aliens.length;j++){if(i===j)continue;const b=S.aliens[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;if(d2>0&&d2<78*78){const d=Math.sqrt(d2),force=(78-d)/78;sx+=dx/d*force*210;sy+=dy/d*force*210;}}const dx=targetX-a.x,dy=targetY-a.y,d=Math.hypot(dx,dy)||1;let ax=dx/d*190+sx-a.vx*1.7,ay=dy/d*190+sy-a.vy*1.7,acc=Math.hypot(ax,ay);if(acc>260){ax=ax/acc*260;ay=ay/acc*260;}a.vx+=ax*dt;a.vy+=ay*dt;const speed=Math.hypot(a.vx,a.vy);if(speed>165){a.vx=a.vx/speed*165;a.vy=a.vy/speed*165;}a.x+=a.vx*dt;a.y+=a.vy*dt;}}
function updateKeyboardFlightControls(dt,p){
 if(!S.running||S.paused||!p?.launched||S.level===11)return;
 const turn=(heldFlightKeys.has('ArrowRight')?1:0)-(heldFlightKeys.has('ArrowLeft')?1:0);
 if(turn){
  const speed=Math.hypot(p.vx,p.vy),angle=Math.atan2(p.vy,p.vx)+turn*1.8*dt;
  p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;p.angle=angle;
  syncSteering(angle*180/Math.PI);
 }
 const throttle=(heldFlightKeys.has('ArrowUp')?1:0)-(heldFlightKeys.has('ArrowDown')?1:0);
 if(throttle){
  const speed=clamp(Math.hypot(p.vx,p.vy)+throttle*90*dt,20,260);
  const angle=Math.atan2(p.vy,p.vx);
  p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;
  $('thrust').value=speed.toFixed(1);$('speedValue').textContent=speed.toFixed(1);
 }
}
function step(dt){S.damageCooldown=Math.max(0,(S.damageCooldown||0)-dt);if(S.level===11){const p=S.ship,q=S.planet,a=gravityAt(p.x,p.y,[q]);p.vx+=a.x*dt;p.vy+=a.y*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle=Math.atan2(p.vy,p.vx);if(Math.hypot(p.x-q.x,p.y-q.y)<=q.r+p.r){lose();return;}updateAlienAI(dt);for(const shot of S.enemyShots){const sx=shot.x,sy=shot.y;if(shot.gravity)advanceGravityProjectile(shot,dt,[q]);else{shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;}shot.life-=dt;if(!shot.hit&&segmentDistanceSquared(p.x,p.y,sx,sy,shot.x,shot.y)<=(p.r+5)**2){shot.hit=true;applyDamage(30);if(S.health<=0)return;}}S.enemyShots=S.enemyShots.filter(shot=>shot.life>0&&!shot.hit);return;}const prevWorm=S.worm?{x:S.worm.x,y:S.worm.y}:null;moveBodies(dt);moveAsteroids(dt);moveOortAsteroids(dt);if(S.worm?.anchor){S.worm.angle+=dt*.09;S.worm.x=S.worm.anchor.x+Math.cos(S.worm.angle)*S.worm.orbit;S.worm.y=S.worm.anchor.y+Math.sin(S.worm.angle)*S.worm.orbit;}const p=S.ship;if(!p||!p.launched)return;const prevX=p.x,prevY=p.y,prevDoor=S.level===1&&S.secretDoor?{x:S.secretDoor.x,y:S.secretDoor.y}:null;updateKeyboardFlightControls(dt,p);if(!S.tutorialMode&&S.level===1&&S.secretDoor){const sun=S.bodies.find(b=>b.type==='star'),d=S.secretDoor;d.angle=(d.angle+dt*.42)%(Math.PI*2);if(sun){d.x=sun.x+Math.cos(d.angle)*d.orbit;d.y=sun.y+Math.sin(d.angle)*d.orbit;}}let a=accel(p.x,p.y,S.bodies),repel=S.level===1?antiGravityAt(p.x,p.y,S.secretDoor):{x:0,y:0};p.vx+=(a.x+repel.x)*dt;p.vy+=(a.y+repel.y)*dt;const localSpeedFactor=blackHoleSpeedFactor(p.x,p.y,S.bodies);p.x+=p.vx*dt*localSpeedFactor;p.y+=p.vy*dt*localSpeedFactor;S.traceClock+=dt;if(S.traceClock>=.1){S.traceClock=0;if(S.flightTrace.length<1800)S.flightTrace.push(captureTracePoint(p.x,p.y,S.elapsed));}if(Math.hypot(p.vx,p.vy)>2)p.angle=Math.atan2(p.vy,p.vx);
 if(S.level<=10&&p.launched&&S.aliens.length){
  const heading=Math.atan2(p.vy,p.vx),sideAngle=heading+Math.PI/2;
  for(let i=0;i<S.aliens.length;i++){
   const scout=S.aliens[i],ring=Math.floor(i/2),spread=(i%2?1:-1)*(42+ring*13);
   const tx=p.x-Math.cos(heading)*(145+ring*18)+Math.cos(sideAngle)*spread;
   const ty=p.y-Math.sin(heading)*(145+ring*18)+Math.sin(sideAngle)*spread;
   const dx=tx-scout.x,dy=ty-scout.y,d=Math.hypot(dx,dy)||1;
   const ga=gravityAt(scout.x,scout.y,S.bodies);let ax=dx/d*105-scout.vx*1.65+ga.x*.22,ay=dy/d*105-scout.vy*1.65+ga.y*.22,al=Math.hypot(ax,ay);
   if(al>170){ax=ax/al*170;ay=ay/al*170;}
   scout.vx+=ax*dt;scout.vy+=ay*dt;
   const sv=Math.hypot(scout.vx,scout.vy);
   if(sv>68){scout.vx=scout.vx/sv*68;scout.vy=scout.vy/sv*68;}
   scout.x+=scout.vx*dt;scout.y+=scout.vy*dt;
   scout.cooldown-=dt;
   if(S.scoutAttackAge>=1.5&&scout.cooldown<=0){
    const laserSpeed=W*.48,aim=interceptPoint(scout,p,laserSpeed,S.bodies),lx=aim.x-scout.x,ly=aim.y-scout.y;
    const baseSpread=S.difficulty==='easy'?.09:S.difficulty==='normal'?.035:0;
    // Recalculate each alien's distance at the instant it fires: farther targets get a tighter angular spread.
    const targetDistance=Math.hypot(p.x-scout.x,p.y-scout.y);
    const distanceFactor=clamp(300/Math.max(1,targetDistance),.35,2.2);
    const spread=baseSpread*distanceFactor,angle=aim.angle+(spread?rand(-spread,spread):0);
    S.enemyShots.push({x:scout.x,y:scout.y,vx:Math.cos(angle)*laserSpeed,vy:Math.sin(angle)*laserSpeed,life:Math.min(5,aim.time+1),gravity:true,trail:[{x:scout.x,y:scout.y}]});
    scout.cooldown=rand(2.2,3.4);
   }
  }
  updateAlienPortals(dt);
  S.contactCooldown=Math.max(0,(S.contactCooldown||0)-dt);
  const touching=S.aliens.some(alien=>Math.hypot(p.x-alien.x,p.y-alien.y)<p.r+alien.r+2);
  if(touching&&S.contactCooldown<=0){S.contactCooldown=.85;applyDamage(30);if(S.health<=0)return;}
 }
 if(S.level<=10){syncSteering(p.angle*180/Math.PI);}if(!Number.isFinite(p.x+p.y+p.vx+p.vy)){lose();return;}if((S.asteroids.length||S.oortAsteroids.length)&&S.damageCooldown<=0){for(const rock of S.asteroids.concat(S.oortAsteroids)){if(segmentDistanceSquared(rock.x,rock.y,prevX,prevY,p.x,p.y)<=(p.r+rock.r)**2){applyDamage(30);if(S.health<=0)return;break;}}}
 if(!S.tutorialMode&&S.level===1&&S.secretDoor){const d=S.secretDoor,doorX=(d.x+(prevDoor?.x??d.x))*.5,doorY=(d.y+(prevDoor?.y??d.y))*.5,r=d.r+p.r+5;if(segmentDistanceSquared(doorX,doorY,prevX,prevY,p.x,p.y)<=r*r){S.total+=S.elapsed;S.elapsed=0;S.running=true;S.paused=false;setLevel(11);$('statusText').textContent='SECRET WORMHOLE FOUND';$('shipStatus').textContent='ORBITAL COMBAT';return;}}if(!S.tutorialMode&&S.level<=10){const wx=(S.worm.x+(prevWorm?.x??S.worm.x))*.5,wy=(S.worm.y+(prevWorm?.y??S.worm.y))*.5;if(segmentDistanceSquared(wx,wy,prevX,prevY,p.x,p.y)<=(S.worm.r+p.r)**2){levelClear();return;}}if(Math.hypot(p.vx,p.vy)>1400){lose();return;}p.safe=Math.max(0,(p.safe||0)-dt);if(p.safe<=0){for(const b of S.bodies)if(Math.hypot(p.x-b.x,p.y-b.y)<b.r+p.r){lose();return;}}
 if(S.level<=10&&S.enemyShots.length){
  for(const shot of S.enemyShots){
   const sx=shot.x,sy=shot.y;if(shot.gravity)advanceGravityProjectile(shot,dt,S.bodies);else{shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;}shot.life-=dt;
   const mx=(prevX+p.x)*.5,my=(prevY+p.y)*.5;
   if(!shot.hit&&segmentDistanceSquared(mx,my,sx,sy,shot.x,shot.y)<=(p.r+4)**2){shot.hit=true;applyDamage(30);if(S.health<=0)return;}
  }
  S.enemyShots=S.enemyShots.filter(shot=>shot.life>0&&!shot.hit);
 }
}
function predict(){let p=S.ship;if(!p||S.level===11){S.path=[];return;}let x=p.x,y=p.y,previewAngle=+$('heading').value*Math.PI/180,previewSpeed=+$('thrust').value,vx=p.launched?p.vx:Math.cos(previewAngle)*previewSpeed,vy=p.launched?p.vy:Math.sin(previewAngle)*previewSpeed;if(!p.launched)p.angle=previewAngle;let bs=S.bodies.map(b=>({...b})),out=[],dt=1/60;for(let i=0;i<600;i++){const ba=bodyAccelerations(bs);for(let j=0;j<bs.length;j++){const b=bs[j];if(b.type==='ufo')continue;b.vx+=ba[j].x*dt;b.vy+=ba[j].y*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;}const ac=accel(x,y,bs),repel=S.level===1?antiGravityAt(x,y,S.secretDoor):{x:0,y:0};vx+=(ac.x+repel.x)*dt;vy+=(ac.y+repel.y)*dt;const localSpeedFactor=blackHoleSpeedFactor(x,y,bs);x+=vx*dt*localSpeedFactor;y+=vy*dt*localSpeedFactor;if(!Number.isFinite(x+y)||Math.hypot(vx,vy)>1400)break;out.push({x,y});if(bs.some(b=>b.type!=='ufo'&&Math.hypot(x-b.x,y-b.y)<b.r+4)||Math.hypot(x-S.worm.x,y-S.worm.y)<S.worm.r)break;}S.path=out;}
function launch(){if(S.level===11||S.ship?.launched)return;S.ghostPlayback=true;S.scoutCloneAge=0;S.scoutAttackAge=0;S.flightTrace=[captureTracePoint(S.ship.x,S.ship.y,S.elapsed)];S.traceClock=0;let speed=+$('thrust').value,ang=+$('heading').value*Math.PI/180;S.ship.vx=Math.cos(ang)*speed;S.ship.vy=Math.sin(ang)*speed;S.ship.angle=ang;S.ship.launched=true;S.paused=false;$('pauseBtn').textContent='일시정지';$('shipStatus').textContent='IN FLIGHT';$('statusText').textContent='FLIGHT PATH ACTIVE';predict();if(S.tutorialMode){S.tutorialFlags.launch=true;updateTutorialPanel();}}
function rankData(){try{let v=JSON.parse(localStorage.getItem('spaceRescueRanks')||'[]');return Array.isArray(v)?v.filter(r=>r&&typeof r.nickname==='string'&&Number.isFinite(+r.level)&&Number.isFinite(+r.time)):[];}catch(e){return[];}}
function compareRecord(a,b){return (+b.level)-(+a.level)||(+a.time)-(+b.time);}
function bestRecords(rows){const best=new Map();for(const r of rows){const key=r.nickname;const prev=best.get(key);if(!prev||compareRecord(r,prev)<0)best.set(key,r);}return [...best.values()].sort(compareRecord);}
function saveRecord(level){if(S.tutorialMode||S.recorded)return;S.recorded=true;if(S.nick==='관리자')return;const rows=rankData(),traces={...(S.runTraces||{}),[level]:S.flightTrace.slice()},candidate={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),nickname:S.nick,level,time:Math.round((S.total+S.elapsed)*10)/10,date:new Date().toISOString(),result:level===11?'CLEARED':'INCOMPLETE',traces};const previous=rows.filter(r=>r.nickname===candidate.nickname).sort(compareRecord)[0];if(previous&&compareRecord(candidate,previous)>=0)return;const kept=rows.filter(r=>r.nickname!==candidate.nickname);kept.push(candidate);kept.sort(compareRecord);try{localStorage.setItem('spaceRescueRanks',JSON.stringify(kept.slice(0,500)));}catch(e){alert('저장 공간이 부족합니다. 랭킹 JSON 백업을 진행하세요.');}}
function cleanupRankDuplicates(){const rows=rankData(),clean=bestRecords(rows),removed=rows.length-clean.length;if(!removed){alert('삭제할 중복 기록이 없습니다.');return;}if(!confirm('닉네임별 최고 기록만 남기고 '+removed+'개의 기록을 삭제할까요?'))return;try{localStorage.setItem('spaceRescueRanks',JSON.stringify(clean));showRanks();alert(removed+'개의 중복 기록을 삭제했습니다.');}catch(e){alert('기록 정리에 실패했습니다. 저장 공간을 확인하세요.');}}
function fmt(t){t=Math.floor(Math.max(0,t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
function levelClear(){if(!S.running||S.level>10)return;S.runTraces=S.runTraces||{};S.runTraces[S.level]=S.flightTrace.slice();S.running=false;S.paused=true;S.total+=S.elapsed;S.elapsed=0;$('clearTitle').textContent='LEVEL '+S.level+' CLEAR';$('clearText').textContent=S.level===10?'외계행성에 도착했습니다. 마지막 전투에서 백데렐라를 구출하세요.':'다음 항성계로 이동할까요?';$('levelClear').classList.remove('hidden');$('shipStatus').textContent='WORMHOLE TRANSIT';}
function lose(){if(!S.running)return;if(S.tutorialMode){const trainingLevel=S.level===11?11:1;setLevel(trainingLevel);S.running=true;S.paused=false;$('statusText').textContent='훈련 재배치 완료 · 다시 시도하세요';return;}S.running=false;S.paused=true;saveRecord(S.level);$('gameOver').classList.remove('hidden');$('shipStatus').textContent='DESTROYED';}
function home(){S.running=false;S.paused=false;S.recorded=false;S.tutorialMode=false;S.tutorialFinished=false;$('tutorialPanel').classList.add('hidden');S.level=1;['levelClear','gameOver','ending','combatPanel','rankScreen','helpScreen','infoCard'].forEach(id=>$(id).classList.add('hidden'));$('startScreen').classList.remove('hidden');$('statusText').textContent='SYSTEM READY';}
function start(){S.tutorialMode=false;$('tutorialPanel').classList.add('hidden');if(!S.difficulty){$('difficultyWarning').classList.remove('hidden');return;}let n=$('nickname').value.trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,16);if(!n){$('nickname').focus();return;}S.nick=n;savePlayCount(n);S.total=0;S.recorded=false;S.runTraces={};S.running=true;S.paused=false;setLevel(1);$('startScreen').classList.add('hidden');$('statusText').textContent='MISSION ACTIVE';}
function next(){ $('levelClear').classList.add('hidden');S.recorded=false;S.running=true;S.paused=false;setLevel(Math.min(11,S.level+1));}
function finish(){S.running=false;S.paused=true;saveRecord(11);$('combatPanel').classList.add('hidden');$('finalStats').textContent=S.nick+' · LEVEL 11 · '+fmt(S.total+S.elapsed);$('ending').classList.remove('hidden');}
function safe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function playCountData(){try{const v=JSON.parse(localStorage.getItem('spaceRescuePlayCounts')||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(e){return{};}}
function savePlayCount(nickname){const counts=playCountData();counts[nickname]=(Number(counts[nickname])||0)+1;counts._total=(Number(counts._total)||0)+1;try{localStorage.setItem('spaceRescuePlayCounts',JSON.stringify(counts));}catch(e){console.warn('플레이 횟수 저장 실패',e);}}
function showPlayCounts(){const counts=playCountData(),rows=Object.entries(counts).filter(([k,v])=>k!=='_total'&&Number.isFinite(+v)&&+v>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko'));$('playCountTotal').textContent=String(Number(counts._total)||0);$('playCountRows').innerHTML=rows.length?rows.map(([name,count],i)=>'<tr><td>'+(i+1)+'</td><td>'+safe(name)+'</td><td>'+Number(count)+'</td></tr>').join(''):'<tr><td colspan="3">아직 플레이 기록이 없습니다.</td></tr>';}
function showRanks(){let rows=rankData().sort(compareRecord);$('rankRows').innerHTML=rows.length?rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+safe(r.nickname)+'</td><td>'+r.level+'</td><td>'+fmt(r.time)+'</td><td>'+new Date(r.date).toLocaleDateString('ko-KR')+'</td></tr>').join(''):'<tr><td colspan="5">아직 기록이 없습니다.</td></tr>';showPlayCounts();}
function exportRanks(type){let rows=rankData().sort((a,b)=>b.level-a.level||a.time-b.time),csv='Rank,Nickname,Level,TimeSeconds,Date,Result\n'+rows.map((r,i)=>[i+1,r.nickname,r.level,r.time,r.date,r.result].map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'),blob,name;if(type==='json'){blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'});name='space-rescue-rankings.json';}else if(type==='csv'){blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});name='space-rescue-rankings.csv';}else if(type==='xlsx'){let html='<html><head><meta charset="utf-8"></head><body><table>'+csv.split('\n').map(line=>'<tr>'+line.split(',').map(v=>'<td>'+v.replace(/^"|"$/g,'').replace(/""/g,'"')+'</td>').join('')+'</tr>').join('')+'</table></body></html>';blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel'});name='space-rescue-rankings.xls';}else if(type==='txt'){blob=new Blob([rows.map((r,i)=>(i+1)+'. '+r.nickname+' | LEVEL '+r.level+' | '+fmt(r.time)+' | '+r.date).join('\n')],{type:'text/plain'});name='space-rescue-rankings.txt';}else{let html='<!doctype html><meta charset="utf-8"><title>SPACE RESCUE Rankings</title><h1>SPACE RESCUE — 명예의 전당</h1><table border="1" cellpadding="8"><tr><th>순위</th><th>닉네임</th><th>레벨</th><th>시간</th><th>날짜</th></tr>'+rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+safe(r.nickname)+'</td><td>'+r.level+'</td><td>'+r.time+'</td><td>'+safe(r.date)+'</td></tr>').join('')+'</table>';blob=new Blob([html],{type:'text/html'});name='space-rescue-rankings.html';}let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);}
function bg(t){ctx.fillStyle='#030713';ctx.fillRect(0,0,W,H);let g=ctx.createRadialGradient(W*.42,H*.45,5,W*.42,H*.45,Math.max(W,H)*.8);g.addColorStop(0,'#101a38');g.addColorStop(.55,'#080e22');g.addColorStop(1,'#02040c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(const s of stars){ctx.globalAlpha=s.a*(.7+.3*Math.sin(t*.001+s.p));ctx.fillStyle='#c8eaff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();}ctx.globalAlpha=1;for(let i=0;i<3;i++){let x=W*(.2+i*.3),y=H*(.25+(i%2)*.45),ng=ctx.createRadialGradient(x,y,0,x,y,150);ng.addColorStop(0,'rgba(44,91,165,.1)');ng.addColorStop(1,'rgba(35,60,140,0)');ctx.fillStyle=ng;ctx.fillRect(x-150,y-150,300,300);}}
function star(b,t){let r=b.r,g=ctx.createRadialGradient(b.x-r*.2,b.y-r*.2,1,b.x,b.y,r*1.6);g.addColorStop(0,'#fff9d5');g.addColorStop(.3,'#ffd66d');g.addColorStop(.7,'#ff7b31');g.addColorStop(1,'rgba(255,90,25,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,r*1.6,0,TAU);ctx.fill();ctx.save();ctx.shadowBlur=26;ctx.shadowColor='#ff9c43';ctx.fillStyle='#ffcf68';ctx.beginPath();ctx.arc(b.x,b.y,r*.72,0,TAU);ctx.fill();ctx.restore();}
function blackhole(b,t){let r=b.r;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(t*.00012);ctx.scale(1,.42);let g=ctx.createRadialGradient(0,0,r*.55,0,0,r*2.4);g.addColorStop(0,'#000');g.addColorStop(.4,'#02030a');g.addColorStop(.54,'#ffb35c');g.addColorStop(.65,'#ec6a35');g.addColorStop(.82,'rgba(93,142,255,.5)');g.addColorStop(1,'rgba(28,57,130,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*2.4,0,TAU);ctx.fill();ctx.restore();ctx.strokeStyle='rgba(180,210,255,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y-r*.22,r*1.2,r*.48,0,Math.PI,TAU);ctx.stroke();ctx.fillStyle='#000';ctx.shadowBlur=20;ctx.shadowColor='#000';ctx.beginPath();ctx.arc(b.x,b.y,r*.72,0,TAU);ctx.fill();ctx.shadowBlur=0;}
function body(b,t){if(b.type==='star'){star(b,t);return;}if(b.type==='blackhole'){blackhole(b,t);return;}if(b.type==='ufo'){ctx.save();ctx.translate(b.x,b.y);ctx.shadowBlur=16;ctx.shadowColor='#7deeff';ctx.fillStyle='#a9c6d9';ctx.beginPath();ctx.ellipse(0,0,b.r*1.55,b.r*.48,0,0,TAU);ctx.fill();ctx.fillStyle='#d9f6ff';ctx.beginPath();ctx.ellipse(0,-b.r*.18,b.r*.65,b.r*.42,0,Math.PI,TAU);ctx.fill();ctx.fillStyle='#57edff';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(i*b.r*.48,b.r*.12,2,0,TAU);ctx.fill();}ctx.restore();ctx.fillStyle='#d5f8ff';ctx.font='9px Orbitron';ctx.textAlign='center';ctx.fillText('UFO',b.x,b.y+b.r+14);return;}ctx.save();if(b.type==='ring'){ctx.strokeStyle='rgba(221,190,135,.8)';ctx.lineWidth=b.r*.3;ctx.beginPath();ctx.ellipse(b.x,b.y,b.r*1.7,b.r*.5,-.2,0,TAU);ctx.stroke();}let colors=b.type==='gas'?['#fff1ce','#df9c52','#92512e']:b.type==='moon'?['#eee','#9298a8','#41495d']:b.type==='asteroid'||b.type==='comet'?['#b8a997','#71695e','#37343a']:['#c3f6ff','#2786bd','#12304f'];let g=ctx.createRadialGradient(b.x-b.r*.35,b.y-b.r*.4,1,b.x,b.y,b.r);g.addColorStop(0,colors[0]);g.addColorStop(.55,colors[1]);g.addColorStop(1,colors[2]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();if(b.type==='comet'){ctx.strokeStyle='rgba(120,220,255,.55)';ctx.lineWidth=b.r*.7;ctx.beginPath();ctx.moveTo(b.x-b.r,b.y);ctx.lineTo(b.x-b.r*6,b.y-b.r*2);ctx.stroke();}ctx.restore();ctx.fillStyle='rgba(220,240,255,.65)';ctx.font='9px Orbitron';ctx.textAlign='center';ctx.fillText(b.name,b.x,b.y+b.r+13);}
function secretDoor(t){const d=S.secretDoor;if(!d||S.level!==1)return;const pulse=.72+.28*Math.sin(t*.006);ctx.save();ctx.translate(d.x,d.y);ctx.rotate(t*.0007);ctx.globalCompositeOperation='lighter';let glow=ctx.createRadialGradient(0,0,1,0,0,d.r*3.8);glow.addColorStop(0,'rgba(145,255,255,.72)');glow.addColorStop(.28,'rgba(55,220,255,.3)');glow.addColorStop(1,'rgba(35,150,255,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,d.r*3.8,0,TAU);ctx.fill();ctx.shadowBlur=28*pulse;ctx.shadowColor='#62efff';ctx.strokeStyle='rgba(165,255,255,.98)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,d.r*.88,d.r*1.42,0,0,TAU);ctx.stroke();ctx.shadowBlur=16;ctx.strokeStyle='rgba(75,190,255,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,d.r*1.18,d.r*1.7,0,0,TAU);ctx.stroke();let core=ctx.createRadialGradient(0,0,1,0,0,d.r*1.5);core.addColorStop(0,'rgba(205,255,255,.8)');core.addColorStop(.5,'rgba(45,190,255,.38)');core.addColorStop(1,'rgba(20,80,180,.05)');ctx.fillStyle=core;ctx.beginPath();ctx.ellipse(0,0,d.r*.65,d.r*1.18,0,0,TAU);ctx.fill();ctx.restore();ctx.globalCompositeOperation='source-over';ctx.fillStyle='#d4ffff';ctx.shadowBlur=10;ctx.shadowColor='#55eaff';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.fillText('?',d.x,d.y+3);ctx.shadowBlur=0;ctx.font='8px Orbitron';ctx.fillStyle='#bafaff';ctx.fillText('SECRET GATE',d.x,d.y+d.r+18);}
function worm(t){let w=S.worm;ctx.save();ctx.translate(w.x,w.y);ctx.rotate(t*.0003);for(let i=0;i<5;i++){ctx.strokeStyle='rgba(166,104,255,'+(.65-i*.1)+')';ctx.lineWidth=3-i*.3;ctx.beginPath();ctx.ellipse(0,0,w.r*(1+i*.18),w.r*(.55+i*.13),0,0,TAU);ctx.stroke();}let g=ctx.createRadialGradient(0,0,2,0,0,w.r);g.addColorStop(0,'#030612');g.addColorStop(.5,'#13104a');g.addColorStop(.8,'rgba(104,65,207,.65)');g.addColorStop(1,'rgba(132,85,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,w.r,0,TAU);ctx.fill();ctx.restore();ctx.fillStyle='#c8b3ff';ctx.font='10px Orbitron';ctx.textAlign='center';ctx.fillText('WORMHOLE',w.x,w.y+w.r+19);}
function ship(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.shadowBlur=14;ctx.shadowColor='#66eaff';ctx.fillStyle='#eafaff';ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-9,-7);ctx.lineTo(-5,0);ctx.lineTo(-9,7);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#48b9ed';ctx.beginPath();ctx.moveTo(-7,-3);ctx.lineTo(-16,0);ctx.lineTo(-7,3);ctx.fill();if(p.launched){ctx.fillStyle='rgba(255,150,60,.8)';ctx.beginPath();ctx.moveTo(-9,-3);ctx.lineTo(-19-rand(0,4),0);ctx.lineTo(-9,3);ctx.fill();}ctx.restore();}
function drawUfoAttack(){if(S.level!==10)return;const u=S.bodies.find(b=>b.type==='ufo');if(!u)return;ctx.save();ctx.strokeStyle='rgba(255,70,105,.35)';ctx.lineWidth=2;ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(u.x,u.y+u.r*.5);ctx.lineTo(S.ship.x,S.ship.y);ctx.stroke();ctx.restore();}
function captureTracePoint(x,y,time){return[+x.toFixed(1),+y.toFixed(1),+time.toFixed(2),S.bodies.map(b=>[+b.x.toFixed(1),+b.y.toFixed(1),+b.r.toFixed(1),b.type,b.name||''])];}
function drawGhostBodies(trace,index,f){const a=trace[index],b=trace[Math.min(index+1,trace.length-1)],aa=Array.isArray(a[3])?a[3]:[],bb=Array.isArray(b[3])?b[3]:[];for(let i=0;i<aa.length;i++){const p=aa[i],q=bb[i]||p,x=p[0]+((q[0]??p[0])-p[0])*f,y=p[1]+((q[1]??p[1])-p[1])*f,r=p[2],type=p[3];ctx.save();ctx.globalAlpha=.28;ctx.setLineDash([4,5]);ctx.lineWidth=1.5;let color=type==='blackhole'?'#b58cff':type==='star'?'#ffd27a':type==='ufo'?'#ff8cc8':type==='gas'||type==='ring'?'#80d9ee':type==='moon'?'#c5cbd5':'#8db8ff';ctx.strokeStyle=color;ctx.fillStyle=color;if(type==='blackhole'){ctx.shadowBlur=10;ctx.shadowColor=color;ctx.beginPath();ctx.arc(x,y,r*1.65,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(0,0,0,.8)';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}else{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(x,y,r+3,0,TAU);ctx.stroke();}ctx.setLineDash([]);ctx.font='9px sans-serif';ctx.fillStyle=color;ctx.fillText(p[4]||type.toUpperCase(),x+r+4,y-3);ctx.restore();}}
function drawGhostPath(){if(!S.ghostPlayback)return;const trace=S.ghostRecord?.trace;if(!trace||trace.length<2)return;ctx.save();ctx.strokeStyle='rgba(255,190,95,.58)';ctx.fillStyle='rgba(255,190,95,.82)';ctx.lineWidth=2.4;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(trace[0][0],trace[0][1]);for(let i=1;i<trace.length;i++)ctx.lineTo(trace[i][0],trace[i][1]);ctx.stroke();ctx.setLineDash([]);let idx=0;while(idx<trace.length-1&&trace[idx+1][2]<=S.elapsed)idx++;const a=trace[idx],b=trace[Math.min(idx+1,trace.length-1)],span=Math.max(.001,b[2]-a[2]),f=clamp((S.elapsed-a[2])/span,0,1),gx=a[0]+(b[0]-a[0])*f,gy=a[1]+(b[1]-a[1])*f;drawGhostBodies(trace,idx,f);ctx.shadowBlur=12;ctx.shadowColor='#ffc36b';ctx.beginPath();ctx.arc(gx,gy,7,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.font='bold 10px sans-serif';ctx.fillText('PREVIOUS BEST',gx+10,gy-10);ctx.restore();}
function drawAsteroids(){for(const a of S.asteroids.concat(S.oortAsteroids)){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.rotation??a.angle);ctx.fillStyle='#82796f';ctx.strokeStyle='#c1b5a4';ctx.lineWidth=1.2;ctx.shadowBlur=7;ctx.shadowColor='rgba(190,170,145,.35)';ctx.beginPath();for(let i=0;i<9;i++){const ang=i*TAU/9,rr=a.r*(.78+.22*Math.sin(i*7.13+a.r));const x=Math.cos(ang)*rr,y=Math.sin(ang)*rr;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(35,32,30,.45)';ctx.beginPath();ctx.arc(-a.r*.25,-a.r*.1,a.r*.16,0,TAU);ctx.arc(a.r*.28,a.r*.22,a.r*.11,0,TAU);ctx.fill();ctx.restore();}}
function drawPath(){if(!S.path.length)return;ctx.save();ctx.strokeStyle='rgba(92,226,255,.78)';ctx.lineWidth=1.6;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(S.ship.x,S.ship.y);for(const p of S.path)ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();}
function drawScoutAlien(a,t){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.sin(t*.0018)*.12);ctx.shadowBlur=13;ctx.shadowColor='#4dffc2';ctx.fillStyle='#79efb6';ctx.beginPath();ctx.ellipse(0,0,a.r*.72,a.r,0,0,TAU);ctx.fill();ctx.fillStyle='#baffdf';ctx.beginPath();ctx.ellipse(0,-a.r*.38,a.r*.85,a.r*.55,0,0,TAU);ctx.fill();ctx.fillStyle='#102e39';ctx.beginPath();ctx.ellipse(-a.r*.28,-a.r*.4,a.r*.15,a.r*.24,-.2,0,TAU);ctx.ellipse(a.r*.28,-a.r*.4,a.r*.15,a.r*.24,.2,0,TAU);ctx.fill();ctx.strokeStyle='#69ffc6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-a.r*.35,a.r*.65);ctx.lineTo(-a.r*.65,a.r*1.25);ctx.moveTo(a.r*.35,a.r*.65);ctx.lineTo(a.r*.65,a.r*1.25);ctx.stroke();ctx.restore();}
function drawPortals(t){for(const p of S.portalEffects){const pulse=1+Math.sin(t*.012)*.08;for(const pt of [{x:p.x,y:p.y},{x:p.destX,y:p.destY}]){ctx.save();ctx.translate(pt.x,pt.y);ctx.scale(pulse,1);ctx.strokeStyle='rgba(91,224,255,.9)';ctx.fillStyle='rgba(45,125,255,.13)';ctx.lineWidth=3;ctx.shadowBlur=18;ctx.shadowColor='#42cfff';ctx.beginPath();ctx.ellipse(0,0,17,29,0,0,TAU);ctx.fill();ctx.stroke();ctx.restore();}}}
function drawEnemyShotTrail(p,width=2.6){ctx.save();ctx.strokeStyle='#ff527b';ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=11;ctx.shadowColor='#ff315e';ctx.beginPath();if(p.trail&&p.trail.length>1){ctx.moveTo(p.trail[0].x,p.trail[0].y);for(let i=1;i<p.trail.length;i++)ctx.lineTo(p.trail[i].x,p.trail[i].y);}else{ctx.moveTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.lineTo(p.x,p.y);}ctx.stroke();ctx.restore();}
function drawScoutShots(){for(const p of S.enemyShots)drawEnemyShotTrail(p,2.6);}
function drawCombat(t){const q=S.planet;let pg=ctx.createRadialGradient(q.x-q.r*.35,q.y-q.r*.4,2,q.x,q.y,q.r);pg.addColorStop(0,'#c9f5ce');pg.addColorStop(.35,'#4caa83');pg.addColorStop(.75,'#176b69');pg.addColorStop(1,'#061d38');ctx.fillStyle=pg;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,TAU);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,TAU);ctx.clip();ctx.fillStyle='rgba(179,220,139,.55)';for(let i=0;i<12;i++){let x=q.x+Math.sin(i*8.7)*q.r*.7,y=q.y+Math.cos(i*4.3)*q.r*.7;ctx.beginPath();ctx.ellipse(x,y,q.r*.13,q.r*.07,i*.6,0,TAU);ctx.fill();}ctx.restore();for(const p of S.enemyShots)drawEnemyShotTrail(p,3);for(const p of S.shots){ctx.fillStyle=p.type==='beam'?'#79ffb8':'#ffb65e';ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(p.x,p.y,p.type==='beam'?6:5,0,TAU);ctx.fill();ctx.shadowBlur=0;}for(const a of S.aliens){ctx.save();ctx.translate(a.x,a.y);ctx.shadowBlur=14;ctx.shadowColor='#4dffc2';ctx.fillStyle='#79efb6';ctx.beginPath();ctx.ellipse(0,0,a.r*.72,a.r,0,0,TAU);ctx.fill();ctx.fillStyle='#baffdf';ctx.beginPath();ctx.ellipse(0,-a.r*.38,a.r*.85,a.r*.55,0,0,TAU);ctx.fill();ctx.fillStyle='#102e39';ctx.beginPath();ctx.ellipse(-a.r*.28,-a.r*.4,a.r*.15,a.r*.24,-.2,0,TAU);ctx.ellipse(a.r*.28,-a.r*.4,a.r*.15,a.r*.24,.2,0,TAU);ctx.fill();ctx.strokeStyle='#69ffc6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-a.r*.35,a.r*.65);ctx.lineTo(-a.r*.65,a.r*1.25);ctx.moveTo(a.r*.35,a.r*.65);ctx.lineTo(a.r*.65,a.r*1.25);ctx.stroke();ctx.restore();}ctx.fillStyle='#8e704d';ctx.beginPath();ctx.ellipse(W*.73,H*.76,W*.3,H*.07,0,0,TAU);ctx.fill();}
function draw(t){bg(t);ctx.save();ctx.translate(W/2+camera.x,H/2+camera.y);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-W/2,-H/2);if(S.level===11){drawCombat(t);ship(S.ship);}else{S.bodies.forEach(b=>body(b,t));drawAsteroids();drawUfoAttack();secretDoor(t);worm(t);drawGhostPath();drawPortals(t);drawPath();drawScoutShots();S.aliens.forEach(a=>drawScoutAlien(a,t));ship(S.ship);}ctx.restore();}
function loop(now){requestAnimationFrame(loop);let raw=Math.min(.05,(now-S.last)/1000||0);S.last=now;if(S.running&&!S.paused){S.elapsed+=raw;S.acc+=raw*S.rate;let dt=1/120,steps=0;while(S.acc>=dt&&steps<12){step(dt);S.acc-=dt;steps++;}if(steps===12)S.acc=0;pathClock+=raw;if(pathClock>.2){predict();pathClock=0;}if(S.level<=10){
 if(S.ship?.launched){S.scoutAttackAge=(S.scoutAttackAge||0)+raw;S.scoutCloneAge=(S.scoutCloneAge||0)+raw;}
 while(S.aliensEnabled&&S.ship?.launched&&S.scoutCloneAge>=5){
  S.scoutCloneAge-=5;
  const current=S.aliens.length,limit=64,add=Math.min(current,limit-current);
  if(add>0){
   const parents=S.aliens.slice(0,add);
   for(const parent of parents){
    const angle=Math.random()*Math.PI*2,offset=18+Math.random()*20;
    S.aliens.push({x:parent.x+Math.cos(angle)*offset,y:parent.y+Math.sin(angle)*offset,vx:parent.vx*.7,vy:parent.vy*.7,r:parent.r,side:Math.random()<.5?-1:1,cooldown:rand(2.2,3.4),cloned:true,portalCooldown:rand(7,12)});
   }
  }
 }
}if(S.level===11){S.combatAge=(S.combatAge||0)+raw;if(combatKeys.has('2')&&beamKeyDownAt&&now-beamKeyDownAt>=1000){beamRepeatClock-=raw;if(beamRepeatClock<=0){fire('beam');beamRepeatClock=.18;}}if(S.combatAge>=1.5){for(const a of S.aliens){a.cooldown-=raw;if(a.cooldown<=0){const laserSpeed=W*.48,aim=interceptPoint(a,S.ship,laserSpeed),dx=aim.x-a.x,dy=aim.y-a.y,d=Math.hypot(dx,dy)||1;S.enemyShots.push({x:a.x,y:a.y,vx:Math.cos(aim.angle)*laserSpeed,vy:Math.sin(aim.angle)*laserSpeed,life:Math.min(5,aim.time+1),gravity:true,trail:[{x:a.x,y:a.y}]});a.cooldown=rand(1.6,3.1);}}}S.shots.forEach(p=>{p.x+=p.vx*raw;p.y+=p.vy*raw;p.life-=raw;if(!p.hit&&Math.hypot(p.x-S.planet.x,p.y-S.planet.y)<S.planet.r){p.hit=true;S.score=Math.min(100,S.score+(p.type==='beam'?15:5));$('combatScore').textContent=S.score;$('scoreBar').style.width=S.score+'%';}});S.shots=S.shots.filter(p=>p.life>0&&!p.hit);if(S.score>=100)finish();}}$('timer').textContent=fmt(S.total+S.elapsed);$('simRate').textContent=S.rate.toFixed(2)+'×';steeringWheel.classList.toggle('visible',!!(S.running&&!S.paused&&S.ship?.launched&&S.level<=10));if(S.ship&&S.level<=10)$('distance').textContent=Math.round(Math.hypot(S.worm.x-S.ship.x,S.worm.y-S.ship.y))+' AU*';draw(now);}
requestAnimationFrame(loop);
function fire(type){if(S.level!==11||!S.running)return;const p=S.ship,q=S.planet,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,speed=type==='beam'?W*.9:W*.55;S.shots.push({x:p.x+Math.cos(p.angle)*17,y:p.y+Math.sin(p.angle)*17,vx:dx/d*speed,vy:dy/d*speed+(type==='mars'?-35:0),life:2.4,type});}
// Use a wall-clock deadline so the visible countdown advances reliably.
let startMenuRefreshDeadline=Date.now()+180000;
let startMenuWasActive=false;
function renderRefreshCountdown(remaining=180){
 const el=$('refreshCountdown');if(!el)return;
 const m=Math.floor(remaining/60),s=remaining%60;
 el.textContent='자동 새로고침까지 '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function forceRefresh(){
 const url=new URL(location.href);
 url.searchParams.set('_force_refresh',String(Date.now()));
 location.replace(url.toString());
}
$('manualRefresh').onclick=forceRefresh;
function updateStartMenuRefresh(){
 const menuVisible=!$('startScreen').classList.contains('hidden');
 const otherOverlayVisible=['rankScreen','helpScreen','levelClear','gameOver','ending'].some(id=>!$(id).classList.contains('hidden'));
 const active=menuVisible&&!otherOverlayVisible&&!S.running;
 if(!active){
  startMenuRefreshDeadline=Date.now()+180000;
  startMenuWasActive=false;
  renderRefreshCountdown(180);
  return;
 }
 if(!startMenuWasActive){startMenuRefreshDeadline=Date.now()+180000;startMenuWasActive=true;}
 const remaining=Math.max(0,Math.ceil((startMenuRefreshDeadline-Date.now())/1000));
 renderRefreshCountdown(remaining);
 if(remaining<=0)forceRefresh();
}
updateStartMenuRefresh();
setInterval(updateStartMenuRefresh,250);
const difficultyButtons=[...document.querySelectorAll('[data-difficulty]')];
function renderDifficulty(){difficultyButtons.forEach(btn=>btn.classList.toggle('selected',btn.dataset.difficulty===S.difficulty));}
difficultyButtons.forEach(btn=>btn.addEventListener('click',()=>{S.difficulty=btn.dataset.difficulty;$('difficultyWarning').classList.add('hidden');renderDifficulty();}));
renderDifficulty();

const alienToggleButtons=[...document.querySelectorAll('[data-aliens]')];
function renderAlienToggle(){alienToggleButtons.forEach(btn=>{const selected=(btn.dataset.aliens==='on')===S.aliensEnabled;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});}
alienToggleButtons.forEach(btn=>btn.addEventListener('click',()=>{S.aliensEnabled=btn.dataset.aliens==='on';try{localStorage.setItem('spaceRescueAliensEnabled',S.aliensEnabled?'on':'off');}catch(e){}renderAlienToggle();}));
renderAlienToggle();
renderRefreshCountdown();
const miniAd=$('miniAd');
$('closeMiniAd')?.addEventListener('click',()=>miniAd?.remove());
if(miniAd){
 let adDrag=null,adMotion=null;
 const clampAdPosition=(x,y)=>({x:Math.max(0,Math.min(innerWidth-miniAd.offsetWidth,x)),y:Math.max(0,Math.min(innerHeight-miniAd.offsetHeight,y))});
 const placeAd=(x,y,save=true)=>{const p=clampAdPosition(x,y);miniAd.style.left=p.x+'px';miniAd.style.top=p.y+'px';miniAd.style.right='auto';miniAd.style.bottom='auto';if(save){try{localStorage.setItem('spaceRescueAdPosition',JSON.stringify(p));}catch(e){}}return p;};
 const saveAdPosition=()=>{const r=miniAd.getBoundingClientRect();try{localStorage.setItem('spaceRescueAdPosition',JSON.stringify({x:r.left,y:r.top}));}catch(e){}};
 const stopAdMotion=()=>{if(adMotion!==null)cancelAnimationFrame(adMotion);adMotion=null;};
 try{const saved=JSON.parse(localStorage.getItem('spaceRescueAdPosition')||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){miniAd.style.left=saved.x+'px';miniAd.style.top=saved.y+'px';miniAd.style.right='auto';miniAd.style.bottom='auto';requestAnimationFrame(()=>placeAd(saved.x,saved.y,false));}}catch(e){}
 miniAd.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;stopAdMotion();const r=miniAd.getBoundingClientRect();adDrag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,lastX:e.clientX,lastY:e.clientY,lastT:performance.now(),vx:0,vy:0};miniAd.setPointerCapture(e.pointerId);miniAd.style.cursor='grabbing';});
 miniAd.addEventListener('pointermove',e=>{if(!adDrag||adDrag.id!==e.pointerId)return;const now=performance.now(),dt=Math.max(.008,(now-adDrag.lastT)/1000);adDrag.vx=(e.clientX-adDrag.lastX)/dt;adDrag.vy=(e.clientY-adDrag.lastY)/dt;const speed=Math.hypot(adDrag.vx,adDrag.vy);if(speed>1800){adDrag.vx*=1800/speed;adDrag.vy*=1800/speed;}adDrag.lastX=e.clientX;adDrag.lastY=e.clientY;adDrag.lastT=now;placeAd(e.clientX-adDrag.dx,e.clientY-adDrag.dy,false);});
 const stopAdDrag=e=>{if(!adDrag||adDrag.id!==e.pointerId)return;const v={vx:adDrag.vx,vy:adDrag.vy};adDrag=null;miniAd.style.cursor='grab';let last=performance.now();if(Math.hypot(v.vx,v.vy)<35){saveAdPosition();return;}const friction=1.65,bounce=.84;const animate=now=>{const dt=Math.min(.04,(now-last)/1000);last=now;const r=miniAd.getBoundingClientRect();let x=r.left+v.vx*dt,y=r.top+v.vy*dt,maxX=Math.max(0,innerWidth-miniAd.offsetWidth),maxY=Math.max(0,innerHeight-miniAd.offsetHeight);if(x<0){x=0;v.vx=Math.abs(v.vx)*bounce;}else if(x>maxX){x=maxX;v.vx=-Math.abs(v.vx)*bounce;}if(y<0){y=0;v.vy=Math.abs(v.vy)*bounce;}else if(y>maxY){y=maxY;v.vy=-Math.abs(v.vy)*bounce;}placeAd(x,y,false);const decay=Math.exp(-friction*dt);v.vx*=decay;v.vy*=decay;if(Math.hypot(v.vx,v.vy)<14){adMotion=null;saveAdPosition();return;}adMotion=requestAnimationFrame(animate);};adMotion=requestAnimationFrame(animate);};
 miniAd.addEventListener('pointerup',stopAdDrag);miniAd.addEventListener('pointercancel',stopAdDrag);
 miniAd.addEventListener('keydown',e=>{const d={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!d)return;e.preventDefault();stopAdMotion();const r=miniAd.getBoundingClientRect();placeAd(r.left+d[0],r.top+d[1]);});
 addEventListener('resize',()=>{stopAdMotion();const r=miniAd.getBoundingClientRect();placeAd(r.left,r.top);});
}
$('startBtn').onclick=start;$('nickname').addEventListener('keydown',e=>{if(e.key==='Enter')start();});$('launchBtn').onclick=launch;
document.addEventListener('keydown',e=>{
 if(e.code!=='Space'||e.repeat||!S.running||S.paused||S.level===11||!S.ship||S.ship.launched)return;
 const el=document.activeElement;
 if(el&&(el.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(el.tagName)))return;
 e.preventDefault();launch();
});$('pauseBtn').onclick=()=>{S.paused=!S.paused;$('pauseBtn').textContent=S.paused?'재개':'일시정지';};$('quitBtn').onclick=()=>{if(S.running)saveRecord(S.level);home();};$('nextLevel').onclick=next;$('finishGame').onclick=()=>{saveRecord(S.level);home();};$('retryHome').onclick=home;$('endingHome').onclick=home;
$('showRanks').onclick=()=>{showRanks();$('rankScreen').classList.remove('hidden');};$('cleanupRanks').onclick=cleanupRankDuplicates;
document.querySelectorAll('[data-rank-tab]').forEach(b=>b.onclick=()=>{const tab=b.dataset.rankTab;document.querySelectorAll('[data-rank-tab]').forEach(x=>x.classList.toggle('selected',x===b));$('rankLeaderboard').classList.toggle('hidden',tab!=='leaderboard');$('rankPlayCounts').classList.toggle('hidden',tab!=='plays');if(tab==='plays')showPlayCounts();});
const manualTitles=['01 · 미션 개요','02 · 조작법','03 · 비행과 중력','04 · 천체와 웜홀','05 · 라운드 구성','06 · 최종 전투','07 · 성공과 실패','08 · 랭킹과 기록'];let manualPage=1;
function showManualPage(n){const pages=[...document.querySelectorAll('[data-manual-page]')];manualPage=Math.max(1,Math.min(pages.length,n));pages.forEach((p,i)=>p.classList.toggle('active',i===manualPage-1));$('manualPageTitle').textContent=manualTitles[manualPage-1];$('manualPageCount').textContent=manualPage+' / '+pages.length;$('manualPrev').disabled=manualPage===1;$('manualNext').textContent=manualPage===pages.length?'처음 페이지로 ↺':'다음 페이지 →';$('manualContent')?.scrollTo(0,0);document.querySelector('.manual-content').scrollTop=0;}
function closeManual(){$('helpScreen').classList.add('hidden');}
$('howTo').onclick=()=>{$('helpScreen').classList.remove('hidden');showManualPage(1);};$('manualPrev').onclick=()=>showManualPage(manualPage-1);$('manualNext').onclick=()=>showManualPage(manualPage===8?1:manualPage+1);$('manualCloseTop').onclick=closeManual;$('manualCloseBottom').onclick=closeManual;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).classList.add('hidden'));
document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{S.rate=+b.dataset.speed;document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('selected',x===b));if(S.tutorialMode){S.tutorialFlags.speed=true;updateTutorialPanel();}});
function syncSteering(degrees){const v=Math.max(-180,Math.min(180,degrees));$('heading').value=v.toFixed(1);$('headingValue').textContent=v.toFixed(1)+'°';$('steeringWheel').style.setProperty('--wheel-angle',v+'deg');}
function setSteering(degrees,applyVelocity=true){const v=Math.max(-180,Math.min(180,degrees));syncSteering(v);if(S.ship&&S.level<=10){const a=v*Math.PI/180;if(S.ship.launched&&applyVelocity){const speed=Math.hypot(S.ship.vx,S.ship.vy);S.ship.vx=Math.cos(a)*speed;S.ship.vy=Math.sin(a)*speed;S.ship.angle=a;}else if(!S.ship.launched){S.ship.angle=a;predict();}}}
[['thrust','speedValue',''],['heading','headingValue','°'],['roll','rollValue','°'],['pitch','pitchValue','°'],['yaw','yawValue','°']].forEach(a=>$(a[0]).addEventListener('input',()=>{$(a[1]).textContent=(+$(a[0]).value).toFixed(1)+a[2];if(a[0]==='heading')setSteering(+$('heading').value);else if(!S.ship?.launched&&S.level<=10)predict();}));
const steeringWheel=$('steeringWheel');let steeringPointer=null;
steeringWheel.addEventListener('pointerdown',e=>{if(!S.running||S.paused||!S.ship?.launched||S.level===11)return;steeringPointer=e.pointerId;steeringWheel.setPointerCapture(e.pointerId);const r=steeringWheel.getBoundingClientRect();const a=Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))*180/Math.PI;setSteering(a);e.preventDefault();});
steeringWheel.addEventListener('pointermove',e=>{if(steeringPointer!==e.pointerId)return;const r=steeringWheel.getBoundingClientRect();const a=Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))*180/Math.PI;setSteering(a);});
function endSteering(e){if(steeringPointer===e.pointerId)steeringPointer=null;}
steeringWheel.addEventListener('pointerup',endSteering);steeringWheel.addEventListener('pointercancel',endSteering);
// PC 키보드 비행 조작: 좌우는 연속 선회, 위아래는 현재 속도 조절.
const flightKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
const heldFlightKeys=new Set();
function updateKeyboardFlightControls(dt,p){
 if(!S.running||S.paused||!p?.launched||S.level===11)return;
 const turn=(heldFlightKeys.has('ArrowRight')?1:0)-(heldFlightKeys.has('ArrowLeft')?1:0);
 if(turn){
  const speed=Math.hypot(p.vx,p.vy),angle=Math.atan2(p.vy,p.vx)+turn*1.8*dt;
  p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;p.angle=angle;
  syncSteering(angle*180/Math.PI);
 }
 const throttle=(heldFlightKeys.has('ArrowUp')?1:0)-(heldFlightKeys.has('ArrowDown')?1:0);
 if(throttle){
  const speed=clamp(Math.hypot(p.vx,p.vy)+throttle*90*dt,20,260);
  const angle=Math.atan2(p.vy,p.vx);
  p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;
  $('thrust').value=speed.toFixed(1);$('speedValue').textContent=speed.toFixed(1);
 }
}
document.addEventListener('keydown',e=>{
 if(!flightKeys.has(e.key)||!S.running||S.paused||!S.ship?.launched||S.level===11)return;
 const el=document.activeElement;
 if(el&&(el.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(el.tagName)))return;
 e.preventDefault();heldFlightKeys.add(e.key);
});
document.addEventListener('keyup',e=>{
 if(flightKeys.has(e.key)){heldFlightKeys.delete(e.key);if(S.running)e.preventDefault();}
});
addEventListener('blur',()=>heldFlightKeys.clear());

const tutorialLessons=[
 {title:'우주선 조종 준비',text:'오른쪽 FLIGHT COMPUTER에서 발사 속도와 방향을 설정합니다. 예상 궤도 점선이 설정에 따라 바뀌는 것을 확인하세요.',task:'실습: 발사 속도와 방향 슬라이더를 움직여 초기 조건을 바꿔 보세요.'},
 {title:'우주선 발사',text:'설정이 끝나면 발사 버튼을 누르거나 PC에서 스페이스바를 누릅니다. 발사 후에는 PC 방향키 또는 화면 조종 휠로 방향을 조절할 수 있습니다.',task:'실습: 실제 발사 버튼을 눌러 우주선을 출발시키세요.',requires:'launch'},
 {title:'중력과 예상 궤도',text:'행성이나 별 가까이에서는 중력이 우주선의 속도와 방향을 바꿉니다. 점선은 현재 천체 위치와 중력을 바탕으로 계산한 예상 경로입니다.',task:'실습: 우주선이 움직이며 중력에 의해 경로가 휘는 모습을 관찰하세요.'},
 {title:'천체 정보 확인',text:'천체를 선택하면 질량, 반지름, 표면 중력, 속도와 공전 방향을 확인할 수 있습니다.',task:'실습: PC는 천체 위에서 마우스 오른쪽 버튼, 모바일은 천체를 길게 눌러 정보를 여세요.',requires:'inspect'},
 {title:'시간 배속 조절',text:'시간 배속 버튼으로 시뮬레이션 진행 속도를 바꿉니다. 느린 배속은 궤도를 세밀하게 관찰할 때 유용합니다.',task:'실습: 0.5× 또는 2× 버튼을 눌러 배속을 바꿔 보세요.',requires:'speed'},
 {title:'웜홀 통과',text:'웜홀은 중심 천체 주위를 천천히 움직입니다. 현재 위치와 예상 궤도를 함께 살피고, 필요하면 속도와 방향을 조절해 진입하세요.',task:'실습: 지도 이동·확대 기능으로 웜홀 위치를 찾아보고 진입 경로를 계획하세요. 튜토리얼에서는 통과 여부와 관계없이 다음 단계로 진행할 수 있습니다.'},
 {title:'외계인과 생존',text:'발사 후 외계인은 우주선을 추적해 중력의 영향을 받는 레이저를 발사합니다. 외계인과 접촉하면 체력이 감소하며, 시간이 지나면 외계인이 복제되고 일부는 포털로 이동합니다.',task:'실습: 방향키나 조종 휠로 궤도를 바꾸며 외계인과 레이저를 피하는 방법을 익히세요. 훈련 중 파괴되면 자동 재배치됩니다.'},
 {title:'최종 전투 연습',text:'외계 행성 주변에서는 화성 폭탄과 NVIDIA 빔으로 행성을 공격합니다. 화성 폭탄은 1번 키, NVIDIA 빔은 2번 키를 1초 이상 누르면 연속 발사됩니다. 모바일에서는 전투 버튼을 사용하세요.',task:'실습: 화성 폭탄과 NVIDIA 빔을 각각 발사해 보세요. 행성에 명중하면 점수가 올라갑니다.'}
];
function updateTutorialPanel(){
 const n=S.tutorialStage,lesson=tutorialLessons[n-1];if(!lesson)return;
 $('tutorialProgress').textContent=String(n).padStart(2,'0')+' / 08';
 $('tutorialProgressBar').style.width=(n/8*100)+'%';
 $('tutorialTitle').textContent=S.tutorialFinished?'훈련 완료':lesson.title;
 $('tutorialText').textContent=S.tutorialFinished?'기본 비행 조작과 최종 전투 훈련을 마쳤습니다. 이제 실제 미션에 도전할 수 있습니다.':lesson.text;
 $('tutorialTask').textContent=S.tutorialFinished?'튜토리얼을 다시 진행하거나 홈 화면으로 돌아가 실제 게임을 시작하세요.':lesson.task;
 $('tutorialPrev').disabled=n===1;
 $('tutorialNext').textContent=S.tutorialFinished?'홈 화면으로':'다음 단계 →';
 if(!S.tutorialFinished&&n===8)$('tutorialNext').textContent='튜토리얼 완료';
 const ready=!lesson.requires||!!S.tutorialFlags[lesson.requires];
 $('tutorialNext').disabled=!S.tutorialFinished&&!ready;
}
function enterTutorialStage(n){
 S.tutorialStage=clamp(n,1,8);S.tutorialFinished=false;
 if(S.tutorialStage===8&&S.level!==11){setLevel(11);S.running=true;S.paused=false;}
 else if(S.tutorialStage<8&&S.level===11){setLevel(1);S.running=true;S.paused=false;}
 $('tutorialPanel').classList.remove('hidden');updateTutorialPanel();
}
function startTutorial(){
 S.tutorialMode=true;S.tutorialFlags={};S.tutorialFinished=false;S.tutorialStage=1;S.nick='훈련생';S.difficulty=S.difficulty||'normal';S.total=0;S.recorded=false;S.runTraces={};S.rate=1;S.running=true;S.paused=false;setLevel(1);
 $('startScreen').classList.add('hidden');$('rankScreen').classList.add('hidden');$('helpScreen').classList.add('hidden');$('statusText').textContent='FLIGHT TRAINING';$('tutorialPanel').classList.remove('hidden');
 document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('selected',b.dataset.speed==='1'));updateTutorialPanel();
}
$('tutorialStart').onclick=startTutorial;
$('tutorialPrev').onclick=()=>{if(S.tutorialStage>1)enterTutorialStage(S.tutorialStage-1);};
$('tutorialNext').onclick=()=>{if(S.tutorialFinished){home();return;}if(S.tutorialStage===8){S.tutorialFinished=true;S.running=false;S.paused=true;localStorage.setItem('spaceRescueTutorialComplete','1');updateTutorialPanel();return;}enterTutorialStage(S.tutorialStage+1);};
$('tutorialExit').onclick=()=>{if(S.tutorialMode&&confirm('튜토리얼을 종료하고 홈 화면으로 돌아갈까요?'))home();};

document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportRanks(b.dataset.export));$('importRanks').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let v=JSON.parse(await f.text());if(!Array.isArray(v))throw Error();let clean=v.filter(r=>r&&typeof r.nickname==='string'&&Number.isFinite(+r.level)&&Number.isFinite(+r.time));localStorage.setItem('spaceRescueRanks',JSON.stringify([...rankData(),...clean].sort((a,b)=>b.level-a.level||a.time-b.time).slice(0,500)));showRanks();alert('랭킹 백업을 가져왔습니다.');}catch(err){alert('올바른 랭킹 JSON 파일이 아닙니다.');}e.target.value='';};
$('marsWeapon').onclick=()=>fire('mars');$('beamWeapon').onclick=()=>fire('beam');
document.addEventListener('keydown',e=>{
 if(!S.running||S.paused||S.level!==11||e.repeat)return;
 const el=document.activeElement;if(el&&(el.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(el.tagName)))return;
 if(e.key==='1'){e.preventDefault();fire('mars');}
 else if(e.key==='2'){e.preventDefault();combatKeys.add('2');beamKeyDownAt=performance.now();beamRepeatClock=0;}
});
document.addEventListener('keyup',e=>{if(e.key==='2'){combatKeys.delete('2');beamKeyDownAt=0;beamRepeatClock=0;}});
addEventListener('blur',()=>{combatKeys.clear();beamKeyDownAt=0;beamRepeatClock=0;});$('orbitDistance').addEventListener('input',()=>{const nextFactor=+$('orbitDistance').value;$('orbitDistanceValue').textContent=nextFactor.toFixed(1)+'×';if(S.level===11&&S.planet&&S.ship){const dx=S.ship.x-S.planet.x,dy=S.ship.y-S.planet.y,r=Math.max(S.planet.r+S.ship.r+12,Math.hypot(dx,dy)),tangent=Math.atan2(dy,dx)+Math.PI/2,radial=(S.ship.vx*dx+S.ship.vy*dy)/r,desired=Math.sqrt(G*S.planet.mass/(S.planet.r*nextFactor));S.ship.vx=Math.cos(tangent)*desired+dx/r*radial;S.ship.vy=Math.sin(tangent)*desired+dy/r*radial;S.orbitFactor=nextFactor;}});
function infoAt(p){let b=S.bodies.find(o=>Math.hypot(o.x-p.x,o.y-p.y)<o.r+10);if(!b)return;$('infoName').textContent=b.name;let vals=[['종류',b.type],['질량(게임 단위)',b.mass.toLocaleString()],['반지름',b.r.toFixed(1)],['표면 중력',(G*b.mass/(b.r*b.r+SOFT)).toFixed(2)],['속도',Math.hypot(b.vx,b.vy).toFixed(2)],['공전 방향',b.dir>0?'반시계':'시계']];$('infoDetails').innerHTML=vals.map(v=>'<div class="info-line"><span>'+v[0]+'</span><b>'+safe(v[1])+'</b></div>').join('');$('infoCard').classList.remove('hidden');if(S.tutorialMode){S.tutorialFlags.inspect=true;updateTutorialPanel();}}
function point(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function screenToWorld(p){return{x:(p.x-W/2-camera.x)/camera.zoom+W/2,y:(p.y-H/2-camera.y)/camera.zoom+H/2};}
function zoomAt(p,factor){let before=screenToWorld(p);camera.zoom=clamp(camera.zoom*factor,.55,2.8);camera.x=p.x-W/2-(before.x-W/2)*camera.zoom;camera.y=p.y-H/2-(before.y-H/2)*camera.zoom;}
function updateZoomLabel(){zoomLabel.textContent=Math.round(camera.zoom*100)+'%';}
const mapTools=document.createElement('div');mapTools.className='map-tools';mapTools.innerHTML='<button type="button" aria-label="축소">−</button><span>100%</span><button type="button" aria-label="확대">+</button><button type="button" aria-label="지도 초기화">⌖</button>';document.getElementById('app').appendChild(mapTools);
const zoomLabel=mapTools.querySelector('span'),zoomButtons=mapTools.querySelectorAll('button');
zoomButtons[0].onclick=()=>{zoomAt({x:W/2,y:H/2},.85);updateZoomLabel();};zoomButtons[1].onclick=()=>{zoomAt({x:W/2,y:H/2},1.18);updateZoomLabel();};zoomButtons[2].onclick=()=>{camera.x=0;camera.y=0;camera.zoom=1;updateZoomLabel();};
canvas.addEventListener('contextmenu',e=>{e.preventDefault();infoAt(screenToWorld(point(e)));});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(point(e),e.deltaY<0?1.12:.89);updateZoomLabel();},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType!=='touch')return;const p=point(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);if(pointers.size===1){dragState={id:e.pointerId,start:p,last:p,moved:false,pointerType:e.pointerType};if(e.pointerType==='touch')holdTimer=setTimeout(()=>{if(dragState&&!dragState.moved&&pointers.size===1)infoAt(screenToWorld(p));},600);}else if(pointers.size===2){clearTimeout(holdTimer);const pts=[...pointers.values()];pinchState={distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),mid:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2}};dragState=null;}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e),prev=pointers.get(e.pointerId);pointers.set(e.pointerId,p);if(pointers.size>=2){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};if(pinchState){zoomAt(pinchState.mid,dist/Math.max(1,pinchState.distance));camera.x+=mid.x-pinchState.mid.x;camera.y+=mid.y-pinchState.mid.y;}pinchState={distance:dist,mid};updateZoomLabel();return;}if(dragState&&dragState.id===e.pointerId){if(Math.hypot(p.x-dragState.start.x,p.y-dragState.start.y)>6){dragState.moved=true;clearTimeout(holdTimer);}camera.x+=p.x-prev.x;camera.y+=p.y-prev.y;}});
function endPointer(e){pointers.delete(e.pointerId);clearTimeout(holdTimer);if(pointers.size<2)pinchState=null;if(pointers.size===0)dragState=null;}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);$('closeInfo').onclick=()=>$('infoCard').classList.add('hidden');
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.running){S.paused=true;$('pauseBtn').textContent='재개';}});
setLevel(1);
})();