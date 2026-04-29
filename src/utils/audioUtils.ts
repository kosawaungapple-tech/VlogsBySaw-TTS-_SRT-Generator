export async function renderSpeedAdjustedAudio(blob: Blob, speed: number, pitch: number = 0): Promise<{blob: Blob, duration: number}> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Speed အလိုက် duration အသစ်တွက်ချက်ခြင်း
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.ceil(audioBuffer.length / speed),
    audioBuffer.sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // [CRITICAL] အမြန်နှုန်းပြောင်းသော်လည်း အသံ tone မပြောင်းအောင် preservesPitch သုံးခြင်း
  if ('preservesPitch' in source) {
    (source as any).preservesPitch = true;
  }

  // Speed adjustment
  source.playbackRate.value = speed;
  
  // Pitch adjustment (User manual ရွှေ့မှသာ ပြောင်းစေရန်)
  // pitch value က semitones ဖြစ်လေ့ရှိပြီး playbackRate နဲ့ တွက်ချက်ရပါတယ်
  if (pitch !== 0) {
    // pitch shifting logic (optional: simple version)
    // source.detune.value = pitch * 100; // 1 semitone = 100 cents
  }

  source.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  
  // Rendered audio ကို blob ပြန်ပြောင်းခြင်း
  const wavBlob = bufferToWav(renderedBuffer); // bufferToWav function ရှိဖို့လိုပါတယ်
  return {
    blob: wavBlob,
    duration: renderedBuffer.duration
  };
}
