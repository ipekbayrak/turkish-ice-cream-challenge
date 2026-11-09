import { CULTURAL_DETAILS, CULTURAL_SOURCES, detailsForVenue, getCulturalDetail } from './cultural-details.js';
import { getVenueForStage } from './venues.js';
import { DiscoveryProgress } from './discovery-progress.js';

const copy = {
  tr: { explore:'Etrafa bak', close:'Tezgâha dön', shelves:['Sol raf','Sağ raf','Üst raf'], hint:'Bir eşyaya dokun. Hikâyesini keşfet.', shelf:'Rafa bırak', fact:'Eşyanın hikâyesi', memory:'Ustanın hatırası · kurgu', source:'Kaynak', found:'Keşfedildi', fresh:'Yeni ayrıntı', locked:'Bu hatıra, ustayla biraz daha ilerleyince açılır.', detail:'ayrıntı' },
  en: { explore:'Look around', close:'Back to the cart', shelves:['Left shelf','Right shelf','Upper shelf'], hint:'Touch an object to discover its story.', shelf:'Back to the shelf', fact:'About this object', memory:'The vendor’s memory · fiction', source:'Source', found:'Discovered', fresh:'New detail', locked:'This memory opens as you progress with the vendor.', detail:'details' },
};
const $ = id => document.getElementById(id);

/** An opt-in view of physical objects, between rounds; never a gameplay overlay. */
export class DiscoveryUI {
  constructor({ world, save, sound, getStage, canOpen, onEnter, onExit, onInspect, getMemory, storage }) {
    Object.assign(this, { world, save, sound, getStage, canOpen, onEnter, onExit, onInspect, getMemory });
    this.progress = new DiscoveryProgress(CULTURAL_DETAILS, storage);
    this.active = false;
    this.section = 0;
    this.selected = null;
    this.buttons = new Map();
    this.pointer = null;
    $('btn-discover').addEventListener('click', () => this.open());
    $('discovery-exit').addEventListener('click', () => this.exit());
    $('discovery-previous').addEventListener('click', () => this.changeSection(-1));
    $('discovery-next').addEventListener('click', () => this.changeSection(1));
    $('discovery-back').addEventListener('click', () => this.clearFocus());
    window.addEventListener('keydown', event => {
      if (!this.active) return;
      if (event.key === 'Escape') { event.preventDefault(); this.selected ? this.clearFocus() : this.exit(); }
      if (this.selected && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
        event.preventDefault(); this.cancelPointer();
        const dx=event.key==='ArrowLeft'?-22:event.key==='ArrowRight'?22:0;
        const dy=event.key==='ArrowUp'?-22:event.key==='ArrowDown'?22:0;
        this.world.culturalScene?.beginRotation('keyboard');
        this.world.culturalScene?.rotateBy(dx,dy,.08,'keyboard');
        this.world.culturalScene?.endRotation('keyboard',true);
        return;
      }
      if (!this.selected && event.key === 'ArrowLeft') this.changeSection(-1);
      if (!this.selected && event.key === 'ArrowRight') this.changeSection(1);
    });
    window.addEventListener('blur',()=>this.cancelPointer());
    window.addEventListener('resize',()=>this.cancelPointer());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancelPointer();});
    this.refresh();
  }
  get language() { return this.save.lang === 'tr' ? 'tr' : 'en'; }
  get labels() { return copy[this.language]; }
  refresh() {
    const labels = this.labels;
    $('discovery-home-label').textContent = labels.explore;
    if ($('discovery-home-count')) { $('discovery-home-count').textContent = ''; $('discovery-home-count').hidden = true; }
    if (!this.active) return;
    $('discovery-ui').setAttribute('aria-label', labels.explore);
    $('discovery-place').textContent = this.venue.name[this.language];
    $('discovery-section').textContent = labels.shelves[this.section];
    $('discovery-exit').setAttribute('aria-label', labels.close);
    $('discovery-previous').setAttribute('aria-label', labels.shelves[(this.section + 2) % 3]);
    $('discovery-next').setAttribute('aria-label', labels.shelves[(this.section + 1) % 3]);
    $('discovery-back').textContent = labels.shelf;
    $('discovery-hint').textContent = labels.hint;
    if ($('discovery-progress')) { $('discovery-progress').textContent = ''; $('discovery-progress').hidden = true; }
    this.world.setDiscovered?.(this.progress.ids);
  }
  open() {
    if (this.active || !this.canOpen()) return;
    this.venue = getVenueForStage(this.getStage());
    this.active = true; this.section = 0; this.selected = null;
    this.onEnter();
    document.body.classList.remove('discovery-focused');
    document.body.classList.add('exploring');
    $('discovery-ui').hidden = false;
    $('discovery-card').hidden = true;
    $('discovery-hint').hidden = false;
    this.world.setExplorationMode?.(true);
    this.world.setExplorationSection?.(0);
    this.refresh();
    this.createHotspots();
    $('discovery-exit').focus({ preventScroll: true });
  }
  openItem(id){
    const detail=getCulturalDetail(id);
    if(!detail||!this.progress.canInspect(id,getVenueForStage(this.getStage()).id,this.save.data.unlockedStage))return false;
    this.open();if(!this.active)return false;
    this.section=detail.section??0;
    this.world.setExplorationSection?.(this.section);this.createHotspots();this.refresh();this.inspect(id);
    return this.selected===id;
  }
  exit(immediate = false) {
    if (!this.active) { if (immediate) this.world.resetExploration?.(); return; }
    this.cancelPointer();
    this.active = false; this.selected = null;
    this.world.clearDiscoveryFocus?.();
    this.world.setExplorationMode?.(false);
    if (immediate) this.world.resetExploration?.();
    $('discovery-ui').hidden = true;
    document.body.classList.remove('exploring', 'discovery-focused');
    this.clearHotspots();
    this.onExit();
    this.refresh();
    if (!immediate) ($('btn-options') || $('btn-lang') || $('btn-discover')).focus({ preventScroll: true });
  }
  changeSection(delta) {
    this.clearFocus();
    this.section = (this.section + delta + 3) % 3;
    this.world.setExplorationSection?.(this.section);
    this.createHotspots(); this.refresh();
  }
  clearHotspots() {
    this.buttons.clear(); $('discovery-hotspots').replaceChildren();
  }
  createHotspots() {
    this.clearHotspots();
    for (const [index, item] of detailsForVenue(this.venue.id).entries()) {
      if ((item.section ?? Math.floor(index / 6)) !== this.section) continue;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'discovery-hotspot'; button.dataset.detailId = item.id;
      button.setAttribute('aria-label', item.name[this.language]); button.title = item.name[this.language];
      button.innerHTML = '<span aria-hidden="true"></span>';
      button.addEventListener('click', () => this.inspect(item.id));
      $('discovery-hotspots').append(button); this.buttons.set(item.id, button);
    }
  }
  pointerDown(event) {
    if (!this.active || this.pointer || event.button !== 0 || event.isPrimary === false || event.target?.closest?.('button,a,input,dialog,.discovery-card')) return false;
    const target=event.currentTarget || event.target;
    this.pointer={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,time:event.timeStamp||0,moved:false,target,rotatable:Boolean(this.selected)};
    if(this.selected)this.world.culturalScene?.beginRotation(event.pointerId);
    try{target?.setPointerCapture?.(event.pointerId);}catch{}
    event.preventDefault?.();
    return true;
  }
  pointerMove(event) {
    const p=this.pointer;if(!this.active||!p||p.id!==event.pointerId)return false;
    const dx=event.clientX-p.x,dy=event.clientY-p.y;
    if(Math.hypot(event.clientX-p.startX,event.clientY-p.startY)>5)p.moved=true;
    if(p.moved&&p.rotatable){
      this.world.culturalScene?.rotateBy(dx,dy,Math.max(.008,((event.timeStamp||p.time+16)-p.time)/1000),p.id);
      document.body.classList.add('discovery-dragging');
    }
    p.x=event.clientX;p.y=event.clientY;p.time=event.timeStamp||p.time+16;
    event.preventDefault?.();return true;
  }
  pointerUp(event) {
    const p=this.pointer;if(!p||p.id!==event.pointerId)return false;
    this.finishPointer(false);
    if(!p.moved)this.point(event.clientX,event.clientY);
    event.preventDefault?.();return true;
  }
  pointerCancel(event = null) {
    if(event&&this.pointer&&event.pointerId!==this.pointer.id)return false;
    this.cancelPointer();return true;
  }
  finishPointer(canceled) {
    const p=this.pointer;this.pointer=null;
    this.world.culturalScene?.endRotation(p?.id??null,canceled);
    document.body.classList.remove('discovery-dragging');
    try{if(p?.target?.hasPointerCapture?.(p.id))p.target.releasePointerCapture(p.id);}catch{}
  }
  cancelPointer(){this.finishPointer(true);}
  point(clientX, clientY) {
    if (!this.active) return;
    const item = this.world.pickCulturalDetail?.(clientX / innerWidth, clientY / innerHeight);
    if (item && item.id !== this.selected) this.inspect(item.id);
    else if (item) return;
    else if (this.selected) this.clearFocus();
  }
  inspect(id) {
    this.cancelPointer();
    const detail = getCulturalDetail(id);
    if (!this.active || !detail || !this.progress.canInspect(id, this.venue.id, this.save.data.unlockedStage)) {
      $('discovery-hint').textContent = this.labels.locked; return;
    }
    this.selected = id;
    document.body.classList.add('discovery-focused');
    const fresh = this.progress.discover(id, this.venue.id, this.save.data.unlockedStage);
    this.onInspect?.({id,venueId:this.venue.id,fresh});
    this.world.focusDiscovery?.(id);
    this.sound.playBoop?.(0);
    if (fresh && this.save.hapticsEnabled) navigator.vibrate?.(15);
    $('discovery-card').hidden = false;
    $('discovery-hint').hidden = true;
    $('discovery-name').textContent = detail.name[this.language];
    $('discovery-status').textContent = fresh ? this.labels.fresh : this.labels.found;
    $('discovery-fact-label').textContent = this.labels.fact;
    $('discovery-fact').textContent = detail.detail[this.language];
    $('discovery-memory-label').textContent = this.labels.memory;
    $('discovery-memory').textContent = this.getMemory?.(id,this.venue.id) || detail.narrative[this.language];
    $('discovery-sources').replaceChildren();
    for (const sourceId of detail.sourceIds || []) {
      const source = CULTURAL_SOURCES[sourceId]; if (!source || !source.url.startsWith('https://')) continue;
      const link = document.createElement('a'); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = this.labels.source; link.title = source.title;
      $('discovery-sources').append(link);
    }
    $('discovery-card').scrollTop = 0;
    $('discovery-name').focus({ preventScroll: true });
    this.refresh();
  }
  clearFocus() {
    this.cancelPointer();
    this.selected = null; document.body.classList.remove('discovery-focused'); this.world.clearDiscoveryFocus?.();
    $('discovery-card').hidden = true;
    $('discovery-hint').hidden = false;
    $('discovery-hint').textContent = this.labels.hint;
    if (this.active) $('discovery-next').focus({ preventScroll: true });
  }
  update() {
    if (!this.active) return;
    const targets = new Map((this.world.getDiscoveryTargets?.() || []).map(target => [target.id, target]));
    for (const [id, button] of this.buttons) {
      const target = targets.get(id);
      const available = this.progress.canInspect(id, this.venue.id, this.save.data.unlockedStage);
      button.hidden = Boolean(this.selected) || !target || target.visible === false;
      if (!target) continue;
      button.style.left = `${target.x}px`; button.style.top = `${target.y}px`;
      button.classList.toggle('found', this.progress.found.has(id));
      button.classList.toggle('unavailable', !available);
    }
  }
}
