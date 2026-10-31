export type Invite={origin:string;id:string;token:string};
export function parseInvite(value:string):Invite|null{
 try{const u=new URL(value);let origin,id,token;
  if(u.protocol==='kotaktv:'&&u.hostname==='join'){origin=u.searchParams.get('origin')||'';id=u.pathname.replace(/^\//,'');token=u.searchParams.get('invite')||u.hash.slice(1);}
  else if(u.protocol==='https:'&&/^\/join\/[a-f0-9]+$/.test(u.pathname)){origin=u.origin;id=u.pathname.split('/').pop()||'';token=u.hash.slice(1);}
  else return null;
  const host=new URL(origin);if(host.protocol!=='https:'||host.username||host.password||host.origin!==origin||host.hostname==='localhost'||/^[\d.:\[\]]+$/.test(host.hostname))return null;
  if(!/^[a-f0-9]{32}$/.test(id)||!/^[-_A-Za-z0-9]{43}$/.test(token))return null;return {origin,id,token};
 }catch{return null;}
}
export function nativeInviteLink(invite:Invite){return `kotaktv://join/${invite.id}?origin=${encodeURIComponent(invite.origin)}&invite=${encodeURIComponent(invite.token)}`;}
