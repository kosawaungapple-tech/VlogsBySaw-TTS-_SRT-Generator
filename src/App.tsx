// [SPEED & PITCH ADJUSTMENT - FIXED]
let finalAudioResult = { ...audioResult };
if ((config.speed && config.speed !== 1.0) || (config.pitch && config.pitch !== 0)) {
  setIsProcessingSpeed(true);
  
  // Speed Suggestion Warning
  if (config.speed > 1.6) {
    showToast("အမြန်နှုန်း ၁.၆ ထက်ကျော်ရင် အသံအရည်အသွေး ကျဆင်းနိုင်ပါတယ်။", 'error');
  }

  try {
    console.log(`App: Adjusting Speed to ${config.speed}x and Pitch to ${config.pitch}...`);
    const wavBlob = pcmBase64ToWav(audioResult.audioData);
    
    // renderSpeedAdjustedAudio ကို speed ရော pitch ရော pass လုပ်ပေးလိုက်ပါပြီ
    const { blob: speedAdjustedBlob, duration: finalDuration } = await renderSpeedAdjustedAudio(
      wavBlob, 
      config.speed, 
      config.pitch // Pitch value ပါ ပို့ပေးလိုက်ပါတယ်
    );
    
    const finalUrl = URL.createObjectURL(speedAdjustedBlob);
    const finalSubtitles = generateOptimizedSubtitles(processedText, finalDuration);
    const finalSrt = finalSubtitles.map(s => `${s.index}\n${s.startTime} --> ${s.endTime}\n${s.text}\n`).join('\n');
    
    const speedAdjustedBuffer = await speedAdjustedBlob.arrayBuffer();
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data.split(',')[1]);
      };
    });
    reader.readAsDataURL(speedAdjustedBlob);
    const finalBase64 = await base64Promise;

    finalAudioResult = {
      ...audioResult,
      audioUrl: finalUrl,
      audioData: finalBase64,
      rawAudio: speedAdjustedBuffer,
      duration: finalDuration,
      baseDuration: finalDuration,
      subtitles: finalSubtitles,
      srtContent: finalSrt,
      speed: config.speed
    };
  } catch (err) {
    console.error("Audio processing failed:", err);
    showToast("အသံပြုပြင်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။", 'error');
  } finally {
    setIsProcessingSpeed(false);
  }
}
