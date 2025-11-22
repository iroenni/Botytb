require('dotenv').config();

module.exports = {
  // Bot Configuration
  BOT_TOKEN: process.env.BOT_TOKEN || '7983103020:AAHhHCYi1zEqXXFJbz2voVqEqHptNprWzs0',
  
  // API Configuration
  API_URL: 'https://yt-dl.officialhectormanuel.workers.dev/',
  
  // Bot Info
  CREATOR: 'Darrell Mucheri (Mr Frank)',
  BOT_NAME: '𝙃𝙚𝙘𝙩𝙞𝙘 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙚𝙧 𝘽𝙮 𝙈𝙧 𝙁𝙧𝙖𝙣𝙠',
  
  // Developer Info, I intentionally made these variable to see who dares to change. At least give credits to Me ( Mr Frank )
  DEVELOPER: {
    name: 'Mr Frank',
    telegram: 't.me/mrfrankofc',
    github: 'github.com/mrfr8nk',
    whatsapp: '+263719647303'
  },
  
  // Start Menu Image
  START_IMAGE: 'https://dabby.vercel.app/hect.jpg',
  
  // Features
  AUTO_DELETE_TIMEOUT: 60000, // 60 seconds
  SEARCH_RESULTS_LIMIT: 12,
  
  // Loading Animation
  LOADING_FRAMES: ['⏳', '⌛', '⏳', '⌛'],
  
  // Messages
  WELCOME_MESSAGE: `╭════════════════⟢
│  🎬 𝙃𝙚𝙘𝙩𝙞𝙘 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙚𝙧 🎬  
╰════════════════⟢

🌟 *Welcome to the Ultimate YouTube Downloader!*

📥 *How to use:*
━━━━━━━━━━━━━━━━━━━━
1️⃣ Send me a YouTube link OR search query
2️⃣ If searching, reply with the number (1-10)
3️⃣ Choose your preferred quality
4️⃣ Media sent directly to Telegram!

✨ *Features:*
━━━━━━━━━━━━━━━━━━━━
🔍 YouTube search with top 10 results
🎥 Multiple video qualities (144p - 1080p)
🎵 Audio-only downloads (MP3)
⚡ Fast and reliable
🧹 Auto-cleanup messages

📱 *Commands:*
━━━━━━━━━━━━━━━━━━━━
/help - Show help menu
/developer - Developer contact info
/uptime - Bot uptime status
/users - User statistics
/system - System information

\`\`\`𝘾𝙧𝙚𝙖𝙩𝙚𝙙 𝘽𝙮 𝙈𝙧 𝙁𝙧𝙖𝙣𝙠\`\`\`

Send me a YouTube link or search query to get started! 🚀`,

  HELP_MESSAGE: `╔═══════════════
║    📖 𝙃𝙚𝙡𝙥 𝙈𝙚𝙣𝙪    
╚════════════════════

*Available Commands:*
━━━━━━━━━━━━━━━━━━━━
/start - Start the bot
/help - Show this help message
/developer - Developer contact info
/uptime - Check bot uptime
/users - View user statistics
/system - System information

*How to download:*
━━━━━━━━━━━━━━━━━━━━
1️⃣ Send a YouTube URL or search query
2️⃣ If searching, choose from top 10 results
3️⃣ Select your preferred quality
4️⃣ Media sent directly to Telegram!

*Supported formats:*
━━━━━━━━━━━━━━━━━━━━
🎵 Audio: MP3
📹 Video: 144p, 240p, 360p, 480p, 720p, 1080p

⚠️ *Note:* Messages auto-delete after 60 seconds!

👨‍💻 *Created by:* 𝙈𝙧 𝙁𝙧𝙖𝙣𝙠`
};
