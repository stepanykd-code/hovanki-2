const WORLD = {
  width: 800, height: 478, tileX: 21, tileY: 11, originX: 389, originY: 54
};
const HEROES = [
  { id: 'slavik', name: 'Славік', color: '#60b5ee', size: 38 },
  { id: 'dasha', name: 'Даша', color: '#ed729f', size: 35 },
  { id: 'katya', name: 'Катя', color: '#f2a5ac', size: 32 }
];
const ITEMS = {
  wardrobe: 'Шафа', bed: 'Ліжко', curtain: 'Штори', chest: 'Скриня',
  sofa: 'Диван', table: 'Стіл', plant: 'Великий вазон', shelf: 'Стелаж',
  basket: 'Кошик', bench: 'Лавка', bush: 'Кущ', playhouse: 'Будиночок',
  slide: 'Гірка', tire: 'Шини', barrel: 'Бочка', crates: 'Ящики',
  tent: 'Намет', hay: 'Копиця сіна', tree: 'Дерево'
};
const thing = (type, x, y, w = 1, d = 1, color = 'wood') =>
  ({ type, name: ITEMS[type], x, y, w, d, color, id: type + '-' + x + '-' + y });
const MAPS = {
  house: {
    title: 'Теплий дім', subtitle: 'Кімнати, штори та потаємні куточки', theme: 'house',
    w: 17, h: 15, spawn: { x: 8.5, y: 12.5 },
    walls: [[6,1,1,6],[6,9,1,1],[11,1,1,5],[11,8,1,2],
      [1,9,2,1],[4,9,2,1],[7,9,1,1],[10,9,1,1],[12,9,1,1],[15,9,1,1]],
    objects: [
      thing('wardrobe',1,1,2,1,'rose'), thing('curtain',4,1,1,1,'rose'),
      thing('bed',2,4,2,2,'rose'), thing('chest',1,7),
      thing('sofa',7,1,3,1,'mint'), thing('table',8,5,2,1),
      thing('plant',10,7), thing('curtain',13,1,2,1,'blue'),
      thing('shelf',15,3,1,2,'blue'), thing('basket',12,7),
      thing('bench',2,11,2,1), thing('wardrobe',13,11,2,1,'mint')
    ]
  },
  yard: {
    title: 'Наш майданчик', subtitle: 'Гірка, будиночок і знайомий двір', theme: 'yard',
    w: 18, h: 15, spawn: { x: 9.5, y: 12.5 }, walls: [],
    objects: [
      thing('playhouse',2,2,2,2,'rose'), thing('bush',6,1,2,1,'mint'),
      thing('bench',10,2,2,1), thing('crates',14,2,2,1),
      thing('slide',7,5,2,2,'blue'), thing('tire',3,7,1,1,'rose'),
      thing('bush',14,6,2,1,'mint'), thing('barrel',16,9),
      thing('tent',10,8,2,2,'rose'), thing('bench',3,11,2,1),
      thing('bush',1,10,1,2,'mint'), thing('basket',13,12),
      thing('crates',6,12,1,1), thing('bush',15,12,2,1,'mint')
    ]
  },
  garden: {
    title: 'Бабусин сад', subtitle: 'Яблуні, намет і маленький ставок', theme: 'garden',
    w: 18, h: 15, spawn: { x: 9.5, y: 12.5 },
    walls: [[7,5,4,3]],
    objects: [
      thing('bush',1,2,2,1,'mint'), thing('hay',5,1,2,1),
      thing('barrel',10,2), thing('tent',14,2,2,2,'blue'),
      thing('crates',3,5,1,1), thing('bush',14,6,2,1,'mint'),
      thing('table',2,9,2,1), thing('basket',5,10),
      thing('hay',10,9,2,1), thing('bench',14,10,2,1),
      thing('chest',2,12), thing('playhouse',6,12,2,1,'mint'),
      thing('bush',15,12,2,1,'mint')
    ]
  }
};
for (const map of Object.values(MAPS)) {
  map.blocked = new Set();
  for (let x = 0; x < map.w; x++) {
    map.blocked.add(x + ',0');
    map.blocked.add(x + ',' + (map.h - 1));
  }
  for (let y = 0; y < map.h; y++) {
    map.blocked.add('0,' + y);
    map.blocked.add((map.w - 1) + ',' + y);
  }
  for (const [x,y,w,h] of [...map.walls, ...map.objects.map(o => [o.x,o.y,o.w,o.d])]) {
    for (let dx=0; dx<w; dx++) for (let dy=0; dy<h; dy++) map.blocked.add((x+dx) + ',' + (y+dy));
  }
}
function project(x, y, z = 0) {
  return { x: WORLD.originX + (x-y)*WORLD.tileX, y: WORLD.originY + (x+y)*WORLD.tileY-z };
}
function unproject(x,y) {
  const a = (x-WORLD.originX)/WORLD.tileX;
  const b = (y-WORLD.originY)/WORLD.tileY;
  return {x:(a+b)/2,y:(b-a)/2};
}
function gapTo(actor, item) {
  return Math.hypot(Math.max(item.x-actor.x,0,actor.x-item.x-item.w),
    Math.max(item.y-actor.y,0,actor.y-item.y-item.d));
}
function dist(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
function mix(values) {
  const result = [...values];
  for (let i=result.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
function passable(map,x,y,r=.2) {
  if (x<1+r || y<1+r || x>map.w-1-r || y>map.h-1-r) return false;
  return [[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]].every(([a,b]) =>
    !map.blocked.has(Math.floor(a)+','+Math.floor(b)));
}
function route(map, actor, destination, object = null) {
  const start = Math.floor(actor.x)+','+Math.floor(actor.y);
  const queue = [start];
  const parents = new Map([[start,null]]);
  for (let i=0;i<queue.length;i++) {
    const key=queue[i];
    const [x,y]=key.split(',').map(Number);
    const p={x:x+.5,y:y+.5};
    if (object ? gapTo(p,object)<.8 : x===Math.floor(destination.x)&&y===Math.floor(destination.y)) {
      const result=[];
      for(let k=key;k!==null;k=parents.get(k)) {
        const [cx,cy]=k.split(',').map(Number);
        result.unshift({x:cx+.5,y:cy+.5});
      }
      return result;
    }
    for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      const next=nx+','+ny;
      if (parents.has(next)||!passable(map,nx+.5,ny+.5)) continue;
      parents.set(next,key);
      queue.push(next);
    }
  }
  return [];
}
function walk(actor, distance) {
  actor.moving=false;
  while(actor.path.length && distance>0) {
    const p=actor.path[0], gap=dist(actor,p);
    if(gap<.001) {actor.path.shift();continue;}
    const amount=Math.min(gap,distance);
    const dx=(p.x-actor.x)*amount/gap, dy=(p.y-actor.y)*amount/gap;
    actor.x+=dx;actor.y+=dy;distance-=amount;
    actor.moving=true;actor.stride+=amount;
    actor.face=dx+dy<-.05?'back':'front';
    actor.flip=dx-dy<0;
    if(gap<=amount+.001) actor.path.shift();
  }
}
class Round {
  constructor(mapId,heroId,role,event=()=>{}) {
    this.mapId=mapId;this.map=MAPS[mapId];this.role=role;this.event=event;
    this.actors=HEROES.map((hero,i)=>({
      hero,x:this.map.spawn.x+(i-1)*.8,y:this.map.spawn.y,
      path:[],face:'front',flip:false,stride:0,moving:false,
      hidden:null,found:false,noise:0,target:null
    }));
    this.player=this.actors.find(a=>a.hero.id===heroId);
    this.seeker=role==='seek'?this.player:mix(this.actors.filter(a=>a!==this.player))[0];
    this.hiders=this.actors.filter(a=>a!==this.seeker);
    this.phase='ready';this.time=role==='seek'?60:42;
    this.checked=new Set();this.visited=new Set();this.action=null;this.cooldown=0;
    this.ping=null;this.exposure=0;this.destination=null;
  }
  get active() {return this.phase==='prepare'||this.phase==='hunt';}
  get found() {return this.hiders.filter(a=>a.found).length;}
  start() {
    this.phase='prepare';this.time=this.role==='hide'?12:3;
    const spots=mix(this.map.objects.filter(o=>gapTo(this.map.spawn,o)>3));
    for(const actor of this.hiders) {
      if(actor===this.player) continue;
      const item=spots.pop();
      if(this.role==='seek') actor.hidden=item;
      else {actor.target=item;actor.path=route(this.map,actor,null,item);}
    }
    this.event('start');
  }
  nearby() {
    if(this.player.hidden) return this.player.hidden;
    return this.map.objects.filter(o=>gapTo(this.player,o)<=.9)
      .sort((a,b)=>gapTo(this.player,a)-gapTo(this.player,b))[0]||null;
  }
  go(point,item=null) {
    if(!this.active||this.player.hidden||this.action||(this.phase==='prepare'&&this.role==='seek')) return;
    const path=route(this.map,this.player,point,item);
    if(!path.length) return;
    this.player.path=path;
    this.destination=item;
  }
  interact(item=this.nearby()) {
    if(!this.active||this.action||(this.phase==='prepare'&&this.role==='seek')) return;
    this.player.path=[];this.destination=null;
    if(this.player.hidden) {
      this.lastHide=this.player.hidden;this.player.hidden=null;this.player.noise=0;
      this.event('note','Ти вийшов зі схованки');return;
    }
    if(!item||gapTo(this.player,item)>.95) {
      this.event('note','Підійди до предмета зі світлою позначкою');return;
    }
    if(this.role==='hide') {
      if(this.hiders.some(a=>a!==this.player&&(a.hidden===item||a.target===item))) {
        this.event('note','Тут уже ховається друг');return;
      }
      this.player.hidden=item;this.player.noise=0;
      this.event('hide',item.name+' · тебе не видно');
    } else {
      if(this.checked.has(item)) {this.event('note','Тут уже перевірено');return;}
      this.action={item,time:.65,total:.65};
    }
  }
  reveal(actor,item) {
    actor.hidden=null;actor.found=true;actor.path=[];
    if(item) {
      const stand=route(this.map,this.seeker,null,item).at(-1);
      if(stand){actor.x=stand.x;actor.y=stand.y;}
    }
    if(this.ping?.item===item) this.ping=null;
    this.event('found',actor===this.player?'Тебе знайшли!':'Знайдено · '+actor.hero.name);
  }
  finish(win) {
    this.phase='result';this.win=win;this.action=null;
    this.actors.forEach(a=>{a.path=[];a.moving=false;});
    this.event(win?'win':'lose');
  }
  ability() {
    if(this.phase!=='hunt'||this.cooldown>0) return;
    this.cooldown=12;
    if(this.role==='seek') {
      const actor=mix(this.hiders.filter(a=>!a.found))[0];
      this.ping={item:actor.hidden,time:3};
      this.event('ping','Прислухайся… он звідки шурхіт!');
    } else {
      const empty=this.map.objects.filter(o=>!this.hiders.some(a=>a.hidden===o));
      const item=empty.includes(this.lastHide)?this.lastHide:mix(empty)[0];
      this.seeker.target=item;this.seeker.path=route(this.map,this.seeker,null,item);
      this.inspect=2;
      this.event('ping','Камінчик відволік шукача');
    }
  }
  move(dx,dy,dt) {
    const a=this.player;
    a.moving=false;
    if(a.hidden||this.action||(this.phase==='prepare'&&this.role==='seek')) return;
    if(!dx&&!dy) {
      walk(a,3.5*dt);
      if(!a.path.length&&this.destination) this.interact(this.destination);
      return;
    }
    a.path=[];this.destination=null;
    const wx=dx+dy, wy=dy-dx, length=Math.hypot(wx,wy);
    const old={x:a.x,y:a.y};
    const step=3.5*dt/length;
    if(passable(this.map,a.x+wx*step,a.y)) a.x+=wx*step;
    if(passable(this.map,a.x,a.y+wy*step)) a.y+=wy*step;
    a.moving=dist(a,old)>.001;a.stride+=dist(a,old);
    a.face=dy<0?'back':dy>0?'front':a.face;a.flip=dx<0;
  }
  seekAI(dt) {
    const s=this.seeker;
    if(!s.target) {
      let options=mix(this.map.objects.filter(o=>!this.visited.has(o)));
      if(!options.length){this.visited.clear();options=mix(this.map.objects);}
      s.target=options.slice(0,2).sort((a,b)=>gapTo(s,a)-gapTo(s,b))[0];
      s.path=route(this.map,s,null,s.target);
      this.inspect=1.8;
    }
    walk(s,2.6*dt);
    if(!s.path.length) {
      this.inspect-=dt;
      if(this.inspect<=0) {
        const item=s.target;
        this.visited.add(item);s.target=null;
        const actor=this.hiders.find(a=>a.hidden===item);
        if(actor){this.reveal(actor,item);if(actor===this.player){this.finish(false);return;}}
      }
    }
    const p=this.player;
    const clear=[.2,.4,.6,.8].every(t=>passable(this.map,p.x+(s.x-p.x)*t,p.y+(s.y-p.y)*t,0));
    this.exposure=!p.hidden&&dist(p,s)<2.3&&clear?this.exposure+dt:0;
    if(this.exposure>.8){this.reveal(p);this.finish(false);}
  }
  step(dt,dx=0,dy=0) {
    if(!this.active) return;
    this.time=Math.max(0,this.time-dt);
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.ping){this.ping.time-=dt;if(this.ping.time<=0)this.ping=null;}
    this.move(dx,dy,dt);
    if(this.phase==='prepare') {
      for(const a of this.hiders) {
        if(!a.target) continue;
        walk(a,3.6*dt);
        if(!a.path.length){a.hidden=a.target;a.target=null;}
      }
      if(this.time===0){this.phase='hunt';this.time=this.role==='seek'?60:42;this.event('hunt');}
      return;
    }
    if(this.action) {
      this.action.time-=dt;
      if(this.action.time<=0) {
        const item=this.action.item;this.action=null;this.checked.add(item);
        const actor=this.hiders.find(a=>a.hidden===item);
        if(actor){this.reveal(actor,item);if(this.found===2){this.finish(true);return;}}
        else this.event('empty',item.name+' · порожньо');
      }
    }
    if(this.role==='hide') {
      for(const a of this.hiders) {
        if(!a.hidden) continue;
        a.noise+=dt;
        if(a.noise>=18) {
          a.noise=0;
          if(a===this.player)this.event('noise','Ой, зашурхотіло! Зміни схованку або відволіч шукача.');
          this.seeker.target=a.hidden;this.seeker.path=route(this.map,this.seeker,null,a.hidden);this.inspect=1.8;
        }
      }
      this.seekAI(dt);
    }
    if(this.active&&this.time===0)this.finish(this.role==='hide');
  }
}
