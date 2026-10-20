import {createAccessHandler} from './handler.ts';
function defaultKey(dictionary:string|undefined,legacy:string|undefined){if(dictionary){const parsed=JSON.parse(dictionary);if(parsed.default)return parsed.default;}return legacy||'';}
const handler=createAccessHandler({
 url:Deno.env.get('SUPABASE_URL')||'',
 publicKey:defaultKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'),Deno.env.get('SUPABASE_ANON_KEY')),
 secretKey:defaultKey(Deno.env.get('SUPABASE_SECRET_KEYS'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
});
Deno.serve(handler);
