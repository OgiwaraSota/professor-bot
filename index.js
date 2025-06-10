const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('Bot is running');
});
app.listen(port, () => {
  console.log(`Web server running on port ${port}`);
});

const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require('openai');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// メッセージ受信時の処理
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    const content = message.content.trim();

    if (content === '!quote' || content === '!名言') {
      await handleQuoteCommand(message);
    } else if (content.startsWith('!detail')) {
      await handleDetailCommand(message);
    }

  } catch (error) {
    console.error("❌ 全体エラー:", error);
    await message.channel.send("⚠️ エラーが発生しました。");
  }
});

// 名言生成コマンド
async function handleQuoteCommand(message) {
  const reply = await message.channel.send("Professorが名言をひねり出しています…💭");

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `
            あなたは「Professor」というキャラクターです。やたら説教くさくて、知ったかぶりをするおじさんです。

            以下のルールに従って、名言っぽい言葉を1文だけ作ってください。

            # ルール
            - 内容に深みがありそうで、実は中身がないようなセリフにしてください。
            - 上から目線だけどどこか抜けている印象を出してください。
            - 口調は「〜じゃ」「〜かのう」「ワシはこう思う」など、老人風の言葉遣いにしてください。
            - 真面目すぎず、ちょっとだけ笑える程度にユーモアを入れてください。
            - 文末に必ず「。」をつけてください。
                      `,
        },
      ],
    });

    const quote = response.choices[0].message.content.trim();
    await reply.edit(`${quote}`);

  } catch (error) {
    console.error("❌ 名言生成エラー:", error);
    await reply.edit("⚠️ Professorが黙り込んでしまいました…。もう一度試してみてください。");
  }
}

const schedule = require('node-schedule');

// 毎朝8時に実行
schedule.scheduleJob('0 8 * * *', async () => {
  await sendMorningMessage();
});

// 朝の挨拶を生成する
async function sendMorningMessage() {
  const channelId = process.env.PROFESSOR_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    console.error("❌ チャンネルが見つからないか、テキストチャンネルではありません。");
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `
            あなたは「Professor」というキャラクターです。やたら説教くさくて、知ったかぶりをするおじいちゃんです。

            次のルールに従って、朝の一言を1〜2文で作ってください。

            # ルール
            - 「おはよう」で始めること。
            - 今日あった（ような気がする）出来事を語ること。
            - 出来事の種類は以下からランダムに：
              - 実際にありそうな、ささやかな日常の出来事
              - ちょっと不思議なこと（でもギリギリあり得そう）
              - 完全にあり得ないとんでもない妄想
            - 口調は「〜じゃ」「〜のう」「〜かもしれんのう」などおじいちゃん風に。
            - 文末に句点（。）を忘れないように。

                    `,
        },
      ],
    });

    const morningMessage = response.choices[0].message.content.trim();
    await channel.send(` ${morningMessage}`);
    console.log("✅ 朝の一言を送信しました。");
  } catch (error) {
    console.error("❌ 朝の一言生成エラー:", error);
  }
}

// 説明生成コマンド
async function handleDetailCommand(message) {
  const messages = await message.channel.messages.fetch({ limit: 2 });
  const targetMessage = messages.last(); // コマンド直前のメッセージ

  if (!targetMessage) {
    await message.channel.send("❗ 対象となるメッセージが見つかりませんでした。");
    return;
  }

  const reply = await message.channel.send("説明の準備をしています...");

  try {
    const explanation = await generateExplanation(targetMessage.content);
    await reply.delete();
    await message.channel.send(explanation);
  } catch (error) {
    console.error("❌ 説明生成エラー:", error);
    await reply.edit("⚠️ 説明の生成中にエラーが発生しました。");
  }
}

// 説明を生成
async function generateExplanation(content) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `
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

// 質問できる
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    // すでにある !detail や !quote 処理の後に追加する形で

    // professorの珍質問コーナー：!professor Q質問文
    if (message.content.startsWith('!question ')) {
      const question = message.content.slice('!professor '.length).trim();
      if (!question) {
        await message.channel.send("❗ 質問をちゃんと書いてのう。");
        return;
      }

      const reply = await message.channel.send("教授が答えを考えておる…🧐");

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `
                あなたは「Professor」というキャラクターです。やたら説教くさくて、知ったかぶりをするおじさんです。

                以下のルールで質問に答えてください。

                # ルール
                - おじいちゃん口調（〜じゃ、〜のう、ワシはこう思う、など）で答えること。
                - 答えは面白くて、ちょっとズレてる・意味がわからないけど憎めない感じで。
                - 真面目すぎず、ユーモアを入れて答えること。

                質問：
                ${question}
                `,
            },
          ],
        });

        const answer = response.choices[0].message.content.trim();
        await reply.edit(`${answer}`);

      } catch (error) {
        console.error("❌ 珍質問回答エラー:", error);
        await reply.edit("⚠️ 教授が答えに詰まってしまったのう…。また質問しての。");
      }
    }

    // 既存の !detail や !quote などの処理はここに続く

  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    await message.channel.send("⚠️ 何か問題が起きてしまったのう。");
  }
});


// Discord Bot ログイン
client.login(process.env.DISCORD_TOKEN);