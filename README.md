# OpenSubtitles Uploader PRO

[![Tests](https://github.com/opensubtitles/opensubtitles-uploader-pro/workflows/Tests/badge.svg)](https://github.com/opensubtitles/opensubtitles-uploader-pro/actions)
[![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/opensubtitles/opensubtitles-uploader-pro/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-uploader.opensubtitles.org-brightgreen.svg)](https://uploader.opensubtitles.org)
[![OpenSubtitles.org API](https://img.shields.io/badge/OpenSubtitles.org-API-orange.svg)](https://www.opensubtitles.org/)
[![OpenSubtitles.com API](https://img.shields.io/badge/OpenSubtitles.com-API-blue.svg)](https://api.opensubtitles.com/)

A professional React-based subtitle uploader application that integrates with both OpenSubtitles APIs for seamless subtitle management and upload.

**🚀 [Try it live at uploader.opensubtitles.org](https://uploader.opensubtitles.org)**

## Features

- 🎬 **Drag & Drop Interface** - Drop video and subtitle files directly
- 🔍 **Automatic File Pairing** - Smart matching of video and subtitle files
- 🌍 **Language Detection** - Automatic subtitle language identification
- 🎯 **Movie Recognition** - Intelligent movie/episode detection and metadata
- 📤 **Subtitle Upload** - Direct upload to OpenSubtitles.org
- 🎨 **Modern UI** - Clean, responsive interface with dark/light themes
- ⚡ **Performance Optimized** - Caching, retry logic, and smart processing
- 📺 **TV Show Support** - Special handling for TV episodes with proper metadata
- 🛡️ **Ad Blocker Detection** - Automatic detection and guidance for ad blocker compatibility

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- OpenSubtitles.com API account ([register here](https://www.opensubtitles.com/en/consumers))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/opensubtitles/opensubtitles-uploader-pro.git
   cd opensubtitles-uploader-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API credentials**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your OpenSubtitles API key
   # Get your API key from: https://www.opensubtitles.com/en/consumers
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## Configuration

### Environment Variables

Create a `.env` file with your API key:

```bash
# Required: OpenSubtitles.com REST API Key
VITE_OPENSUBTITLES_API_KEY=your_api_key_here
```

### Authentication

The app supports multiple authentication methods:

1. **URL Parameter**: `?sid=your_session_id` (highest priority)
2. **Browser Cookie**: `PHPSESSID` cookie
3. **Anonymous**: Falls back to anonymous access

## Usage

### Basic Upload Process

1. **Drop Files** - Drag video and subtitle files into the interface
2. **Auto-Pairing** - The app automatically pairs videos with subtitles
3. **Review Metadata** - Check detected languages and movie information
4. **Select Subtitles** - Choose which subtitles to upload
5. **Upload** - Click the upload button to submit to OpenSubtitles.org

### Supported Formats

**Video Files**: `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.flv`, `.wmv`, etc.
**Subtitle Files**: `.srt`, `.vtt`, `.ass`, `.ssa`, `.sub`, `.txt`, etc.

### Ad Blocker Compatibility

The application includes automatic detection for ad blockers and browser security features that may interfere with API requests:

- **Automatic Detection** - Tests connectivity to required APIs on page load
- **Browser-Specific Guidance** - Tailored instructions for Brave Shield, uBlock Origin, Adblock Plus
- **Connectivity Test Page** - Dedicated test page accessible via footer link or error notifications
- **Smart Recommendations** - Only shows warnings when actual blocking is detected

**Supported Browsers**: Works with all modern browsers including Brave (with Shield disabled for this site), Chrome, Firefox, Safari, and Edge.

**Test Connectivity**: Visit the connectivity test page via the "🛡️ Test Connectivity" link in the footer to verify your browser configuration.

## Development

### Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run test suite
npm test
```

### Testing

The project includes a comprehensive test suite with 42 test cases covering:
- File detection and movie title extraction
- Multilingual subtitle directory handling  
- Complex filename processing
- Edge cases and real-world scenarios

Tests are automatically run on every push and pull request via GitHub Actions.

### Project Structure

```
src/
├── components/          # React components
│   ├── FileList/       # File listing components
│   └── ...
├── hooks/              # Custom React hooks
├── services/           # API and business logic
│   ├── api/           # API integrations
│   └── ...
├── utils/              # Utility functions
└── contexts/           # React contexts
```

### Key Technologies

- **React 18** with hooks-based architecture
- **Vite** for development and build tooling
- **Tailwind CSS** for styling
- **OpenSubtitles API** for subtitle operations
- **Local Storage** for caching

## API Integration

### OpenSubtitles APIs

The app integrates with two OpenSubtitles API systems:

**Legacy XML-RPC API** (`api.opensubtitles.org/xml-rpc`):
- `GetUserInfo` - Retrieve user profile and session information
- `GuessMovieFromString` - Movie identification from filename
- `TryUploadSubtitles` - Check if subtitle already exists in database
- `UploadSubtitles` - Upload new subtitles to the database
- `GetSubLanguages` - Fetch supported subtitle languages for upload

**Modern REST API** (`api.opensubtitles.com/api/v1`):
- `GET /utilities/fasttext/language/supported` - Get supported detection languages
- `POST /utilities/fasttext/language/detect/file` - Automatic language detection
- `GET /features` - Movie/episode subtitle statistics and metadata
- `POST /utilities/guessit` - Advanced file metadata extraction

### Caching Strategy

All API responses cached for 72 hours (language data, movie metadata, detection results, features)

## Security

- 🔒 **No Hardcoded Secrets** - All API keys via environment variables
- 🛡️ **Session-Based Auth** - Secure authentication flow
- 🔐 **Environment Isolation** - Development/production separation
- 📝 **Input Validation** - Comprehensive file and data validation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 **Documentation**: [OpenSubtitles API Docs](https://api.opensubtitles.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/opensubtitles/opensubtitles-uploader-pro/issues)

## Acknowledgments

- [OpenSubtitles.org](https://www.opensubtitles.org/) for the comprehensive subtitle database and APIs
- [React](https://reactjs.org/) for the excellent frontend framework
- [Vite](https://vitejs.dev/) for the fast development experience
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first styling approach
- [Claude Code AI](https://claude.ai/code) for development assistance and code architecture