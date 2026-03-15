class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(4096);
    this.offset = 0;
    this.hasSentStartedMessage = false;
  }

  process(inputs, outputs, parameters) {
    if (!this.hasSentStartedMessage) {
      this.port.postMessage({ type: 'worklet_started' });
      this.hasSentStartedMessage = true;
    }

    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono input
      
      if (channelData.length > 0) {
        // Log audio activity occasionally
        if (Math.random() < 0.01) { // ~1% of buffers
           this.port.postMessage({ type: 'audio_activity', sample: channelData[0] });
        }

        for (let i = 0; i < channelData.length; i++) {
          // Convert Float32 to Int16
          this.buffer[this.offset++] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
          
          if (this.offset >= this.buffer.length) {
            // Send the full buffer to the main thread
            this.port.postMessage({ type: 'pcm_data', buffer: this.buffer });
            this.buffer = new Int16Array(4096);
            this.offset = 0;
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
