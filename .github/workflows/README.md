# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated building and testing of the OpenSubtitles Uploader PRO desktop applications.

## Workflows

### 1. Build Desktop Apps (`build-desktop-apps.yml`)

**Purpose**: Builds native desktop applications for Windows, macOS, and Linux.

**Triggers**:
- Git tags starting with `v*` (e.g., `v1.1.2`)
- Published releases
- Manual dispatch via GitHub Actions UI

**Platforms Built**:
- **Priority 1**: Windows x64 (`windows-latest`)
- **Priority 2**: macOS Intel + Apple Silicon (`macos-latest`)
- **Priority 3**: Linux x64 (`ubuntu-20.04`)

**Output Artifacts**:
- **Windows**: `.exe` installer, `.msi` package
- **macOS**: `.dmg` installers for both Intel and Apple Silicon
- **Linux**: `.AppImage` and `.deb` packages

**Usage**:
```bash
# Create a release tag to trigger build
git tag v1.1.3
git push origin v1.1.3

# Or manually trigger via GitHub Actions UI
# Go to Actions tab → Build Desktop Apps → Run workflow
```

### 2. CI Build (`ci.yml`)

**Purpose**: Continuous integration testing on every push and pull request.

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Jobs**:
- **Test**: Runs npm tests and builds web app
- **Build Desktop Quick**: Quick Linux desktop build to verify Tauri setup

**Usage**: Automatically runs on every push/PR.

## Setup Requirements

### Repository Secrets

For the build workflow to work properly, you may need to configure these secrets in your repository settings:

1. `TAURI_PRIVATE_KEY` (optional): For app signing
2. `TAURI_KEY_PASSWORD` (optional): Password for signing key

### First-Time Setup

1. **Enable GitHub Actions**: Ensure Actions are enabled in your repository settings
2. **Set Permissions**: The workflow needs `contents: write` permission to create releases
3. **Test Build**: Push a commit to trigger the CI workflow and verify everything works

## Build Process

### Multi-Platform Strategy

The workflow uses a matrix strategy to build for multiple platforms:

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - platform: 'windows-latest'
        args: '--target x86_64-pc-windows-msvc'
      - platform: 'macos-latest'
        args: '--target aarch64-apple-darwin'
      - platform: 'macos-latest'
        args: '--target x86_64-apple-darwin'
      - platform: 'ubuntu-20.04'
        args: ''
```

### Dependencies Installation

- **Windows**: No additional dependencies needed
- **macOS**: No additional dependencies needed
- **Linux**: Installs WebKit2GTK and related libraries

### Build Steps

1. **Checkout**: Downloads repository code
2. **Install Dependencies**: Sets up Rust, Node.js, and system dependencies
3. **Cache**: Uses Rust and npm caches for faster builds
4. **Build**: Uses `tauri-action` to build the app
5. **Upload**: Uploads artifacts and creates releases

## Troubleshooting

### Common Issues

1. **Build Failure on Linux**: Check that all system dependencies are installed
2. **macOS Code Signing**: Add signing certificates to repository secrets
3. **Windows Build Issues**: Ensure Visual Studio Build Tools are available
4. **Cache Issues**: Clear caches if builds become inconsistent

### Debugging

1. **Check Logs**: View detailed logs in GitHub Actions
2. **Local Testing**: Test builds locally before pushing
3. **Incremental Changes**: Make small changes and test each step

## Release Process

### Automated Release

1. Create and push a git tag:
   ```bash
   git tag v1.1.3
   git push origin v1.1.3
   ```

2. The workflow will automatically:
   - Build for all platforms
   - Create a GitHub release
   - Upload all build artifacts

### Manual Release

1. Go to GitHub Actions → Build Desktop Apps
2. Click "Run workflow"
3. Check "Create a release"
4. Click "Run workflow"

### Release Assets

After successful build, users can download:
- Windows: `OpenSubtitles Uploader PRO_1.1.2_x64_en-US.exe`
- macOS (Apple Silicon): `OpenSubtitles Uploader PRO_1.1.2_aarch64.dmg`
- macOS (Intel): `OpenSubtitles Uploader PRO_1.1.2_x64.dmg`
- Linux: `opensubtitles-uploader-pro_1.1.2_amd64.AppImage`

## Maintenance

### Updating Dependencies

- **Node.js**: Update version in `actions/setup-node@v4`
- **Rust**: Update toolchain in `dtolnay/rust-toolchain@stable`
- **Tauri Action**: Update version in `tauri-apps/tauri-action@v0`

### Adding New Platforms

To add support for new platforms:

1. Add new matrix entry in `build-desktop-apps.yml`
2. Configure platform-specific dependencies
3. Update release notes and documentation

### Performance Optimization

- **Caching**: Rust and npm caches are already configured
- **Parallel Builds**: Matrix strategy builds platforms in parallel
- **Incremental**: Only builds when necessary (tags/releases)

## Security

- **Permissions**: Minimal required permissions (`contents: write`)
- **Secrets**: Optional signing keys stored securely
- **Dependencies**: Uses trusted actions from GitHub and Tauri
- **Isolation**: Each platform builds in isolated runners