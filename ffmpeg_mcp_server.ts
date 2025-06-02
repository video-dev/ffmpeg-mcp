#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

const server = new Server(
  {
    name: "ffmpeg-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to execute ffmpeg commands
async function executeFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string; success: boolean }> {
  return new Promise((resolve) => {
    const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    const child = spawn(ffmpegPath, args, { stdio: "pipe" });
    
    let stdout = "";
    let stderr = "";
    
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    
    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        success: code === 0,
      });
    });
    
    child.on("error", (error) => {
      resolve({
        stdout: "",
        stderr: error.message,
        success: false,
      });
    });
  });
}

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Tool definitions
const tools = [
  {
    name: "convert_format",
    description: "Convert media files between different formats (MP4, AVI, MOV, WebM, MP3, WAV, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        copy_streams: { 
          type: "boolean", 
          description: "Copy streams without re-encoding (faster, lossless)",
          default: false 
        },
        video_codec: { 
          type: "string", 
          description: "Video codec (e.g., libx264, libx265, copy)",
          default: "auto"
        },
        audio_codec: { 
          type: "string", 
          description: "Audio codec (e.g., aac, mp3, copy)",
          default: "auto"
        },
        quality: {
          type: "string",
          description: "Quality preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)",
          default: "medium"
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "generate_subtitles",
    description: "Generate subtitle files from video audio using OpenAI Whisper",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output subtitle file path (.srt)" },
        model: {
          type: "string",
          description: "Whisper model size (tiny, base, small, medium, large)",
          default: "base"
        },
        language: {
          type: "string",
          description: "Language code (auto-detect if not specified)"
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "extract_audio",
    description: "Extract audio from video files in various formats",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output audio file path" },
        format: { 
          type: "string", 
          description: "Audio format (mp3, wav, aac, ogg, flac)",
          default: "mp3"
        },
        bitrate: { 
          type: "string", 
          description: "Audio bitrate (e.g., 128k, 192k, 320k)",
          default: "192k"
        },
        sample_rate: { 
          type: "string", 
          description: "Sample rate (e.g., 44100, 48000)",
          default: "44100"
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "resize_video",
    description: "Resize/scale video to different resolutions",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output video file path" },
        width: { type: "integer", description: "Output width in pixels" },
        height: { type: "integer", description: "Output height in pixels" },
        preset: {
          type: "string",
          description: "Common resolution presets (360p, 480p, 720p, 1080p, 4k)",
        },
        maintain_aspect: { 
          type: "boolean", 
          description: "Maintain aspect ratio",
          default: true 
        },
        scaling_algorithm: {
          type: "string",
          description: "Scaling algorithm (lanczos, bicubic, bilinear)",
          default: "lanczos"
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "compress_video",
    description: "Compress video files to reduce file size",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output video file path" },
        crf: { 
          type: "integer", 
          description: "Constant Rate Factor (0-51, lower = better quality, 23 is default)",
          default: 23
        },
        preset: {
          type: "string",
          description: "Encoding speed preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)",
          default: "medium"
        },
        video_bitrate: { 
          type: "string", 
          description: "Target video bitrate (e.g., 1000k, 2M)" 
        },
        audio_bitrate: { 
          type: "string", 
          description: "Target audio bitrate (e.g., 128k, 192k)",
          default: "128k"
        },
        video_codec: {
          type: "string",
          description: "Video codec (libx264, libx265)",
          default: "libx265"
        },
        two_pass: { 
          type: "boolean", 
          description: "Use two-pass encoding for better quality",
          default: false 
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "trim_media",
    description: "Trim/cut media files to specific time ranges",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        start_time: { 
          type: "string", 
          description: "Start time (format: HH:MM:SS or seconds)",
          default: "00:00:00"
        },
        duration: { 
          type: "string", 
          description: "Duration to keep (format: HH:MM:SS or seconds)" 
        },
        end_time: { 
          type: "string", 
          description: "End time (format: HH:MM:SS or seconds)" 
        },
        copy_streams: { 
          type: "boolean", 
          description: "Copy streams without re-encoding (faster)",
          default: true 
        },
        video_codec: {
          type: "string",
          description: "Video codec when not copying streams (libx264, libx265)"
        },
        audio_codec: {
          type: "string",
          description: "Audio codec when not copying streams (aac, mp3)"
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "concatenate_videos",
    description: "Join multiple video files into one",
    inputSchema: {
      type: "object",
      properties: {
        inputs: { 
          type: "array", 
          items: { type: "string" },
          description: "Array of input video file paths"
        },
        output: { type: "string", description: "Output video file path" },
        method: {
          type: "string",
          description: "Concatenation method (concat_demuxer, concat_filter, concat_protocol)",
          default: "concat_demuxer"
        }
      },
      required: ["inputs", "output"],
    },
  },
  {
    name: "add_subtitles",
    description: "Add subtitle files to videos",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output video file path" },
        subtitle_file: { type: "string", description: "Subtitle file path (.srt, .ass, .vtt)" },
        embed: { 
          type: "boolean", 
          description: "Embed subtitles in video (true) or burn-in to video (false)",
          default: true 
        },
        font_size: { 
          type: "integer", 
          description: "Font size for burned-in subtitles",
          default: 24 
        },
        font_color: { 
          type: "string", 
          description: "Font color for burned-in subtitles",
          default: "white" 
        }
      },
      required: ["input", "output", "subtitle_file"],
    },
  },
  {
    name: "change_framerate",
    description: "Change video framerate",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output video file path" },
        framerate: { 
          type: "number", 
          description: "Target framerate (e.g., 24, 30, 60)"
        },
        method: {
          type: "string",
          description: "Framerate conversion method (fps_filter, r_flag)",
          default: "fps_filter"
        }
      },
      required: ["input", "output", "framerate"],
    },
  },
  {
    name: "rotate_video",
    description: "Rotate video by specified degrees",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output video file path" },
        rotation: { 
          type: "string", 
          description: "Rotation (90, 180, 270, or 90_ccw, 90_cw)",
          default: "90"
        }
      },
      required: ["input", "output", "rotation"],
    },
  },
  {
    name: "create_gif",
    description: "Convert video to animated GIF",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output GIF file path" },
        start_time: { 
          type: "string", 
          description: "Start time (format: HH:MM:SS)",
          default: "00:00:00"
        },
        duration: { 
          type: "string", 
          description: "Duration (format: HH:MM:SS or seconds)",
          default: "5"
        },
        width: { 
          type: "integer", 
          description: "Output width in pixels",
          default: 320
        },
        fps: { 
          type: "integer", 
          description: "Frames per second",
          default: 10
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "get_media_info",
    description: "Get detailed information about media files",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        show_format: { 
          type: "boolean", 
          description: "Show format information",
          default: true 
        },
        show_streams: { 
          type: "boolean", 
          description: "Show stream information",
          default: true 
        }
      },
      required: ["input"],
    },
  },
  {
    name: "extract_frames",
    description: "Extract frames from video as images",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output_pattern: { 
          type: "string", 
          description: "Output filename pattern (e.g., frame_%04d.png)",
          default: "frame_%04d.png"
        },
        start_time: { 
          type: "string", 
          description: "Start time (format: HH:MM:SS)",
          default: "00:00:00"
        },
        duration: { 
          type: "string", 
          description: "Duration to extract frames from" 
        },
        fps: { 
          type: "string", 
          description: "Extract one frame every N seconds (e.g., 1/60 for every 60 seconds)",
          default: "1"
        }
      },
      required: ["input", "output_pattern"],
    },
  },
  {
    name: "adjust_volume",
    description: "Adjust audio volume levels",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        volume: { 
          type: "string", 
          description: "Volume adjustment (e.g., 0.5 for half, 2.0 for double, +10dB, -5dB)",
          default: "1.0"
        }
      },
      required: ["input", "output", "volume"],
    },
  },
  {
    name: "normalize_audio",
    description: "Normalize audio levels",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        method: {
          type: "string",
          description: "Normalization method (loudnorm, dynaudnorm)",
          default: "loudnorm"
        },
        target_lufs: { 
          type: "number", 
          description: "Target LUFS level for loudnorm",
          default: -23 
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "reverse_video",
    description: "Reverse video playback (play backwards)",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output video file path" },
        reverse_audio: { 
          type: "boolean", 
          description: "Also reverse the audio track",
          default: true 
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "apply_video_filter",
    description: "Apply custom video and audio filters to media files",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        video_filter: { 
          type: "string", 
          description: "Video filter string (e.g., 'reverse', 'scale=640:480', 'blur=5')" 
        },
        audio_filter: { 
          type: "string", 
          description: "Audio filter string (e.g., 'areverse', 'volume=0.5')" 
        },
        video_codec: { 
          type: "string", 
          description: "Video codec (e.g., libx264, libx265)",
          default: "libx264"
        },
        audio_codec: { 
          type: "string", 
          description: "Audio codec (e.g., aac, mp3)",
          default: "aac"
        }
      },
      required: ["input", "output"],
    },
  },
  {
    name: "create_thumbnail",
    description: "Create thumbnail images from video",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input video file path" },
        output: { type: "string", description: "Output image file path" },
        time: { 
          type: "string", 
          description: "Time to capture thumbnail (format: HH:MM:SS)",
          default: "00:00:01"
        },
        width: { 
          type: "integer", 
          description: "Thumbnail width in pixels" 
        },
        height: { 
          type: "integer", 
          description: "Thumbnail height in pixels" 
        }
      },
      required: ["input", "output"],
    },
  }
];

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Check if input file exists (for most operations)
    if (args.input && !(await fileExists(args.input))) {
      throw new Error(`Input file does not exist: ${args.input}`);
    }

    let ffmpegArgs: string[] = [];
    let result: { stdout: string; stderr: string; success: boolean };

    switch (name) {
      case "convert_format": {
        ffmpegArgs = ["-i", args.input];
        
        if (args.copy_streams) {
          ffmpegArgs.push("-c", "copy");
        } else {
          if (args.video_codec && args.video_codec !== "auto") {
            ffmpegArgs.push("-c:v", args.video_codec);
          }
          if (args.audio_codec && args.audio_codec !== "auto") {
            ffmpegArgs.push("-c:a", args.audio_codec);
          }
          if (args.quality) {
            ffmpegArgs.push("-preset", args.quality);
          }
        }
        
        ffmpegArgs.push("-y", args.output);
        break;
      }

      case "generate_subtitles": {
        // First extract audio from video
        const tempAudioFile = args.input.replace(/\.[^.]+$/, '_temp_audio.wav');
        
        // Extract audio using ffmpeg
        const extractArgs = [
          "-i", args.input,
          "-vn", // No video
          "-acodec", "pcm_s16le", // Uncompressed audio for better Whisper results
          "-ar", "16000", // 16kHz sample rate (Whisper's native rate)
          "-ac", "1", // Mono
          "-y", tempAudioFile
        ];
        
        result = await executeFFmpeg(extractArgs);
        if (!result.success) {
          throw new Error(`Audio extraction failed: ${result.stderr}`);
        }
        
        // Use Whisper to transcribe
        const whisperArgs = [
          tempAudioFile,
          "--model", args.model || "base",
          "--output_format", "srt",
          "--output_dir", path.dirname(args.output)
        ];
        
        if (args.language) {
          whisperArgs.push("--language", args.language);
        }
        
        const whisperResult = await new Promise<{ stdout: string; stderr: string; success: boolean }>((resolve) => {
          const whisperPath = process.env.WHISPER_PATH || "whisper";
          const child = spawn(whisperPath, whisperArgs, { stdio: "pipe" });
          
          let stdout = "";
          let stderr = "";
          
          child.stdout?.on("data", (data) => {
            stdout += data.toString();
          });
          
          child.stderr?.on("data", (data) => {
            stderr += data.toString();
          });
          
          child.on("close", (code) => {
            resolve({
              stdout,
              stderr,
              success: code === 0,
            });
          });
          
          child.on("error", (error) => {
            resolve({
              stdout: "",
              stderr: error.message,
              success: false,
            });
          });
        });
        
        // Clean up temporary audio file
        try {
          await fs.unlink(tempAudioFile);
        } catch {
          // Ignore cleanup errors
        }
        
        if (!whisperResult.success) {
          throw new Error(`Whisper transcription failed: ${whisperResult.stderr}`);
        }
        
        // Whisper creates filename based on input, rename to desired output
        const whisperOutput = tempAudioFile.replace('.wav', '.srt');
        try {
          await fs.rename(whisperOutput, args.output);
        } catch {
          // If rename fails, try to copy the content
          try {
            const content = await fs.readFile(whisperOutput, 'utf8');
            await fs.writeFile(args.output, content);
            await fs.unlink(whisperOutput);
          } catch (copyError) {
            throw new Error(`Failed to save subtitle file: ${copyError}`);
          }
        }
        
        return {
          content: [{
            type: "text",
            text: `✅ Successfully generated subtitles\nInput: ${args.input}\nOutput: ${args.output}\nModel: ${args.model || 'base'}\n\nWhisper output: ${whisperResult.stdout || 'Completed successfully'}`
          }]
        };
      }

      case "extract_audio": {
        ffmpegArgs = [
          "-i", args.input,
          "-vn", // No video
          "-c:a", args.format === "mp3" ? "mp3" : args.format === "aac" ? "aac" : "copy",
          "-b:a", args.bitrate,
          "-ar", args.sample_rate,
          "-y", args.output
        ];
        break;
      }

      case "resize_video": {
        ffmpegArgs = ["-i", args.input];
        
        let scale = "";
        if (args.preset) {
          const presets: { [key: string]: string } = {
            "360p": "640:360",
            "480p": "854:480", 
            "720p": "1280:720",
            "1080p": "1920:1080",
            "4k": "3840:2160"
          };
          scale = presets[args.preset] || `${args.width}:${args.height}`;
        } else if (args.width && args.height) {
          scale = `${args.width}:${args.height}`;
        } else if (args.width) {
          scale = `${args.width}:-1`;
        } else if (args.height) {
          scale = `-1:${args.height}`;
        }
        
        if (scale) {
          const algorithm = args.scaling_algorithm || "lanczos";
          ffmpegArgs.push("-vf", `scale=${scale}:flags=${algorithm}`);
        }
        
        ffmpegArgs.push("-y", args.output);
        break;
      }

      case "compress_video": {
        if (args.two_pass) {
          // First pass
          const firstPassArgs = [
            "-i", args.input,
            "-c:v", args.video_codec || "libx265",
            "-preset", args.preset,
            "-crf", args.crf.toString(),
            "-pass", "1",
            "-f", "null"
          ];
          if (args.video_bitrate) {
            firstPassArgs.splice(-3, 0, "-b:v", args.video_bitrate);
          }
          firstPassArgs.push("/dev/null");
          
          result = await executeFFmpeg(firstPassArgs);
          if (!result.success) {
            throw new Error(`First pass failed: ${result.stderr}`);
          }
          
          // Second pass
          ffmpegArgs = [
            "-i", args.input,
            "-c:v", args.video_codec || "libx265",
            "-preset", args.preset,
            "-crf", args.crf.toString(),
            "-pass", "2",
            "-c:a", "aac",
            "-b:a", args.audio_bitrate,
            "-y", args.output
          ];
          if (args.video_bitrate) {
            ffmpegArgs.splice(-4, 0, "-b:v", args.video_bitrate);
          }
        } else {
          ffmpegArgs = [
            "-i", args.input,
            "-c:v", args.video_codec || "libx265",
            "-preset", args.preset,
            "-crf", args.crf.toString(),
            "-c:a", "aac",
            "-b:a", args.audio_bitrate,
            "-y", args.output
          ];
          if (args.video_bitrate) {
            ffmpegArgs.splice(-4, 0, "-b:v", args.video_bitrate);
          }
        }
        break;
      }

      case "trim_media": {
        ffmpegArgs = ["-i", args.input];
        
        if (args.start_time) {
          ffmpegArgs.push("-ss", args.start_time);
        }
        
        if (args.duration) {
          ffmpegArgs.push("-t", args.duration);
        } else if (args.end_time) {
          ffmpegArgs.push("-to", args.end_time);
        }
        
        if (args.copy_streams) {
          ffmpegArgs.push("-c", "copy");
        } else {
          if (args.video_codec) {
            ffmpegArgs.push("-c:v", args.video_codec);
          }
          if (args.audio_codec) {
            ffmpegArgs.push("-c:a", args.audio_codec);
          }
        }
        
        ffmpegArgs.push("-y", args.output);
        break;
      }

      case "concatenate_videos": {
        if (args.method === "concat_demuxer") {
          // Create temporary file list
          const listFile = "concat_list.txt";
          const listContent = args.inputs.map((input: string) => `file '${input}'`).join("\n");
          await fs.writeFile(listFile, listContent);
          
          ffmpegArgs = [
            "-f", "concat",
            "-safe", "0",
            "-i", listFile,
            "-c", "copy",
            "-y", args.output
          ];
        } else {
          // Using concat protocol
          const concatInput = args.inputs.join("|");
          ffmpegArgs = [
            "-i", `concat:${concatInput}`,
            "-c", "copy",
            "-y", args.output
          ];
        }
        break;
      }

      case "add_subtitles": {
        ffmpegArgs = ["-i", args.input];
        
        if (args.embed) {
          // Embed subtitles as a stream
          ffmpegArgs.push("-i", args.subtitle_file, "-c", "copy", "-c:s", "mov_text");
        } else {
          // Burn subtitles into video
          ffmpegArgs.push(
            "-vf", 
            `subtitles=${args.subtitle_file}:force_style='FontSize=${args.font_size},PrimaryColour=${args.font_color}'`
          );
        }
        
        ffmpegArgs.push("-y", args.output);
        break;
      }

      case "change_framerate": {
        ffmpegArgs = ["-i", args.input];
        
        if (args.method === "fps_filter") {
          ffmpegArgs.push("-vf", `fps=${args.framerate}`);
        } else {
          ffmpegArgs.push("-r", args.framerate.toString());
        }
        
        ffmpegArgs.push("-y", args.output);
        break;
      }

      case "rotate_video": {
        const rotations: { [key: string]: string } = {
          "90": "transpose=1",
          "90_cw": "transpose=1", 
          "90_ccw": "transpose=2",
          "180": "transpose=1,transpose=1",
          "270": "transpose=2"
        };
        
        ffmpegArgs = [
          "-i", args.input,
          "-vf", rotations[args.rotation] || "transpose=1",
          "-y", args.output
        ];
        break;
      }

      case "create_gif": {
        ffmpegArgs = [
          "-i", args.input,
          "-ss", args.start_time,
          "-t", args.duration,
          "-vf", `scale=${args.width}:-1:flags=lanczos,fps=${args.fps}`,
          "-y", args.output
        ];
        break;
      }

      case "get_media_info": {
        const probeArgs = ["-v", "quiet", "-print_format", "json"];
        
        if (args.show_format) {
          probeArgs.push("-show_format");
        }
        if (args.show_streams) {
          probeArgs.push("-show_streams");
        }
        
        probeArgs.push(args.input);
        
        // Use ffprobe instead of ffmpeg
        const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
        const child = spawn(ffprobePath, probeArgs, { stdio: "pipe" });
        
        result = await new Promise((resolve) => {
          let stdout = "";
          let stderr = "";
          
          child.stdout?.on("data", (data) => {
            stdout += data.toString();
          });
          
          child.stderr?.on("data", (data) => {
            stderr += data.toString();
          });
          
          child.on("close", (code) => {
            resolve({
              stdout,
              stderr,
              success: code === 0,
            });
          });
        });
        
        if (result.success) {
          try {
            const info = JSON.parse(result.stdout);
            return {
              content: [{
                type: "text",
                text: `Media Information:\n${JSON.stringify(info, null, 2)}`
              }]
            };
          } catch {
            return {
              content: [{
                type: "text", 
                text: `Media Information:\n${result.stdout}`
              }]
            };
          }
        } else {
          throw new Error(`Failed to get media info: ${result.stderr}`);
        }
      }

      case "extract_frames": {
        ffmpegArgs = ["-i", args.input];
        
        if (args.start_time) {
          ffmpegArgs.push("-ss", args.start_time);
        }
        
        if (args.duration) {
          ffmpegArgs.push("-t", args.duration);
        }
        
        ffmpegArgs.push("-vf", `fps=${args.fps}`, "-y", args.output_pattern);
        break;
      }

      case "adjust_volume": {
        ffmpegArgs = [
          "-i", args.input,
          "-af", `volume=${args.volume}`,
          "-y", args.output
        ];
        break;
      }

      case "normalize_audio": {
        if (args.method === "loudnorm") {
          ffmpegArgs = [
            "-i", args.input,
            "-af", `loudnorm=I=${args.target_lufs}`,
            "-y", args.output
          ];
        } else {
          ffmpegArgs = [
            "-i", args.input,
            "-af", "dynaudnorm",
            "-y", args.output
          ];
        }
        break;
      }

      case "reverse_video": {
        if (args.reverse_audio) {
          // Reverse both video and audio
          ffmpegArgs = [
            "-i", args.input,
            "-vf", "reverse",
            "-af", "areverse",
            "-y", args.output
          ];
        } else {
          // Reverse only video, maintain original audio
          ffmpegArgs = [
            "-i", args.input,
            "-vf", "reverse",
            "-y", args.output
          ];
        }
        break;
      }

      case "apply_video_filter": {
        ffmpegArgs = ["-i", args.input];
        
        if (args.video_filter) {
          ffmpegArgs.push("-vf", args.video_filter);
        }
        
        if (args.audio_filter) {
          ffmpegArgs.push("-af", args.audio_filter);
        }
        
        // Add codecs
        ffmpegArgs.push("-c:v", args.video_codec || "libx264");
        ffmpegArgs.push("-c:a", args.audio_codec || "aac");
        
        ffmpegArgs.push("-y", args.output);
        break;
      }

      case "create_thumbnail": {
        ffmpegArgs = [
          "-i", args.input,
          "-ss", args.time,
          "-vframes", "1"
        ];
        
        if (args.width && args.height) {
          ffmpegArgs.push("-vf", `scale=${args.width}:${args.height}`);
        } else if (args.width) {
          ffmpegArgs.push("-vf", `scale=${args.width}:-1`);
        } else if (args.height) {
          ffmpegArgs.push("-vf", `scale=-1:${args.height}`);
        }
        
        ffmpegArgs.push("-y", args.output);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Execute ffmpeg command (if not already executed above)
    if (name !== "get_media_info") {
      result = await executeFFmpeg(ffmpegArgs);
    }

    if (result!.success) {
      return {
        content: [{
          type: "text",
          text: `✅ Successfully executed ${name}\nCommand: ffmpeg ${ffmpegArgs.join(" ")}\n\nOutput: ${result!.stderr || "Completed successfully"}`
        }]
      };
    } else {
      throw new Error(`FFmpeg command failed: ${result!.stderr}`);
    }

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FFmpeg MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
