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
        以下のルールに従って、次の文章をわかりやすく説明してください。

        # マークダウンの使用ルール
        - 高校生向けに説明してください。
        - 最初に全体の主題を **「# タイトル」** 形式で書いてください。
        - 適宜見出しを使うようにしてください。
        - 箇条書きを使う場合は適切に使ってください（使いすぎない）。
        - 複雑な単語や概念は、簡単な日本語で補足してください。

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