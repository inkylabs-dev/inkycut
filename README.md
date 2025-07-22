# InkyCut

> Create videos with just a chat. No timeline, no tools. Just vibe..

✨ Try our [AI Vibe Filming Prototype](https://inkycut.com): Just type what you want, and we’ll build a short video.

🚧 Still early — your feedback shapes the next version. 

You don't need to pay to use the InkyCut, but an OpenAI API key is required before first use. You can click the "Settings" button in the top right corner to add your OpenAI API key.

**Want more features? Starting using it and submit an issue on GitHub!**

## 🎬 Vibe Filming: AI-Powered Video Editing

**Talk to your editor, don't wrestle with timelines.**

Vibe Filming brings the power of conversational AI to video editing. Instead of spending hours learning complex editing software, you can:

- **Describe your vision**: "Make this scene more dramatic with slow motion and dark filters"
- **Request specific edits**: "Add a zoom transition between these two clips"
- **Apply effects naturally**: "Give this footage a vintage film look"
- **Adjust timing**: "Speed up the boring parts and emphasize the action"

The AI understands your creative intent and automatically applies the appropriate:
- ✂️ Cuts and transitions
- 🎨 Color grading and filters
- 🎵 Audio mixing and effects
- 📐 Composition and framing adjustments
- ⚡ Pacing and rhythm changes

### How It Works

1. **Upload your footage** to the [Vibe Filming](https://inkycut.com/vibe).
2. **Describe your edit** in natural language
3. **Review the AI's work** with real-time preview
4. **Refine with conversation** - ask for adjustments
5. **Export your masterpiece** in any format

*Experience the future of video editing at `/vibe` - currently authentication is required to avoid the prototype being abused. You also need to bring in your own OpenAI API Key in settings.*

## Features

### 🚀 Core Features

- [x] **🎬 Vibe Filming**: Revolutionary conversational video editing - talk to AI, get professional edits
- [x] **🎥 Multi-Media Support**: Work with images, videos, and audio files seamlessly
- [x] **⚡ Real-time Preview**: See your changes instantly with live preview functionality
- [ ] **🤖 AI-Powered Story Generation**: Create compelling narratives with advanced AI assistance
- [ ] **📱 Visual Storyboarding**: Transform stories into visual sequences with timeline-based editing
- [ ] **📚 Library Management**: Organize and manage your creative assets efficiently
- [ ] **💾 Export Options**: Render your projects in various formats for different platforms

### 🛠️ Technical Features

- **🔐 User Authentication**: Secure Google OAuth integration for user accounts
- **💳 Payment Integration**: Flexible pricing with Stripe support
- **🎞️ Professional Rendering**: High-quality video output with Remotion
- **☁️ Cloud Storage**: Secure file management and sharing
- **📊 Analytics Dashboard**: Track usage and performance metrics

## Tech Stack

- **Framework**: [Wasp](https://wasp.sh) - Full-stack web app framework
- **Frontend**: React with TypeScript
- **Backend**: Node.js with Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Google OAuth
- **Video Processing**: Remotion for video rendering
- **AI Integration**: OpenAI for video editing
- **Styling**: Tailwind CSS
- **Deployment**: Fly.io ready

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- [Wasp CLI](https://wasp.sh/docs/cli) installed

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:inkylabsio/inkycut.git
   cd inkycut/app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create `.env.client` and `.env.server` files in the root directory
   - Add your API keys and configuration values

4. Start the database:
   ```bash
   wasp start db
   ```

5. Run database migrations:
   ```bash
   npm run db:migrate-dev
   ```

6. Start the development server:
   ```bash
   npm run start
   ```

The application will be available at `http://localhost:3000`.

## Render a video

You need to build app first:

```bash
npm run build
```

Then you can render a video using the following command:

```bash
npm run render -- -i /path/to/exportedProject.json
```

## Development

### Running Tests

```bash
# Run end-to-end tests
cd e2e-tests
npm test
```

### Building for Production

```bash
npm run build
```

### Database Management

```bash
# Run migrations
wasp db migrate-dev

# Seed the database
wasp db seed

# Reset database
wasp db reset
```

## Deployment

The project is configured for deployment on Fly.io with separate client and server configurations:

- `fly-client.toml` - Frontend deployment configuration
- `fly-server.toml` - Backend deployment configuration

```bash
$ npm run deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please visit [inkycut.com](https://inkycut.com) or create an issue in this repository.

---

Built with ❤️ using [Wasp](https://wasp.sh) and the [Open SaaS](https://opensaas.sh) template.
