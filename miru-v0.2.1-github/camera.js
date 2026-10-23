export class Camera {
  stream = null; token = 0;
  stop() {
    this.token++;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    if(this.video) { this.video.srcObject = null; this.video.style.display = 'none'; }
  }
  async start(video, onEnded) {
    this.stop(); const token = this.token;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('カメラにはHTTPS接続が必要です。背景を撮る・写真を選ぶから続けられます。');
    const stream = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:'environment'}, width:{ideal:1920}, height:{ideal:1920}}});
    if (token !== this.token) {stream.getTracks().forEach(t=>t.stop()); return false;}
    this.stream = stream; this.video = video; video.srcObject = stream;
    try {await video.play();} catch(e) {this.stop(); throw e;}
    if(token !== this.token) return false;
    video.style.display = 'block'; stream.getVideoTracks()[0].onended = () => {this.stop(); onEnded();};
    return true;
  }
}
export function cameraError(error) {
  if(error.name === 'NotAllowedError') return 'カメラの許可がありません。Safariのサイト設定で許可するか、下の標準カメラ・写真選択で続けてください。';
  if(error.name === 'NotFoundError') return 'カメラが見つかりません。写真選択で続けてください。';
  if(error.name === 'NotReadableError') return 'カメラを使用できません。他のカメラアプリを閉じて再試行するか、写真選択で続けてください。';
  return error.message || 'カメラを起動できません。写真選択で続けてください。';
}
