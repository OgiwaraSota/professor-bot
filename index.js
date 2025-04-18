const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(port, () => {
  console.log(`Web server running on port ${port}`);
});



// 必要なモジュールをインポート
const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require('openai');
require('dotenv').config();  // .envから環境変数を読み込む

// Discordクライアントを初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// OpenAIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Botが起動したときの処理
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// メッセージ受信時の処理
client.on('messageCreate', async (message) => {
  try {
    // Bot自身のメッセージは無視、!detailで始まるかをチェック
    if (message.author.bot || !message.content.startsWith('!detail')) return;

    // 直前の2件のメッセージを取得（自身のコマンドを含むため）
    const messages = await message.channel.messages.fetch({ limit: 2 });
    const targetMessage = messages.last();  // コマンドの直前のメッセージ

    if (!targetMessage) {
      await message.channel.send("❗ 対象となるメッセージが見つかりませんでした。");
      return;
    }

    // 一時メッセージを送信
    const reply = await message.channel.send("説明の準備をしています...");

    // OpenAIを使って説明を生成
    const explanation = await generateExplanation(targetMessage.content);

    // 一時メッセージを削除し、説明を送信
    await reply.delete();
    await message.channel.send(explanation);
    
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    await message.channel.send("⚠️ 説明の生成中にエラーが発生しました。");
  }
});

// OpenAIを使って説明を生成する関数
async function generateExplanation(content) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: 
        `
        次の文章はある分野で学んだことを専門用語を用いて説明したものです。
        以下のルールに従って、次の文章をわかりやすく説明し直してください。

        内容に関するルール
        - 単なる用語解説ではなく、その分野特有の「ものの見方」「考え方」を伝えることを重視してください。
        - 専門が異なる大学生向けに説明してください。
        - 高校生の知識から積み上げる形で概念がどのように繋がっているかを示してください。
        - 必要であれば関連する情報も提示してください。

        体裁に関するルール
        - 最初に全体の主題を **「# タイトル」** 形式で書いてください。
        - 適宜マークダウンの見出しを使うようにしてください。
        - 適宜箇条書きを使って見やすくしてください。ただし、使いすぎないでください。

        # 説明対象の文章
        ${content}
        `,
      },
    ],
  });

  return response.choices[0].message.content;
}

// Botをログインさせる
client.login(process.env.DISCORD_TOKEN);
