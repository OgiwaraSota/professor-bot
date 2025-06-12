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

    if (content === '!kanban') {
      await handleQuoteCommand(message);
    } else if (content.startsWith('!detail')) {
      await handleDetailCommand(message);
    }

  } catch (error) {
    console.error("❌ 全体エラー:", error);
  }
});

// 名言生成コマンド
async function handleQuoteCommand(message) {
  const allowedChannelId = process.env.PROFESSOR_CHANNEL_ID;
  if (message.channel.id !== allowedChannelId) {
    await message.reply("ここで呟くのはモラル違反というものじゃ。");
    return;
  }

  const reply = await message.channel.send("先生が呟こうとしています…💭");

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `
            以下のような文章があります
            - 日向ぼっこするマイケル
            - カメラのキタムラで食べるゴーヤ
            - 足がパンパース
            - 火の元やるやる詐欺
            - んー大人の味と言いながら飲むマミー
            - 話にキレのないビートたけし
            - 心が傷むと見舞いへ行きますと言いますとホウキ食べた
            - 歯磨き粉をニンニクチューブに置き換えた罪
            - ラーメン食べたら友達がダウンジャケットになった
            - 耳を見てたら口になりました
            - お見合い結婚式からの唐揚げ
            - 寝てたわと言ってみたい人生でした
            - 何をしたか柑橘系

            これらを参考に、以下の条件で短くてシュールなフレーズを1つだけ作ってください：
 
            1. 普段は結びつかない単語や固有名詞、動詞を無理やり組み合わせる
            2. 文章は短くシンプルにし、意味的なつながりをあえて崩す  
            3. 多種多様な単語をランダムに使う
            4. 日本語、カタカナ、漢字の単語を多種多様に使う
            5. 主語の後の助詞をあえて外す、助動詞を外す、名詞で終わるなどして、崩れた文章にする
            6. 重要【「踊る」と「ダンス」という単語を使わない】
            7. 1個だけ生成してください  
            8. 重要【最後に「。」を絶対につけないでください
        `.trim(),
        },
      ],
    });

    const quote = response.choices[0].message.content.trim();
    await reply.edit(`${quote}`);

  } catch (error) {
    console.error("❌ 名言生成エラー:", error);
    await reply.edit("⚠️ 先生が黙り込んでしまいました…。もう一度試してみてください。");
  }
}


const schedule = require('node-schedule');

// 毎朝9時に実行
schedule.scheduleJob('0 0 * * *', async () => {
  await sendMorningMessage();
});

async function sendMorningMessage() {
  const channelId = process.env.PROFESSOR_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    console.error("❌ チャンネルが見つからないか、テキストチャンネルではありません。");
    return;
  }

  try {
    // OpenAIに昨日の出来事を生成してもらう
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `
            あなたは、僕らの先生であり、優しいおじいちゃんです。
            次のルールに従って、昨日あった出来事を80字程度で作ってください。

            # 制約ルール
            - 文全体は「昨日あった出来事」のみで構成してください。
            - 一人称は「ワシ」にしてください。
            - 口調は「〜じゃ」「〜のう」「〜かもしれんのう」などのおじいちゃん風にしてください。
            - 文末は句点（。）で終えてください。
            - 「おはよう」や「今日は○月○日じゃ」などの挨拶や日付は**絶対に入れないでください**。

            # 出来事の種類（いずれかをランダムに選んで使うこと）
            ## 1. 普通にありそうなこと（＝日常）
            - 誰でも経験しそうな、ごく日常的でささやかな出来事。
            - 特別ではないが、ちょっとした気づきや穏やかな生活感のある話。

            ## 2. 絶妙になさそうなこと（＝意味のわからない着地）
            - 導入は日常的で自然だが、途中から違和感が出てきて、オチが奇妙だったり予想外。
            - 「ちょっと不思議」「なんでそうなるんだ」という違和感がポイント。

            ## 3. 絶対あり得ないこと（＝完全な妄想・ぶっ飛び展開）
            - 完全に非現実的で、意味がわからないが面白い・スケールが大きい話。
            - 言っている本人（おじいちゃん）はいたって真面目。
          `,
        },
      ],
    });

    const story = response.choices[0].message.content.trim();

    // ランダムに名前を選ぶ
    const nameList = ['阿久澤', '大西', '小笠原', '荻原', '加藤', '金指', '神尾', '田島', '玉田', '横川'];
    const randomName = nameList[Math.floor(Math.random() * nameList.length)];

    // 送信するメッセージを作成（prefixが必要ならここで定義）
    const now = new Date();
    const month = now.getMonth() + 1; // 月は0始まりなので+1
    const day = now.getDate();
    const prefix = `みんなおはよう、今日は${month}月${day}日じゃ。`;
    const postfix = `さて、${randomName}よ。昨日はどんなことをしたのかのう？教えてくれると嬉しいのじゃ。`;

    // チャンネルにメッセージ送信
    await channel.send(`${prefix}\n\n${story}\n\n${postfix}`);

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

// Discord Bot ログイン
client.login(process.env.DISCORD_TOKEN);