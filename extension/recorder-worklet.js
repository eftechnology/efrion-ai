class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      if (channelData.length > 0) {
        // IMPORTANT: We MUST copy the buffer. 
        // Chrome reuses the underlying memory in the audio thread, 
        // so sending the reference results in zeroed-out data in the main thread.
        this.port.postMessage({ 
          type: 'pcm_data', 
          buffer: new Float32Array(channelData) 
        });
      }
    }
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
