import type {Entry} from './iptv';
export function castInfo(item:Entry,contentUrl=item.uri){
 if(!contentUrl)throw new Error('Yayın bağlantısı yok.');
 const source=item.uri||contentUrl;
 if(/\.mkv(?:[?#]|$)/i.test(source))throw new Error('Bu MKV dosyası TV alıcısında doğrudan desteklenmeyebilir. HLS veya MP4 kaynağı seçin.');
 return {contentUrl,contentType:/\.m3u8(?:[?#]|$)/i.test(source)?'application/x-mpegURL':/\.ts(?:[?#]|$)/i.test(source)?'video/mp2t':'video/mp4',streamType:item.kind==='live'?'live' as const:'buffered' as const,metadata:{type:'generic' as const,title:item.name}};
}
