import type {Entry} from './iptv';
export function vlcSource(item:Entry,uri=item.uri||''){
 const headers=item.headers||{};const opts=[':network-caching=1500',':clock-jitter=0',':audio-language=tur,tr',':no-spdif'];
 for(const [name,value] of Object.entries(headers)){if(name.toLowerCase()==='user-agent')opts.push(':http-user-agent='+value);if(name.toLowerCase()==='referer')opts.push(':http-referrer='+value);}
 // Native VLC 1.0.98 omits its last option; the last value is deliberately redundant.
 opts.push(':no-video-title-show');
 return {uri,initType:2 as const,hwDecoderEnabled:1,hwDecoderForced:0,initOptions:['--aout=opensles','--no-audio-time-stretch','--no-spdif','--no-osd'],mediaOptions:opts};
}
export function preferredVlcAudio<T extends {id:number;name:string}>(tracks:T[],current?:number){const enabled=tracks.filter(t=>t.id>=0);return enabled.find(t=>t.id===current)||enabled.find(t=>/türk|turk|turkish|\btur\b|\btr\b/i.test(t.name))||enabled[0];}
export function vlcSeconds(value:number){return Number.isFinite(value)?Math.max(0,value/1000):0;}
export function needsSystemPlayer(item:Entry){return Object.keys(item.headers||{}).some(h=>!['user-agent','referer','cache-control'].includes(h.toLowerCase()));}
