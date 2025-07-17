// Global type declarations for AIGM

declare global {
  interface Window {
    _mockChannels?: {
      [channelName: string]: {
        [eventName: string]: Function | Function[]
      }
    }
  }
}

export {}