const Discord = require("discord.js");
const { Client, Intents } = Discord;
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");

const client = new Client({
  intents: [
    Intents.FLAGS.Guilds,
    Intents.FLAGS.GuildVoiceStates,
    Intents.FLAGS.GuildMessages,
  ],
});

const token =
  MTA4OTMwMzg0MjY3MzM5Nzc2MA.GFPmXR.vSmGV - _VNC8mfMThAalCL_fHFkl2lgUIFSU800;

const queue = new Map();

client.on("ready", () => {
  console.log("Bot is online!");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("+")) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith("+play")) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith("+skip")) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith("+stop")) {
    stop(message, serverQueue);
    return;
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  if (args.length !== 2) {
    message.channel.send("You need to provide a YouTube URL!");
    return;
  }

  const voiceChannel = message.member.voice.channel;

  if (!voiceChannel) {
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  }

  const permissions = voiceChannel.permissionsFor(message.client.user);

  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const videoFinder = async (query) => {
    const videoResult = await ytSearch(query);
    return videoResult.videos.length > 1 ? videoResult.videos[0] : null;
  };

  const video = await videoFinder(args[1]);

  if (!video) {
    message.channel.send("Error finding video.");
    return;
  }

  const song = {
    title: video.title,
    url: video.url,
  };

  if (!serverQueue) {
    const queueConstructor = {
      voiceChannel: voiceChannel,
      textChannel: message.channel,
      connection: null,
      songs: [],
    };

    queue.set(message.guild.id, queueConstructor);
    queueConstructor.songs.push(song);

    try {
      const connection = await voiceChannel.join();
      queueConstructor.connection = connection;
      play(message.guild, queueConstructor.songs[0]);
    } catch (err) {
      console.error(err);
      queue.delete(message.guild.id);
      return message.channel.send("There was an error connecting!");
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} added to the queue!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel) {
    return message.channel.send("You need to be in a voice channel to skip!");
  }
  if (!serverQueue) {
    return message.channel.send("There are no songs to skip!");
  }
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel) {
    return message.channel.send(
      "You need to be in a voice channel to stop the music!"
    );
  }
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, { filter: "audioonly" }))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", (error) => console.error(error));
  dispatcher.setVolumeLogarithmic(1);
  serverQueue.textChannel.send(`Now playing: ${song.title}`);
}

client.login(token);
