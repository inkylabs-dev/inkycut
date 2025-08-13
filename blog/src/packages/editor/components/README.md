# Audio Visualizer Component

## Overview

Custom audio visualization component that creates waveform visualizations from audio blobs using the Web Audio API. This component replaces the previous `react-audio-visualize` dependency with a lightweight, custom implementation.

## Features

- **Web Audio API Integration**: Uses browser-native audio processing
- **RMS-based Visualization**: Calculates Root Mean Square for accurate amplitude representation
- **Customizable Appearance**: Configurable bar width, gap, colors, and dimensions
- **Optimized Performance**: Efficient downsampling for large audio files
- **Canvas-based Rendering**: High-performance visualization using HTML5 Canvas

## Usage

```tsx
import AudioVisualizer from './components/AudioVisualizer';

<AudioVisualizer
  blob={audioBlob}
  width={300}
  height={50}
  barWidth={2}
  gap={1}
  barColor="#ffffff"
  backgroundColor="transparent"
  trimBefore={1000}  // Trim 1 second from start
  trimAfter={500}    // Trim 0.5 seconds from end
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `blob` | `Blob` | - | Audio blob to visualize (required) |
| `width` | `number` | - | Width of the visualization in pixels (required) |
| `height` | `number` | - | Height of the visualization in pixels (required) |
| `barWidth` | `number` | `2` | Width of each bar in pixels |
| `gap` | `number` | `1` | Gap between bars in pixels |
| `barColor` | `string` | `"#ffffff"` | Color of the bars (CSS color) |
| `backgroundColor` | `string` | `"transparent"` | Background color (CSS color) |
| `trimBefore` | `number` | `0` | Time in milliseconds to trim from the beginning |
| `trimAfter` | `number` | `0` | Time in milliseconds to trim from the end |

## Implementation Details

### Audio Processing

1. **Blob to ArrayBuffer**: Converts the audio blob to an array buffer
2. **Audio Context**: Creates or reuses Web Audio API context
3. **Decoding**: Decodes audio data using `decodeAudioData()`
4. **Channel Data**: Extracts raw audio data from the first channel
5. **Trimming**: Calculates and extracts only the visible portion based on `trimBefore` and `trimAfter`
6. **Downsampling**: Reduces trimmed data points to match the number of bars
7. **RMS Calculation**: Computes Root Mean Square for each segment
8. **Normalization**: Scales amplitudes to fit the visualization height

### Canvas Rendering

- Uses HTML5 Canvas for efficient rendering
- Bars are centered vertically for better visual appearance
- Amplitude normalization ensures consistent visualization across different audio files
- Canvas dimensions are set programmatically for crisp rendering

### Performance Considerations

- **Memory Management**: Automatically closes AudioContext after processing
- **Efficient Sampling**: Downsamples large audio files to reduce processing time
- **Canvas Optimization**: Direct canvas manipulation for optimal performance

## Error Handling

The component gracefully handles various error conditions:

- **Invalid Audio Data**: Logs warnings for unsupported audio formats
- **Web Audio API Errors**: Catches and logs decoding failures
- **Missing Canvas Context**: Safely handles canvas initialization failures

## Browser Compatibility

- **Modern Browsers**: Full support in Chrome, Firefox, Safari, Edge
- **Web Audio API**: Requires browsers with Web Audio API support
- **Canvas API**: Requires HTML5 Canvas support

## Migration from react-audio-visualize

This component replaces `react-audio-visualize` with the following changes:

### Removed Props
- `barPlayedColor` - Not supported in static visualization
- `currentTime` - Not needed for timeline visualization
- `canvasProps` - Canvas is managed internally

### Behavioral Changes
- **Static Visualization**: Shows complete waveform (no playback indication)
- **RMS-based**: Uses RMS calculation instead of peak detection
- **Canvas-native**: Direct canvas rendering instead of SVG

### Performance Improvements
- **Reduced Bundle Size**: No external dependencies
- **Better Performance**: Native canvas rendering
- **Memory Efficient**: Automatic resource cleanup

## Testing

Unit tests are available in `__tests__/AudioVisualizer.test.tsx` covering:

- Component rendering and dimensions
- Default prop handling
- Error handling and graceful degradation
- Web Audio API integration

## Future Enhancements

Potential improvements for future versions:

- **Multi-channel Support**: Visualization for stereo/surround audio
- **Frequency Analysis**: FFT-based spectrum visualization
- **Animation Support**: Real-time waveform updates
- **WebGL Rendering**: Hardware-accelerated visualization for large datasets