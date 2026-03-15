class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(4096);
    this.offset = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono input
      
      for (let i = 0; i < channelData.length; i++) {
        // Convert Float32 to Int16
        this.buffer[this.offset++] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
        
        if (this.offset >= this.buffer.length) {
          // Send the full buffer to the main thread
          this.port.postMessage(this.buffer);
          this.buffer = new Int16Array(4096);
          this.offset = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
