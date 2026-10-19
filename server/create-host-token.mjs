// Run on your server/admin machine. Do not put KOTAK_SECRET in the mobile app.
import {hostToken} from './server.mjs';
if(!process.env.KOTAK_SECRET||process.env.KOTAK_SECRET.length<32||!process.argv[2])throw new Error('KOTAK_SECRET ve kullanıcı kimliği gerekli.');
console.log(hostToken(process.env.KOTAK_SECRET,process.argv[2],Date.now()+7*86400000));
