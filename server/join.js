(async()=>{
 const token=location.hash.slice(1),id=location.pathname.split('/').pop(),status=document.querySelector('#status'),button=document.querySelector('#open');
 history.replaceState(null,'',location.pathname); // The invite is never sent to the store or a referrer.
 if(!/^[-_A-Za-z0-9]{43}$/.test(token)){status.textContent='Davet eksik veya geçersiz. Gönderenden bağlantıyı yeniden iste.';return;}
 const config=await(await fetch('/link-config',{cache:'no-store'})).json();const android=/Android/i.test(navigator.userAgent),ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);const store=android?config.stores.android:ios?config.stores.ios:'';
 const query=`origin=${encodeURIComponent(config.origin)}&invite=${encodeURIComponent(token)}`;const deep=`kotaktv://join/${id}?${query}`;
 const launch=()=>{if(android&&store){location.href=`intent://join/${id}?${query}#Intent;scheme=kotaktv;package=com.kotaktv.app;S.browser_fallback_url=${encodeURIComponent(store)};end`;}else{location.href=deep;if(store)setTimeout(()=>{if(document.visibilityState==='visible')location.href=store;},1800);}};
 button.hidden=false;button.onclick=launch;status.textContent=store?'Uygulama yüklüyse davet açılır; yüklü değilse mağaza sayfasına yönlendirilirsin. İndirdikten sonra bu davete yeniden dokun.':'Kotak TV yüklüyse davet uygulamada açılır. Mağaza sayfası henüz yayımlanmamış; indirme yönlendirmesi şu an kullanılamıyor.';
 if(android||ios)launch();
})().catch(()=>document.querySelector('#status').textContent='Davet servisine şu an ulaşılamıyor.');
