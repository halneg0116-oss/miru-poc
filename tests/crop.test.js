import {test} from 'node:test';
import assert from 'node:assert/strict';
import {backgroundBlob,photoBlob} from '../image.js';

// Exercise actual encoders through the Canvas boundary, without browser/image mocks
// hiding the chosen source or drawing rectangle.
test('background keeps full frame; each output crops directly from that frame',async()=>{
  const previous=globalThis.document;
  const operations=[];
  globalThis.document={createElement(tag){
    assert.equal(tag,'canvas');
    const canvas={width:0,height:0,getContext(){return {drawImage(source,...rect){canvas.source=source;canvas.rect=rect;}};},toBlob(done){operations.push(canvas);done(new Blob(['jpeg']));}};
    return canvas;
  }};
  try {
    for(const [sw,sh] of [[1920,1080],[1080,1920],[4032,3024],[3024,4032]]) {
      const video={videoWidth:sw,videoHeight:sh};
      await backgroundBlob(video);
      const bg=operations.at(-1);
      assert.equal(bg.source,video);
      assert.deepEqual(bg.rect,[0,0,bg.width,bg.height]);
      assert.ok(Math.max(bg.width,bg.height)<=1920);
      assert.ok(Math.abs(bg.width/bg.height-sw/sh)<.001);
      const source={naturalWidth:bg.width,naturalHeight:bg.height};
      for(const ratio of ['4/5','9/16','1/1','4/5']) {
        await photoBlob(source,ratio);
        const out=operations.at(-1),[x,y,dw,dh]=out.rect;
        assert.equal(out.source,source,'every ratio uses unchanged full background');
        const [rw,rh]=ratio.split('/').map(Number);
        assert.ok(Math.abs(out.width/out.height-rw/rh)<.001);
        // Recover source-space crop bounds: wide/square outputs must regain
        // pixels outside the old fixed 3:4 acquisition crop.
        const scale=dw/source.naturalWidth;
        const left=-x/scale,top=-y/scale;
        const expectedW=Math.min(source.naturalWidth,source.naturalHeight*rw/rh);
        const expectedH=Math.min(source.naturalHeight,source.naturalWidth*rh/rw);
        assert.ok(Math.abs(left-(source.naturalWidth-expectedW)/2)<1);
        assert.ok(Math.abs(top-(source.naturalHeight-expectedH)/2)<1);
        assert.ok(Math.abs(out.width/scale-expectedW)<1);
        assert.ok(dw>=out.width && dh>=out.height);
      }
    }
  } finally {globalThis.document=previous;}
});
