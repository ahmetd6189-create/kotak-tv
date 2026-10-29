import type {Program} from './iptv';
/** Collapse overlapping duplicate listings, retaining the most recent start from provider revisions. */
export function cleanSchedule(programs:Program[]):Program[]{
 const out:Program[]=[];
 for(const p of [...programs].sort((a,b)=>a.start-b.start)){
  const previous=out[out.length-1];
  if(previous&&previous.title.trim().toLocaleLowerCase('tr')===p.title.trim().toLocaleLowerCase('tr')&&p.start<previous.end&&p.start-previous.start<=20*60000){out[out.length-1]={...previous,...p,description:p.description||previous.description};}
  else if(!previous||previous.start!==p.start||previous.title!==p.title)out.push(p);
 }
 return out;
}
