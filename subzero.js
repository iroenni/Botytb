/*
"Fear those who dont give credits", Mr Frank
Released : Sat 22 Nov 2025

*/

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const YoutubeSearch = require('youtube-search-api');
const config = require('./config');

// Create bot instance
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Store user states and video data
const userStates = new Map();
const videoDataCache = new Map(); // Cache for video download URLs

// Bot statistics
const botStartTime = Date.now();
const userList = new Set();

// Track users
const trackUser = (userId) => {
  userList.add(userId);
};

// Utility Functions
const isYouTubeUrl = (text) => {
  return text.includes('youtube.com') || text.includes('youtu.be');
};

const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (views) => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
};

// Animate loading message
const animateLoading = async (chatId, messageId, text = 'Processing') => {
  let frame = 0;
  const interval = setInterval(async () => {
    try {
      await bot.editMessageText(
        `${config.LOADING_FRAMES[frame]} ${text}...`,
        { chat_id: chatId, message_id: messageId }
      );
      frame = (frame + 1) % config.LOADING_FRAMES.length;
    } catch (error) {
      clearInterval(interval);
    }
  }, 500);
  
  return interval;
};

// Fetch video info from API
const fetchVideoInfo = async (url) => {
  try {
    const response = await axios.get(`${config.API_URL}?url=${encodeURIComponent(url)}`, {
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching video info:', error.message);
    return null;
  }
};

// Search YouTube
const searchYouTube = async (query) => {
  try {
    const results = await YoutubeSearch.GetListByKeyword(query, false, config.SEARCH_RESULTS_LIMIT);
    return results.items || [];
  } catch (error) {
    console.error('Error searching YouTube:', error.message);
    return [];
  }
};

// Create quality keyboard
const createQualityKeyboard = (videoData, cacheId) => {
  const keyboard = [];
  
  // Audio option
  if (videoData.audio) {
    keyboard.push([{
      text: '🎵 Audio (MP3)',
      callback_data: `audio|${cacheId}`
    }]);
  }
  
  // Video quality options
  const videos = videoData.videos || {};
  const qualityOrder = ['144', '240', '360', '480', '720', '1080'];
  const videoButtons = [];
  
  for (const quality of qualityOrder) {
    if (videos[quality]) {
      videoButtons.push({
        text: `📹 ${quality}p`,
        callback_data: `video|${quality}|${cacheId}`
      });
    }
  }
  
  // Arrange in rows of 3
  for (let i = 0; i < videoButtons.length; i += 3) {
    keyboard.push(videoButtons.slice(i, i + 3));
  }
  
  // Cancel button
  keyboard.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);
  
  return { inline_keyboard: keyboard };
};

// Delete messages after timeout
const scheduleDelete = async (chatId, messageIds, timeout = config.AUTO_DELETE_TIMEOUT) => {
  setTimeout(async () => {
    for (const msgId of messageIds) {
      try {
        await bot.deleteMessage(chatId, msgId);
      } catch (error) {
        // Message already deleted or not found
      }
    }
  }, timeout);
};

// Download and send media directly to Telegram
const sendMediaToTelegram = async (chatId, downloadUrl, type, quality, videoData) => {
  const progressMsg = await bot.sendMessage(chatId, `📥 *Downloading...*\n\n${videoData.title}\n\n⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0%`, {
    parse_mode: 'Markdown'
  });
  
  try {
    const response = await axios.get(downloadUrl, {
      responseType: 'stream',
      timeout: 120000,
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const filledBlocks = Math.floor(percentCompleted / 10);
          const emptyBlocks = 10 - filledBlocks;
          const progressBar = '🟦'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);
          
          // Animate with different emojis
          const loadingEmojis = ['📥', '📦', '📤', '🎬'];
          const emoji = loadingEmojis[Math.floor(percentCompleted / 25)];
          
          bot.editMessageText(
            `${emoji} *Downloading...*\n\n${videoData.title}\n\n${progressBar} ${percentCompleted}%`,
            {
              chat_id: chatId,
              message_id: progressMsg.message_id,
              parse_mode: 'Markdown'
            }
          ).catch(() => {}); // Ignore errors from too frequent updates
        }
      }
    });
    
    // Update to uploading status
    await bot.editMessageText(
      `⬆️ *Uploading to Telegram...*\n\n${videoData.title}\n\n🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦 100%`,
      {
        chat_id: chatId,
        message_id: progressMsg.message_id,
        parse_mode: 'Markdown'
      }
    ).catch(() => {});
    
    const caption = `📹 *${videoData.title}*\n\n👨‍💻 *${config.BOT_NAME}*`;
    
    if (type === 'audio') {
      await bot.sendAudio(chatId, response.data, {
        caption,
        parse_mode: 'Markdown',
        title: videoData.title,
        performer: config.BOT_NAME
      });
    } else {
      await bot.sendVideo(chatId, response.data, {
        caption,
        parse_mode: 'Markdown',
        supports_streaming: true
      });
    }
    
    await bot.deleteMessage(chatId, progressMsg.message_id);
    return true;
  } catch (error) {
    console.error('Error uploading to Telegram:', error.message);
    await bot.editMessageText(
      '❌ File too large for Telegram or upload failed. Use download link instead.',
      { chat_id: chatId, message_id: progressMsg.message_id }
    );
    setTimeout(() => bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {}), 5000);
    return false;
  }
};

// Command Handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  trackUser(msg.from.id);
  
  try {
    await bot.sendPhoto(chatId, config.START_IMAGE, {
      caption: config.WELCOME_MESSAGE,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    // Fallback to text if image fails
    await bot.sendMessage(chatId, config.WELCOME_MESSAGE, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  trackUser(msg.from.id);
  await bot.sendMessage(chatId, config.HELP_MESSAGE, { parse_mode: 'Markdown' });
});

bot.onText(/\/developer/, async (msg) => {
  const chatId = msg.chat.id;
  trackUser(msg.from.id);
  
  const devInfo = `╔═══════════════════════╗
║   👨‍💻 𝘿𝙚𝙫𝙚𝙡𝙤𝙥𝙚𝙧 𝙄𝙣𝙛𝙤   ║
╚═══════════════════════╝

*Developer:* ${config.DEVELOPER.name}

📱 *Telegram:* ${config.DEVELOPER.telegram}
💻 *GitHub:* ${config.DEVELOPER.github}
📞 *WhatsApp:* ${config.DEVELOPER.whatsapp}

Feel free to reach out for support or feedback!`;

  await bot.sendMessage(chatId, devInfo, { parse_mode: 'Markdown' });
});

bot.onText(/\/uptime/, async (msg) => {
  const chatId = msg.chat.id;
  trackUser(msg.from.id);
  
  const uptime = Date.now() - botStartTime;
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const uptimeStr = `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  
  const uptimeMsg = `╔═══════════════════════╗
║    ⏱️ 𝘽𝙤𝙩 𝙐𝙥𝙩𝙞𝙢𝙚    ║
╚═══════════════════════╝

🟢 *Status:* Online
⏰ *Uptime:* ${uptimeStr}
🚀 *Started:* ${new Date(botStartTime).toLocaleString()}

The bot is running smoothly!`;

  await bot.sendMessage(chatId, uptimeMsg, { parse_mode: 'Markdown' });
});

bot.onText(/\/users/, async (msg) => {
  const chatId = msg.chat.id;
  trackUser(msg.from.id);
  
  const totalUsers = userList.size;
  const userIds = Array.from(userList).slice(0, 10);
  
  let userListStr = '';
  userIds.forEach((id, index) => {
    userListStr += `${index + 1}. User ID: ${id}\n`;
  });
  
  if (totalUsers > 10) {
    userListStr += `\n...and ${totalUsers - 10} more users`;
  }
  
  const usersMsg = `╔═══════════════════════╗
║   👥 𝙐𝙨𝙚𝙧 𝙎𝙩𝙖𝙩𝙞𝙨𝙩𝙞𝙘𝙨   ║
╚═══════════════════════╝

📊 *Total Users:* ${totalUsers}

*Recent Users:*
${userListStr}

Thank you for using ${config.BOT_NAME}! 🎉`;

  await bot.sendMessage(chatId, usersMsg, { parse_mode: 'Markdown' });
});

bot.onText(/\/system/, async (msg) => {
  const chatId = msg.chat.id;
  trackUser(msg.from.id);
  
  const memUsage = process.memoryUsage();
  const ramUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
  const ramTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
  const ramPercent = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1);
  
  // Measure ping
  const start = Date.now();
  await bot.sendChatAction(chatId, 'typing');
  const ping = Date.now() - start;
  
  const uptime = Date.now() - botStartTime;
  const seconds = Math.floor(uptime / 1000);
  const hours = Math.floor(seconds / 3600);
  
  const systemMsg = `╔═══════════════════════╗
║   💻 𝙎𝙮𝙨𝙩𝙚𝙢 𝙄𝙣𝙛𝙤   ║
╚═══════════════════════╝

🖥️ *RAM Usage:* ${ramUsed} MB / ${ramTotal} MB (${ramPercent}%)
📊 *Memory Percent:* ${ramPercent}%
⚡ *Ping:* ${ping}ms
⏱️ *Uptime:* ${hours}h ${Math.floor((seconds % 3600) / 60)}m
🔢 *Active Caches:* ${videoDataCache.size}
👥 *Total Users:* ${userList.size}
⚙️ *Node Version:* ${process.version}
🌐 *Platform:* ${process.platform}

System running optimally! ✅`;

  await bot.sendMessage(chatId, systemMsg, { parse_mode: 'Markdown' });
});

// Handle text messages (URLs or search queries)
bot.on('message', async (msg) => {
  try {
    if (!msg.text || msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    trackUser(msg.from.id);
  
  // Check if user is in selection mode
  const userState = userStates.get(chatId);
  if (userState && userState.awaitingSelection) {
    const selection = parseInt(text);
    
    if (isNaN(selection) || selection < 1 || selection > userState.results.length) {
      await bot.sendMessage(chatId, '❌ Invalid selection. Please reply with a number between 1 and ' + userState.results.length);
      return;
    }
    
    const selectedVideo = userState.results[selection - 1];
    const videoUrl = `https://www.youtube.com/watch?v=${selectedVideo.id}`;
    
    // Clear user state
    userStates.delete(chatId);
    
    // Process the selected video
    await processVideoUrl(chatId, videoUrl, msg.message_id);
    return;
  }
  
  // Check if it's a YouTube URL
  if (isYouTubeUrl(text)) {
    await processVideoUrl(chatId, text, msg.message_id);
  } else {
    // It's a search query
    await processSearch(chatId, text, msg.message_id);
  }
  } catch (error) {
    console.error('Error processing message:', error);
    await bot.sendMessage(msg.chat.id, '❌ An error occurred while processing your request. Please try again.');
  }
});

// Process YouTube URL
const processVideoUrl = async (chatId, url, originalMsgId) => {
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Fetching video information...');
  const loadingInterval = animateLoading(chatId, loadingMsg.message_id, 'Fetching video info');
  
  const videoData = await fetchVideoInfo(url);
  clearInterval(loadingInterval);
  
  if (!videoData || !videoData.status) {
    await bot.editMessageText(
      `❌ *Error!*

Could not fetch video information. Please check:
• The URL is correct
• The video is publicly available
• The video is not age-restricted`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
    scheduleDelete(chatId, [loadingMsg.message_id, originalMsgId], 10000);
    return;
  }
  
  // Delete loading message
  await bot.deleteMessage(chatId, loadingMsg.message_id);
  
  // Generate a unique cache ID and store video data
  const cacheId = `${chatId}_${Date.now()}`;
  videoDataCache.set(cacheId, videoData);
  
  // Auto-clean cache after 5 minutes
  setTimeout(() => {
    videoDataCache.delete(cacheId);
  }, 300000);
  
  // Send video info with quality options
  const caption = `📹 *${videoData.title}*

✅ Video found! Choose your preferred quality:

👨‍💻 *${config.BOT_NAME}*`;
  
  let selectionMsg;
  if (videoData.thumbnail) {
    try {
      selectionMsg = await bot.sendPhoto(chatId, videoData.thumbnail, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: createQualityKeyboard(videoData, cacheId)
      });
    } catch (error) {
      selectionMsg = await bot.sendMessage(chatId, caption, {
        parse_mode: 'Markdown',
        reply_markup: createQualityKeyboard(videoData, cacheId)
      });
    }
  } else {
    selectionMsg = await bot.sendMessage(chatId, caption, {
      parse_mode: 'Markdown',
      reply_markup: createQualityKeyboard(videoData, cacheId)
    });
  }
  
  // Store message IDs for cleanup
  userStates.set(chatId, {
    messagesToDelete: [originalMsgId, selectionMsg.message_id]
  });
};

// Process search query
const processSearch = async (chatId, query, originalMsgId) => {
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Searching YouTube...');
  const loadingInterval = animateLoading(chatId, loadingMsg.message_id, 'Searching');
  
  const results = await searchYouTube(query);
  clearInterval(loadingInterval);
  
  if (!results || results.length === 0) {
    await bot.editMessageText(
      '❌ No results found. Try a different search query.',
      { chat_id: chatId, message_id: loadingMsg.message_id }
    );
    scheduleDelete(chatId, [loadingMsg.message_id, originalMsgId], 10000);
    return;
  }
  
  // Delete loading message
  await bot.deleteMessage(chatId, loadingMsg.message_id);
  
  // Format search results with improved design
  let resultText = `🔍 *Search Results*\n`;
  resultText += `━━━━━━━━━━━━━━━━━━━\n`;
  resultText += `Query: _"${query}"_\n`;
  resultText += `Found: ${results.length} video${results.length > 1 ? 's' : ''}\n\n`;
  
  results.forEach((video, index) => {
    const duration = video.length?.simpleText || '⏱️ Live';
    const views = video.viewCount?.text || '';
    const channel = video.channelTitle || 'Unknown';
    
    resultText += `*${index + 1}.*  ${video.title}\n`;
    resultText += `    👤 ${channel}\n`;
    if (duration !== '⏱️ Live') {
      resultText += `    ⏱️ ${duration}`;
      if (views) resultText += ` • 👁️ ${views}`;
      resultText += `\n`;
    } else {
      resultText += `    🔴 Live Stream\n`;
    }
    resultText += `\n`;
  });
  
  resultText += `━━━━━━━━━━━━━━━━━━━\n`;
  resultText += `💬 Reply with number (1-${results.length})\n\n`;
  resultText += `👨‍💻 *${config.BOT_NAME}*`;
  
  // Try to send with thumbnail of top result
  let searchMsg;
  const topResult = results[0];
  const thumbnail = topResult.thumbnail?.thumbnails?.[0]?.url;
  
  if (thumbnail) {
    try {
      searchMsg = await bot.sendPhoto(chatId, thumbnail, {
        caption: resultText,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      // Fallback to text if thumbnail fails
      searchMsg = await bot.sendMessage(chatId, resultText, {
        parse_mode: 'Markdown'
      });
    }
  } else {
    searchMsg = await bot.sendMessage(chatId, resultText, {
      parse_mode: 'Markdown'
    });
  }
  
  // Store search results and await user selection
  userStates.set(chatId, {
    awaitingSelection: true,
    results: results,
    messagesToDelete: [originalMsgId, searchMsg.message_id]
  });
  
  // Auto-delete after 60 seconds if no selection
  scheduleDelete(chatId, [originalMsgId, searchMsg.message_id]);
};

// Handle callback queries
bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    await bot.answerCallbackQuery(query.id);
  
  if (data === 'cancel') {
    await bot.editMessageText('❌ Download cancelled.', {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    
    const userState = userStates.get(chatId);
    if (userState && userState.messagesToDelete) {
      scheduleDelete(chatId, [...userState.messagesToDelete, query.message.message_id], 3000);
    } else {
      scheduleDelete(chatId, [query.message.message_id], 3000);
    }
    userStates.delete(chatId);
    return;
  }
  
  if (data === 'done') {
    await bot.answerCallbackQuery(query.id, {
      text: '✅ Thank you for using HECTIC DOWNLOADER BOT!',
      show_alert: false
    });
    
    const userState = userStates.get(chatId);
    if (userState && userState.messagesToDelete) {
      await Promise.all([
        bot.deleteMessage(chatId, query.message.message_id),
        ...userState.messagesToDelete.map(id => bot.deleteMessage(chatId, id).catch(() => {}))
      ]);
    } else {
      await bot.deleteMessage(chatId, query.message.message_id);
    }
    userStates.delete(chatId);
    return;
  }
  
  // Parse download data
  const parts = data.split('|');
  const downloadType = parts[0];
  const cacheId = parts[parts.length - 1];
  
  // Retrieve video data from cache
  const videoData = videoDataCache.get(cacheId);
  if (!videoData) {
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Session expired. Please send the link again.',
      show_alert: true
    });
    return;
  }
  
  let downloadUrl, qualityText, type;
  if (downloadType === 'audio') {
    downloadUrl = videoData.audio;
    qualityText = 'Audio (MP3)';
    type = 'audio';
  } else {
    const quality = parts[1];
    downloadUrl = videoData.videos[quality];
    qualityText = `Video (${quality}p)`;
    type = 'video';
  }
  
  // Delete the selection message
  try {
    await bot.deleteMessage(chatId, query.message.message_id);
  } catch (error) {
    console.error('Error deleting message:', error.message);
  }
  
  // Send media directly to Telegram
  const success = await sendMediaToTelegram(chatId, downloadUrl, type, qualityText, videoData);
  
  // Clean up original messages
  const userState = userStates.get(chatId);
  if (userState && userState.messagesToDelete) {
    scheduleDelete(chatId, userState.messagesToDelete, 5000);
  }
  userStates.delete(chatId);
  } catch (error) {
    console.error('Error in callback query handler:', error);
    await bot.answerCallbackQuery(query.id, {
      text: '❌ An error occurred. Please try again.',
      show_alert: true
    });
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

console.log('🚀 𝙃𝙚𝙘𝙩𝙞𝙘 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙚𝙧 is running...');
console.log('👨‍💻 Created by:', config.CREATOR);
console.log('📊 Bot started at:', new Date().toLocaleString());
