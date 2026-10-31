// Version-pinned native corrections. Fail on unexpected upstream code rather than silently skip.
const fs=require('fs'),path=require('path');
const root=path.dirname(require.resolve('react-native-vlc-media-player/package.json'));
if(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version!=='1.0.98')throw new Error('Re-review Kotak VLC patch for the new library version');
const base=path.join(root,'android/src/main/java/com/yuanzhou/vlc/vlcplayer');
function replaceExactly(text,old,next){if(!text.includes(old))throw new Error('Kotak VLC patch anchor missing: '+old.slice(0,70));return text.replace(old,next);}
function patchView(text){if(text.includes('// Kotak lifecycle v1'))return text;
 text=replaceExactly(text,'    private boolean isHostPaused = false;','    private boolean isHostPaused = false;\n    // Kotak lifecycle v1\n    private boolean playInBackground = false;\n    public void setPlayInBackground(boolean enabled) { playInBackground = enabled; }');
 const from=text.indexOf('    @Override\n    public void onHostResume()');const to=text.indexOf('    @Override\n    public void onHostPause()',from);
 if(from<0||to<0)throw new Error('Kotak VLC resume method missing');
 text=text.slice(0,from)+`    @Override
    public void onHostResume() {
        if (isHostPaused && mMediaPlayer != null) {
            isHostPaused = false;
            isPaused = false;
            mMediaPlayer.play();
        }
    }

`+text.slice(to);
 text=replaceExactly(text,'    public void onHostPause() {','    public void onHostPause() {\n        if (playInBackground) return;');
 text=replaceExactly(text,'        surfaceVideo = new Surface(surface);\n        createPlayer(true, false);',`        surfaceVideo = new Surface(surface);
        if (mMediaPlayer != null) {
            // Reattach the surface without releasing the decoder or resetting the playhead.
            IVLCVout output = mMediaPlayer.getVLCVout();
            if (output.areViewsAttached()) output.detachViews();
            output.setVideoSurface(surface);
            output.setWindowSize(width, height);
            output.attachViews(onNewVideoLayoutListener);
            isSurfaceViewDestory = false;
        } else if (srcMap != null) {
            createPlayer(true, false);
        }`);
 text=replaceExactly(text,'    public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {\n        return true;','    public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {\n        if (mMediaPlayer != null) mMediaPlayer.getVLCVout().detachViews();\n        isSurfaceViewDestory = true;\n        return true;');
 return text;
}
function patchManager(text){if(text.includes('public void setPlayInBackground('))return text;return replaceExactly(text,'    @ReactProp(name = PROP_PAUSED, defaultBoolean = false)',`    @ReactProp(name = "playInBackground", defaultBoolean = false)
    public void setPlayInBackground(final ReactVlcPlayerView videoView, final boolean enabled) {
        videoView.setPlayInBackground(enabled);
    }

    @ReactProp(name = PROP_PAUSED, defaultBoolean = false)`);}
function run(){for(const [name,fn] of [['ReactVlcPlayerView.java',patchView],['ReactVlcPlayerViewManager.java',patchManager]]){const file=path.join(base,name),old=fs.readFileSync(file,'utf8'),next=fn(old);if(next!==old)fs.writeFileSync(file,next);}console.log('Kotak VLC 1.0.98 lifecycle patch verified');}
if(require.main===module)run();module.exports={patchView,patchManager,run};
