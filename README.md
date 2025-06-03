# FFmpeg MCP Server - Comprehensive

> **⚠️ EXPLORATION ONLY - NOT FOR PRODUCTION USE**
> 
> This repository is provided for exploration and learning purposes only. It is **not suitable for use in any production workflows**. The repository is not actively monitored for issues and is not being actively developed or maintained.

A comprehensive Model Context Protocol (MCP) server for FFmpeg that provides extensive video and audio processing capabilities. This server exposes the most commonly used FFmpeg operations through a simple tool interface.

## Features

This MCP server provides 18 powerful tools covering the most common FFmpeg operations:

### Video Operations
- **Format Conversion** - Convert between video formats (MP4, AVI, MOV, WebM, etc.)
- **Video Resizing** - Scale videos to different resolutions with presets (360p, 480p, 720p, 1080p, 4K)
- **Video Compression** - Compress videos with configurable quality settings and two-pass encoding
- **Video Trimming** - Cut/trim videos to specific time ranges
- **Video Concatenation** - Join multiple videos into one
- **Framerate Changes** - Adjust video framerate
- **Video Rotation** - Rotate videos by 90°, 180°, or 270°
- **Frame Extraction** - Extract individual frames as images
- **Thumbnail Creation** - Generate thumbnail images from videos
- **Subtitle Addition** - Add subtitles (embed or burn-in)
- **Custom Video Filters** - Apply arbitrary FFmpeg filters for advanced processing
- **Video Reversal** - Play videos backwards with optional audio reversal

### Audio Operations
- **Audio Extraction** - Extract audio from videos in various formats (MP3, WAV, AAC, OGG, FLAC)
- **Volume Adjustment** - Increase or decrease audio volume
- **Audio Normalization** - Normalize audio levels using loudnorm or dynaudnorm

### Utility Operations
- **Media Information** - Get detailed format and stream information
- **GIF Creation** - Convert video clips to animated GIFs
- **Subtitle Generation** - Generate automatic subtitles using OpenAI Whisper

## Prerequisites

- **Node.js** (v18 or higher)
- **FFmpeg** installed and accessible in your system PATH
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt update && sudo apt install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Installation & Usage

### Option 1: Run directly with npx (Recommended)

```bash
npx ffmpeg-mcp-comprehensive
```

### Option 2: Install globally

```bash
npm install -g ffmpeg-mcp-comprehensive
ffmpeg-mcp-comprehensive
```

### Option 3: Clone and build from source

```bash
git clone <repository-url>
cd ffmpeg-mcp-comprehensive
npm install
npm run build
npm start
```

## Configuration

### Environment Variables

- `FFMPEG_PATH`: Custom path to ffmpeg executable (default: "ffmpeg")
- `FFPROBE_PATH`: Custom path to ffprobe executable (default: "ffprobe")

Example:
```bash
FFMPEG_PATH=/usr/local/bin/ffmpeg npx ffmpeg-mcp-comprehensive
```

### Claude Desktop Integration

Add to your Claude Desktop configuration file:

**macOS**: `~/.config/claude-desktop/config.json`
**Windows**: `%APPDATA%\Claude Desktop\config.json`
**Linux**: `~/.config/claude-desktop/config.json`

```json
{
  "mcpServers": {
    "ffmpeg": {
      "command": "npx",
      "args": ["--yes", "ffmpeg-mcp-comprehensive"]
    }
  }
}
```

## Tool Examples

### Convert Video Format
```
Convert video.mov to MP4 format with H.264 encoding
```

### Extract Audio
```
Extract MP3 audio from video.mp4 at 192k bitrate
```

### Resize Video
```
Resize video.mp4 to 720p resolution maintaining aspect ratio
```

### Compress Video
```
Compress large_video.mp4 with CRF 23 using medium preset
```

### Trim Video
```
Cut video from 00:01:30 to 00:03:45
```

### Create GIF
```
Create a 5-second GIF from video starting at 00:00:10
```

### Generate AI Subtitles
```
Generate automatic subtitles from video audio using Whisper
```

### Apply Custom Filters
```
Apply blur filter to video with custom FFmpeg filter string
```

## Advanced Features

### Quality Control
- **CRF (Constant Rate Factor)**: Control compression quality (0-51, lower = better quality)
- **Presets**: Choose encoding speed vs compression efficiency
- **Two-pass encoding**: Better quality for file size-constrained outputs

### Smart Defaults
- Automatic codec selection based on output format
- Aspect ratio preservation for resizing
- Lossless stream copying when possible for faster processing

### Flexible Time Formats
- Supports both `HH:MM:SS` and seconds format
- Precise frame-level trimming

## Error Handling

The server includes comprehensive error handling:
- File existence validation
- FFmpeg execution error reporting
- Detailed error messages with suggested fixes
- Graceful handling of invalid parameters

## Performance Tips

1. **Use stream copying** (`copy_streams: true`) when changing containers without re-encoding
2. **Choose appropriate presets** - "fast" for quick processing, "slow" for better compression
3. **Two-pass encoding** for optimal quality when file size matters
4. **Hardware acceleration** - Set custom FFmpeg path to hardware-accelerated builds

## Tool Reference

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `convert_format` | Format conversion | `input`, `output`, `copy_streams` |
| `extract_audio` | Audio extraction | `input`, `output`, `format`, `bitrate` |
| `resize_video` | Video scaling | `input`, `output`, `preset` or `width`/`height` |
| `compress_video` | Size reduction | `input`, `output`, `crf`, `preset` |
| `trim_media` | Time-based cutting | `input`, `output`, `start_time`, `duration` |
| `concatenate_videos` | Join videos | `inputs[]`, `output` |
| `add_subtitles` | Subtitle integration | `input`, `output`, `subtitle_file` |
| `change_framerate` | FPS adjustment | `input`, `output`, `framerate` |
| `rotate_video` | Orientation change | `input`, `output`, `rotation` |
| `create_gif` | GIF creation | `input`, `output`, `duration`, `width` |
| `get_media_info` | File analysis | `input` |
| `extract_frames` | Frame export | `input`, `output_pattern`, `fps` |
| `adjust_volume` | Volume control | `input`, `output`, `volume` |
| `normalize_audio` | Level normalization | `input`, `output`, `method` |
| `create_thumbnail` | Thumbnail generation | `input`, `output`, `time` |
| `apply_video_filter` | Custom FFmpeg filters | `input`, `output`, `video_filter` |
| `reverse_video` | Video reversal | `input`, `output`, `reverse_audio` |
| `generate_subtitles` | AI subtitle generation | `input`, `output`, `language`, `model` |

## Troubleshooting

### Common Issues

**"FFmpeg not found"**
- Ensure FFmpeg is installed and in your PATH
- Set `FFMPEG_PATH` environment variable if installed in custom location

**"Input file does not exist"**
- Check file path and permissions
- Use absolute paths for files outside current directory

**"Codec not supported"**
- Update FFmpeg to latest version
- Check available codecs with `ffmpeg -codecs`

## Contributing

This server is designed to cover the most common FFmpeg use cases. For additional features or bug reports, please open an issue or submit a pull request.

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Powered by [FFmpeg](https://ffmpeg.org/)
- Inspired by existing MCP FFmpeg implementations