export function preferredAudio<T extends {language:string}>(tracks:T[],current:T|null):T|null{return current || tracks.find(t=>/^(tr|tur)(?:-|$)/i.test(t.language)) || tracks[0] || null;}
/** Keeps reconnecting while visible. Backoff avoids flooding an unavailable provider. */
export class StreamRecovery {
 attempts=0;position=0;advancedAt:number;healthySince=0;loadingSince:number;next=0;paused=false;
 constructor(now=Date.now()){this.advancedAt=now;this.loadingSince=now;}
 observe(now:number,source:{position:number;status:string;playing:boolean;live:boolean;active:boolean;ended?:boolean}):'none'|'healthy'|'retry'{
  if(!source.active||this.paused){this.advancedAt=now;this.loadingSince=now;return 'none';}
  let healthy=false;
  if(Math.abs(source.position-this.position)>0.1){this.position=source.position;this.advancedAt=now;if(!this.healthySince)this.healthySince=now;if(now-this.healthySince>10000){this.attempts=0;healthy=true;}}
  const stalled=source.status==='error'||(source.status==='loading'&&now-this.loadingSince>=8000)||(source.playing&&now-this.advancedAt>=8000)||(source.live&&source.ended);
  if(!stalled)return healthy?'healthy':'none';
  this.healthySince=0;
  if(now<this.next)return 'none';
  this.attempts++;this.next=now+Math.min(30000,4000*2**Math.min(this.attempts-1,3));this.advancedAt=now;this.loadingSince=now;return 'retry';
 }
}
