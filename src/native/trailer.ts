/** Only provider-supplied YouTube IDs/URLs are accepted; never execute arbitrary HTML. */
export function trailerId(value:string):string|null {
 if(/^[\w-]{11}$/.test(value))return value;
 try{const url=new URL(value);if(url.protocol!=='https:'&&url.protocol!=='http:')return null;
 const host=url.hostname.toLowerCase().replace(/^www\./,'');let id:string|null=null;
 if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
 else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})(?:\/|$)/)?.[1]||null;
 return id&&/^[\w-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
export function trailerDocument(id:string){if(!/^[\w-]{11}$/.test(id))throw new Error('Invalid trailer ID');return `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#000;height:100%;}iframe{width:100%;height:100%;border:0}</style><iframe src="https://www.youtube.com/embed/${id}?playsinline=1&rel=0&origin=https%3A%2F%2Fcom.kotaktv.app" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></html>`;}
