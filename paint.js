const PALETTES = {
  wood: ['#dfb079','#b67e51','#8b5c42','#f4d298'],
  rose: ['#efabac','#c9798f','#9c536e','#ffcec3'],
  blue: ['#9bbfca','#628caa','#4a6788','#c4dfe0'],
  mint: ['#adc48b','#759667','#527953','#d3dfa4'],
  gold: ['#efce85','#c69c58','#9e754a','#ffe7ad'],
  dark: ['#716e7c','#555463','#3f4153','#a2a0a3']
};
const roundPoint = p => [Math.round(p.x),Math.round(p.y)];
const ITEM_HEIGHT = {
  wardrobe:35,bed:25,curtain:39,chest:18,sofa:25,table:25,plant:34,shelf:36,
  basket:16,bench:14,bush:16,playhouse:44,slide:30,tire:13,barrel:22,crates:30,tent:33,hay:23
};
function insidePolygon(point,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
class Painter {
  constructor(ctx) {this.ctx=ctx;}
  rect(color,x,y,w,h) {
    this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  poly(color,points,stroke) {
    const c=this.ctx;c.beginPath();
    points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));
    c.closePath();c.fillStyle=color;c.fill();
    if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
  }
  tile(x,y,w,d,z,color,stroke) {
    this.poly(color,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map(([a,b])=>roundPoint(project(a,b,z))),stroke);
  }
  box(x,y,w,d,h,palette,z=0) {
    const p=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map(([a,b])=>project(a,b,z));
    const top=p.map(a=>({x:a.x,y:a.y-h}));
    this.poly(palette[1],[top[3],top[2],p[2],p[3]].map(roundPoint));
    this.poly(palette[2],[top[1],top[2],p[2],p[1]].map(roundPoint));
    this.poly(palette[0],top.map(roundPoint),palette[3]+'88');
    return {p,top};
  }
  text(text,x,y,color='#344c40',size=10,align='center') {
    const c=this.ctx;c.font=`600 ${size}px "Segoe UI", sans-serif`;c.textAlign=align;
    c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));
  }
}
function colorNoise(x,y) {return Math.abs(Math.sin(x*127.1+y*311.7)*43758.5453)%1;}
function foliage(p,x,y,size=1,apples=false) {
  const pos=project(x,y);
  p.box(x-.1,y-.1,.23,.23,22,PALETTES.wood);
  const cx=pos.x, cy=pos.y-28*size;
  const blocks=[[-15,-8,29,23],[-20,-3,39,12],[-10,-14,19,10],[-12,13,24,5]];
  for(const [a,b,w,h] of blocks) p.rect('#45684e',cx+a*size,cy+b*size,w*size,h*size);
  p.rect('#7b9b61',cx-13*size,cy-8*size,27*size,14*size);
  p.rect('#99b775',cx-7*size,cy-12*size,15*size,8*size);
  p.rect('#8bac68',cx-17*size,cy-2*size,12*size,10*size);
  p.rect('#668753',cx+6*size,cy+4*size,10*size,9*size);
  p.rect('#b2c687',cx-7*size,cy-9*size,8*size,3*size);
  if(apples)for(const [a,b] of [[-11,1],[5,-5],[10,6]]) {
    p.rect('#c46f62',cx+a*size,cy+b*size,4,4);
    p.rect('#f4a87a',cx+a*size,cy+b*size,2,2);
  }
}
function flower(p,x,y,color) {
  const q=project(x,y);
  p.rect('#66885b',q.x,q.y-3,1,4);
  p.rect(color,q.x-1,q.y-5,3,3);
  p.rect('#f7dfa7',q.x,q.y-4,1,1);
}
function background(map) {
  const canvas=document.createElement('canvas');canvas.width=WORLD.width;canvas.height=WORLD.height;
  const p=new Painter(canvas.getContext('2d'));
  p.rect('#d6dfc8',0,0,800,478);
  for(let i=0;i<65;i++){
    const x=colorNoise(i,3)*800,y=colorNoise(3,i)*478;
    p.rect('#c5d2b7',x,y,2,2);
    if(i%7===0)p.rect('#e6e9d6',x-8,y-1,18,2);
  }
  p.tile(.4,.5,map.w+.1,map.h+.1,-13,'#667f6a33');
  p.box(0,0,map.w,map.h,10,['#aac287','#83976a','#738662','#c9d9a6'],-2);
  const house=map.theme==='house';
  for(let x=0;x<map.w;x++)for(let y=0;y<map.h;y++){
    const n=colorNoise(x,y);
    let color=n>.5?'#abc58a':'#a6c184';
    if(house){
      const room=x<6?['#d9af91','#ddb89a']:x<11?['#dec69e','#e4cca5']:['#b8c3b2','#bec8b9'];
      color=room[n>.5?0:1];
      if(y>=10)color=n>.5?'#d8b994':'#e2c49e';
    } else {
      const path=map.theme==='yard'?(y>=10&&y<=12)||(x>=8&&x<=10):(x>=11&&x<=12)||(y>=10&&y<=11);
      if(path) color=n>.5?'#ddc69c':'#e2cda6';
    }
    p.tile(x,y,1,1,0,color,house?'#896b5d22':'#b8ce9733');
    if(house){
      p.tile(x+.06,y+.45,.86,.03,0,'#fff4cd2c');
    } else if(n>.65) {
      const point=project(x+.5,y+.5);
      p.rect(color==='#abc58a'?'#81a363':'#a1b77f',point.x,point.y,3,1);
      p.rect('#8eaa6e',point.x+2,point.y-2,1,2);
    }
  }
  if(house) {
    for(const [x,y,w,d,c] of [[1.6,3.5,3,3,PALETTES.rose],[7.3,3.3,3,3,PALETTES.mint],[12.5,4,3,3,PALETTES.blue]]) {
      p.tile(x,y,w,d,1,c[1]);p.tile(x+.15,y+.15,w-.3,d-.3,1,c[0]);
      p.tile(x+.32,y+.32,w-.64,d-.64,1,c[1]);
      p.tile(x+w/2-.24,y+d/2-.24,.48,.48,1,c[3]);
    }
    p.box(0,0,map.w,.23,35,['#f2d9b2','#d5b698','#c19c84','#fff0d1']);
    p.box(0,0,.23,map.h,35,['#f2d9b2','#d5b698','#c19c84','#fff0d1']);
    for(const x of [3,8,14]){
      p.box(x,.1,1.25,.2,18,PALETTES.wood,9);
      p.box(x+.1,.12,1.03,.21,14,PALETTES.blue,11);
      p.box(x+.55,.12,.08,.23,14,PALETTES.wood,11);
    }
    for(const y of [3,7,11]) {
      p.box(.12,y,.2,1.2,18,PALETTES.wood,9);
      p.box(.13,y+.1,.21,1,14,PALETTES.blue,11);
    }
    for(const [x,y,w,h] of map.walls) {
      p.box(x,y,w,h,12,['#e9c99f','#bd997d','#a4826a','#fae2bf']);
    }
  } else {
    const fence=['#e1c99d','#b39d78','#9b8466','#f6dfb2'];
    for(let x=.2;x<map.w;x+=1.1)p.box(x,.25,.15,.15,15,fence);
    for(let y=1.2;y<map.h;y+=1.1)p.box(.25,y,.15,.15,15,fence);
    p.box(.25,.25,map.w-.5,.08,3,fence,8);
    p.box(.25,.25,.08,map.h-.5,3,fence,8);
    for(let i=0;i<65;i++) {
      const x=1+colorNoise(i,17)*(map.w-2), y=1+colorNoise(i,29)*(map.h-2);
      if(!passable(map,x,y)||y>10||x>7&&x<11)continue;
      flower(p,x,y,i%2?'#f3c6bd':'#f8e1a0');
    }
    if(map.theme==='garden'){
      p.tile(6.75,4.75,4.5,3.5,1,'#b5ab80');
      p.tile(7,5,4,3,2,'#7da6ac');
      p.tile(7.15,5.15,3.7,2.7,3,'#91bbc0');
      for(let i=0;i<10;i++){
        const pos=project(7.2+colorNoise(i,4)*3.3,5.3+colorNoise(i,9)*2.2,4);
        p.rect('#c1deda',pos.x,pos.y,8,1);
      }
      p.tile(7.4,6.4,.5,.35,4,'#73976c');
      p.tile(9.6,5.5,.5,.35,4,'#73976c');
    }
  }
  return canvas;
}
function drawItem(p,o) {
  const {x,y,w,d,type}=o, c=PALETTES[o.color]||PALETTES.wood;
  p.tile(x+.13,y+.15,w+.12,d+.1,1,'#414b3e22');
  const box=(a,b,ww,dd,h,col=c,z=0)=>p.box(x+a,y+b,ww,dd,h,col,z);
  switch(type){
    case 'wardrobe':
      box(0,0,w,d,35);
      for(let i=.1;i<w;i+=.9) {
        box(i,d-.02,.75,.06,25,[c[1],c[0],c[2],c[3]],4);
        box(i+.5,d+.03,.08,.04,3,PALETTES.gold,14);
      }
      break;
    case 'curtain':
      box(0,0,w,.23,37,PALETTES.blue);
      for(let i=0;i<w;i+=.32)box(i,.24,.2,.12,34,c);
      box(-.06,.1,w+.12,.16,2,PALETTES.wood,37);
      break;
    case 'bed':
      box(.05,.05,w-.1,d-.1,10,PALETTES.wood);
      box(.12,.12,w-.24,d-.24,6,['#f2e3c8','#d2c8b4','#b7b1a0','#fff1d9'],10);
      box(.05,.02,w-.1,.18,25,PALETTES.wood);
      box(.2,.3,w-.4,.45,3,['#fff1d9','#e1d0b9','#c7b79e','#ffffff'],16);
      box(.12,.94,w-.24,d-1.06,3,c,16);
      box(.13,1,w-.26,.12,1,[c[3],c[0],c[1],c[3]],19);
      break;
    case 'sofa':
      box(.02,.02,w-.04,d-.04,12);
      box(.02,.02,w-.04,.21,25);
      box(.02,.02,.26,d-.04,20);
      box(w-.28,.02,.26,d-.04,20);
      for(let i=.4;i<w-.5;i+=.75)box(i,.32,.65,.57,3,[c[0],c[1],c[2],c[3]],12);
      box(.4,.23,.5,.37,5,PALETTES.gold,16);
      break;
    case 'table':
    case 'bench':
      for(const [a,b] of [[.12,.12],[w-.25,.12],[.12,d-.25],[w-.25,d-.25]])box(a,b,.13,.13,type==='table'?17:10,PALETTES.wood);
      box(0,0,w,d,4,PALETTES.wood,type==='table'?17:10);
      if(type==='table'){
        box(.4,.2,.65,.5,1,PALETTES.rose,21);
        box(w-.5,.25,.18,.18,4,['#fff2cf','#dbb990','#bb9878','#ffffff'],21);
      }
      break;
    case 'chest':
    case 'crates':
      box(.06,.05,w-.12,d-.1,15);
      box(.03,.03,w-.06,d-.06,3,[c[3],c[0],c[1],c[3]],15);
      if(type==='chest')box(w/2-.1,d-.03,.2,.1,4,PALETTES.gold,8);
      else{
        box(.18,0,.14,d,1,PALETTES.wood,18);
        box(w-.32,0,.14,d,1,PALETTES.wood,18);
        if(w>1)box(.75,.2,.7,.6,12,PALETTES.gold,18);
      }
      break;
    case 'shelf':
      box(.02,.02,.25,d-.04,36);
      for(const z of [0,11,22,33]){
        box(0,0,w,d,3,c,z);
        if(z<33)for(let i=.12;i<d-.2;i+=.45)box(.3,i,.55,.28,7,PALETTES[(Math.floor(i*5)%2)?'rose':'gold'],z+3);
      }
      break;
    case 'plant':
      box(.2,.2,.6,.6,11,PALETTES.rose);
      foliage(p,x+.5,y+.5,.57);
      break;
    case 'bush':
      for(let i=.4;i<w;i+=.7)for(let j=.4;j<d;j+=.7){
        box(i-.34,j-.34,.68,.68,11,PALETTES.mint);
        box(i-.23,j-.23,.46,.46,5,['#bad08b','#91b06e','#72945b','#d6dfaa'],11);
        const q=project(x+i,y+j,18);p.rect('#f5d2a1',q.x,q.y,3,2);
      }
      break;
    case 'basket':
    case 'barrel':
      box(.16,.16,.68,.68,type==='barrel'?20:10,PALETTES.wood);
      box(.12,.12,.76,.76,2,PALETTES.dark,type==='barrel'?13:6);
      box(.14,.14,.72,.72,2,PALETTES.wood,type==='barrel'?20:10);
      if(type==='basket')box(.3,.3,.44,.44,4,PALETTES.rose,12);
      break;
    case 'playhouse':{
      box(.08,.08,w-.16,d-.16,25,c);
      box(.6,d-.12,.58,.09,18,PALETTES.dark,0);
      box(.14,d-.12,.32,.1,8,PALETTES.blue,11);
      const roof=[[x-.15,y-.15,25],[x+w+.15,y-.15,25],[x+w+.15,y+d+.15,25],[x-.15,y+d+.15,25]];
      const ridge1=project(x+w/2,y-.15,44), ridge2=project(x+w/2,y+d+.15,44);
      p.poly(c[2],[project(...roof[0]),ridge1,ridge2,project(...roof[3])].map(roundPoint));
      p.poly(c[1],[ridge1,project(...roof[1]),project(...roof[2]),ridge2].map(roundPoint),c[3]);
      break;
    }
    case 'slide':{
      box(.05,.05,.75,.65,28,PALETTES.rose);
      for(let i=0;i<5;i++)box(.03,.1+i*.28,.65,.12,2,PALETTES.gold,25-i*4);
      const a=project(x+.85,y+.1,30),b=project(x+1.4,y+.1,30),
        cc=project(x+1.4,y+1.9,2),dd=project(x+.85,y+1.9,2);
      p.poly('#4b7594',[a,b,cc,dd].map(roundPoint),'#d8e7d9');
      p.poly('#9fcdd2',[{x:a.x+2,y:a.y+1},{x:b.x-2,y:b.y+1},{x:cc.x-2,y:cc.y-1},{x:dd.x+2,y:dd.y-1}].map(roundPoint));
      break;
    }
    case 'tire':
      box(.1,.1,.8,.8,7,PALETTES.dark);
      box(.22,.22,.56,.56,5,PALETTES.dark,7);
      box(.4,.4,.22,.22,1,['#302e3d','#302e3d','#302e3d','#302e3d'],12);
      break;
    case 'tent':{
      const a=project(x,y+d),b=project(x+w,y+d),top=project(x+w/2,y+d,33),rear=project(x+w/2,y,33),last=project(x+w,y);
      p.poly(c[2],[a,top,b].map(roundPoint));
      p.poly(c[0],[top,rear,last,b].map(roundPoint),c[3]);
      const door=project(x+w*.55,y+d,26);
      p.poly('#5a5861',[door,{x:a.x+6,y:a.y-1},{x:b.x-6,y:b.y-1}].map(roundPoint));
      break;
    }
    case 'hay':
      box(.05,.1,w-.1,d-.2,15,PALETTES.gold);
      box(.2,.18,w-.4,d-.36,7,PALETTES.gold,15);
      for(let i=.2;i<w-.1;i+=.3)box(i,.2,.05,d-.4,1,PALETTES.wood,22);
      break;
  }
}
function marker(p,x,y,color,size=4) {
  p.poly('#3c443c',[[x,y-size-1],[x+size+1,y],[x,y+size+1],[x-size-1,y]]);
  p.poly(color,[[x,y-size],[x+size,y],[x,y+size],[x-size,y]]);
  p.rect('#fff7de',x-1,y-2,2,2);
}
function actorArt(p,actor,images,highlight,now) {
  const q=project(actor.x,actor.y);
  const c=p.ctx;
  p.tile(actor.x-.25,actor.y-.25,.5,.5,1,'#34443a40');
  const image=images[actor.hero.id][actor.face];
  const h=actor.hero.size, w=Math.round(image.width/image.height*h);
  const bounce=actor.moving?Math.round(Math.sin(actor.stride*16)):0;
  c.save();c.translate(Math.round(q.x),Math.round(q.y));
  if(actor.flip)c.scale(-1,1);
  if(image.complete&&image.naturalWidth) {
    const legShift=actor.moving?Math.round(Math.sin(actor.stride*16)*1.5):0;
    c.drawImage(image,0,0,image.width,54,-Math.floor(w/2),-h+bounce,w,Math.round(h*.75));
    c.drawImage(image,0,53,image.width,19,-Math.floor(w/2)+legShift,-Math.round(h*.25)+bounce,w,Math.round(h*.25));
  }
  c.restore();
  if(highlight) {
    const y=q.y-h-9+Math.sin(now/230)*1.5;
    p.poly('#fcf4d7',[[q.x-4,y-2],[q.x+4,y-2],[q.x,y+3]]);
    p.rect('#5a514f',q.x-3,y-3,6,1);
  }
  if(actor.found) {
    p.text('✓',q.x,q.y-h-6,'#fff2b3',12);
  }
}
class Scene {
  constructor(canvas,images) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    this.p=new Painter(this.ctx);this.images=images;this.bases={};
    this.hitboxes=[];
  }
  render(round,now,hover=null) {
    const {map}=round,p=this.p,c=this.ctx;
    this.bases[round.mapId] ||= background(map);
    c.imageSmoothingEnabled=false;c.drawImage(this.bases[round.mapId],0,0);
    const entries=map.objects.map(item=>({depth:item.x+item.y+(item.w+item.d)/2,item}));
    for(const actor of round.actors)if(!actor.hidden)entries.push({depth:actor.x+actor.y,actor});
    for(const [x,y,s] of [[-1,3,.9],[3,-1,1.1],[map.w-2,-.5,.85],[-.5,map.h-2,1.05]]) {
      if(map.theme!=='house')entries.push({depth:x+y,tree:[x,y,s]});
    }
    entries.sort((a,b)=>a.depth-b.depth);
    this.hitboxes=[];
    const near=round.active?round.nearby():null;
    for(const e of entries) {
      if(e.tree){foliage(p,...e.tree,map.theme==='garden');continue;}
      if(e.actor){actorArt(p,e.actor,this.images,e.actor===round.player,now);continue;}
      const o=e.item,q=project(o.x+o.w/2,o.y+o.d/2);
      if((o===near||o===hover)&&round.active)p.tile(o.x-.1,o.y-.1,o.w+.2,o.d+.2,1,'#fff7d4aa','#fff5cd');
      drawItem(p,o);
      const front=project(o.x+o.w/2+.2,o.y+o.d+.15);
      const height=ITEM_HEIGHT[o.type];
      const polygon=[
        [o.x,o.y,height],[o.x+o.w,o.y,height],[o.x+o.w,o.y,0],
        [o.x+o.w,o.y+o.d,0],[o.x,o.y+o.d,0],[o.x,o.y+o.d,height]
      ].map(([x,y,z])=>project(x,y,z));
      this.hitboxes.push({item:o,polygon,marker:front});
      if(round.checked.has(o))p.text('✓',front.x,front.y+2,'#49664e',10);
      else marker(p,front.x,front.y,'#f9e6b0',2);
      if(round.player.hidden===o) {
        marker(p,q.x,q.y-35+Math.sin(now/250)*2,round.player.hero.color);
        p.text('ТИ',q.x,q.y-43,'#3b4e41',8);
      }
      if(round.ping?.item===o){
        const y=q.y-47+Math.sin(now/100)*2;
        p.rect('#fff8dc',q.x-9,y-12,18,17);
        p.rect('#d4b880',q.x-9,y+5,18,2);
        p.text('!',q.x,y+1,'#c77955',13);
      }
      if(round.action?.item===o){
        p.rect('#544f51',q.x-13,q.y-38,26,5);
        p.rect('#ffe1a3',q.x-12,q.y-37,24*(1-round.action.time/round.action.total),3);
      }
    }
    if(round.phase==='prepare'&&round.role==='hide'){
      const pos=project(round.seeker.x,round.seeker.y,round.seeker.hero.size+5);
      p.text('…',pos.x,pos.y,'#3d5a54',16);
    }
    if(round.exposure>0){
      const pos=project(round.player.x,round.player.y,round.player.hero.size+7);
      p.text('!',pos.x,pos.y,'#b84b4b',16);
    }
    const close=map.theme==='house';
    const edge=close?['#e3c19b','#b49b7e','#9c846d','#f8d9ac']:['#9cb57c','#849c69','#69855d','#c2d598'];
    p.box(map.w-.12,0,.12,map.h,close?6:3,edge);
    p.box(0,map.h-.12,map.w,.12,close?6:3,edge);
  }
  hit(point) {
    const marker=this.hitboxes.find(b=>dist(point,b.marker)<8);
    if(marker)return marker.item;
    return [...this.hitboxes].reverse().find(b=>insidePolygon(point,b.polygon))?.item||null;
  }
}
